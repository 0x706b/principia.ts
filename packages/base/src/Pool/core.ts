import type { Clock } from '../Clock'
import type { Has } from '../Has'

import { ClockTag } from '../Clock'
import * as Fi from '../Fiber'
import { flow, identity, pipe } from '../function'
import * as HS from '../HashSet'
import * as IO from '../IO'
import * as Ex from '../IO/Exit'
import * as Ma from '../Managed'
import * as Q from '../Queue'
import * as Ref from '../Ref'
import * as At from './Attempted'

/**
 * A Pool<E, A> is a pool of items of type `A`, each of which may be
 * associated with the acquisition and release of resources.
 */
export interface Pool<E, A> {
  /**
   * Retrieves an item from the pool in a `Managed` effect. Note that if
   * acquisition fails, then the returned effect will fail for that same
   * reason. Retrying a failed acquisition attempt will repeat the acquisition
   * attempt.
   */
  readonly get: Ma.Managed<unknown, E, A>
  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  readonly invalidate: (item: A) => IO.UIO<void>
}

interface State {
  readonly size: number
  readonly free: number
}

export class DefaultPool<R, E, A, S> implements Pool<E, A> {
  constructor(
    readonly creator: Ma.Managed<unknown, E, A>,
    readonly min: number,
    readonly max: number,
    readonly isShuttingDown: Ref.URef<boolean>,
    readonly state: Ref.URef<State>,
    readonly items: Q.UQueue<At.Attempted<E, A>>,
    readonly invalidated: Ref.URef<HS.HashSet<A>>,
    readonly track: (exit: Ex.Exit<E, A>) => IO.UIO<void>
  ) {}
  excess: IO.UIO<number> = pipe(
    Ref.get(this.state),
    IO.map(({ free, size }) => Math.min(size - this.min, free))
  )

  initialize(): IO.UIO<void> {
    const self = this
    return pipe(
      IO.whenIO(IO.not(this.isShuttingDown.get))(
        IO.uninterruptibleMask(({ restore }) =>
          Ref.modify_(this.state, ({ size, free }) => {
            if (size < this.min) {
              return [
                pipe(
                  IO.gen(function* (_) {
                    const reservation = yield* _(Ma.reserve(self.creator))
                    const exit        = yield* _(IO.result(restore(reservation.acquire)))
                    const attempted   = yield* _(IO.succeed(new At.Attempted(exit, reservation.release(Ex.unit()))))
                    yield* _(Q.offer_(self.items, attempted))
                    yield* _(self.track(attempted.result))
                    yield* _(IO.whenIO(Ref.get(self.isShuttingDown))(self.getAndShutdown))
                    return attempted
                  })
                ),
                {
                  size: size + 1,
                  free: free + 1
                }
              ]
            } else {
              return [IO.unit(), { size, free }]
            }
          })
        )
      ),
      IO.replicate(this.min),
      IO.sequenceIterableUnit
    )
  }

  shrink: IO.UIO<void> = IO.uninterruptible(
    IO.flatten(
      Ref.modify_(this.state, ({ size, free }) => {
        if (size > this.min && free > 0) {
          return [
            pipe(
              Q.take(this.items),
              IO.chain((attempted) =>
                At.foreach_(attempted, (a) =>
                  pipe(
                    this.invalidated,
                    Ref.update(HS.remove(a)),
                    IO.apSecond(attempted.finalizer),
                    IO.apSecond(
                      pipe(
                        this.state,
                        Ref.update((state) => ({ free: state.free, size: state.size - 1 }))
                      )
                    )
                  )
                )
              )
            ),
            { size, free: free - 1 }
          ]
        } else {
          return [IO.unit(), { size, free }]
        }
      })
    )
  )

  allocate(): IO.UIO<void> {
    const self = this
    return IO.uninterruptibleMask(({ restore }) =>
      IO.gen(function* (_) {
        const reservation = yield* _(Ma.reserve(self.creator))
        const exit        = yield* _(IO.result(restore(reservation.acquire)))
        const attempted   = yield* _(IO.succeed(new At.Attempted(exit, reservation.release(Ex.unit()))))
        yield* _(Q.offer_(self.items, attempted))
        yield* _(self.track(attempted.result))
        yield* _(IO.whenIO(Ref.get(self.isShuttingDown))(self.getAndShutdown))
      })
    )
  }

  get get() {
    const acquire: IO.UIO<At.Attempted<E, A>> = pipe(
      Ref.get(this.isShuttingDown),
      IO.chain((down) => {
        if (down) {
          return IO.interrupt
        } else {
          return IO.flatten(
            Ref.modify_(this.state, ({ size, free }) => {
              if (free > 0 || size >= this.max) {
                return [
                  pipe(
                    Q.take(this.items),
                    IO.chain((acquired) =>
                      Ex.match_(
                        acquired.result,
                        () => IO.succeed(acquired),
                        (item) =>
                          pipe(
                            Ref.get(this.invalidated),
                            IO.chain((set) => {
                              if (HS.has_(set, item)) {
                                return pipe(
                                  this.state,
                                  Ref.update((state) => ({ size: state.size, free: state.free + 1 })),
                                  IO.apSecond(this.allocate()),
                                  IO.apSecond(acquire)
                                )
                              } else {
                                return IO.succeed(acquired)
                              }
                            })
                          )
                      )
                    )
                  ),
                  { size, free: free - 1 }
                ]
              } else {
                return [pipe(this.allocate(), IO.apSecond(acquire)), { size: size + 1, free: free + 1 }]
              }
            })
          )
        }
      })
    )

    const release = (attempted: At.Attempted<E, A>): IO.UIO<void> => {
      if (At.isFailure(attempted)) {
        return IO.flatten(
          Ref.modify_(this.state, ({ size, free }) => {
            if (size <= this.min) {
              return [this.allocate(), { size, free: free + 1 }]
            } else {
              return [IO.unit(), { size: size - 1, free }]
            }
          })
        )
      } else {
        return pipe(
          this.state,
          Ref.update((state) => ({ size: state.size, free: state.free + 1 })),
          IO.apSecond(Q.offer_(this.items, attempted)),
          IO.apSecond(this.track(attempted.result)),
          IO.apSecond(IO.whenIO(Ref.get(this.isShuttingDown))(this.getAndShutdown))
        )
      }
    }
    return pipe(acquire, Ma.bracket(release), Ma.chain(At.toManaged))
  }

  private getAndShutdown: IO.UIO<void> = IO.flatten(
    Ref.modify_(this.state, ({ size, free }) => {
      if (free > 0) {
        return [
          pipe(
            Q.take(this.items),
            IO.matchCauseIO(
              () => IO.unit(),
              (attempted) =>
                At.foreach_(attempted, (a) =>
                  pipe(
                    this.invalidated,
                    Ref.update(HS.remove(a)),
                    IO.apSecond(attempted.finalizer),
                    IO.apSecond(
                      pipe(
                        this.state,
                        Ref.update((state) => ({ free: state.free, size: state.size - 1 }))
                      )
                    ),
                    IO.apSecond(this.getAndShutdown)
                  )
                )
            )
          ),
          { size, free: free - 1 }
        ]
      } else if (size > 0) {
        return [IO.unit(), { size, free }]
      } else {
        return [Q.shutdown(this.items), { size, free }]
      }
    })
  )

  invalidate(a: A) {
    return Ref.update_(this.invalidated, HS.add(a))
  }

  shutdown = IO.flatten(
    pipe(
      this.isShuttingDown,
      Ref.modify((down) => {
        if (down) {
          return [IO.unit(), true]
        } else {
          return [pipe(this.getAndShutdown, IO.apSecond(Q.awaitShutdown(this.items))), true]
        }
      })
    )
  )
}

export function makeWith<R, E, A, S, R1>(
  get: Ma.Managed<R, E, A>,
  min: number,
  max: number,
  strategy: Strategy<S, R1, E, A>
): Ma.Managed<R & R1, never, Pool<E, A>> {
  return Ma.gen(function* (_) {
    const env     = yield* _(Ma.ask<R>())
    const down    = yield* _(Ref.make(false))
    const state   = yield* _(Ref.make<State>({ free: 0, size: 0 }))
    const items   = yield* _(Q.makeBounded<At.Attempted<E, A>>(max))
    const inv     = yield* _(Ref.make(HS.makeDefault<A>()))
    const initial = yield* _(strategy.initial)
    const pool    = new DefaultPool(Ma.giveSome_(get, env), min, max, down, state, items, inv, strategy.track(initial))
    const fiber   = yield* _(IO.forkDaemon(pool.initialize()))
    const shrink  = yield* _(IO.forkDaemon(strategy.run(initial, pool.excess, pool.shrink)))
    yield* _(Ma.finalizer(pipe(Fi.interrupt(fiber), IO.apSecond(Fi.interrupt(shrink)), IO.apSecond(pool.shutdown))))
    return pool
  })
}

export function makeTimeToLive<R, E, A>(
  get: Ma.Managed<R, E, A>,
  min: number,
  max: number,
  timeToLive: number
): Ma.Managed<R & Has<Clock>, never, Pool<E, A>> {
  return makeWith(get, min, max, new TimeToLive(timeToLive))
}

export function make<R, E, A>(get: Ma.Managed<R, E, A>, size: number): Ma.URManaged<R, Pool<E, A>> {
  return makeWith(get, size, size, new None())
}

abstract class Strategy<S, R, E, A> {
  readonly _S!: S
  readonly _R!: (_: R) => void
  readonly _E!: (_: E) => void
  readonly _A!: (_: A) => void
  abstract readonly initial: IO.URIO<R, S>
  abstract track(state: S): (item: Ex.Exit<E, A>) => IO.UIO<void>
  abstract run(state: S, getExcess: IO.UIO<number>, shrink: IO.UIO<void>): IO.UIO<void>
}

class None extends Strategy<void, unknown, unknown, unknown> {
  initial = IO.unit()
  track(state: void): (attempted: Ex.Exit<unknown, unknown>) => IO.UIO<void> {
    return () => IO.unit()
  }
  run(state: void, getExcess: IO.UIO<number>, shrink: IO.UIO<void>) {
    return IO.unit()
  }
}

class TimeToLive extends Strategy<[Clock, Ref.URef<number>], Has<Clock>, unknown, unknown> {
  constructor(readonly timeToLive: number) {
    super()
  }

  initial: IO.URIO<Has<Clock>, [Clock, Ref.URef<number>]> = IO.gen(function* (_) {
    const clock = yield* _(ClockTag)
    const now   = yield* _(clock.currentTime)
    const ref   = yield* _(Ref.make(now))
    return [clock, ref]
  })
  track(state: [Clock, Ref.URef<number>]): (item: Ex.Exit<unknown, unknown>) => IO.UIO<void> {
    return (item) => {
      const [clock, ref] = state
      return IO.gen(function* (_) {
        const now = yield* _(clock.currentTime)
        yield* _(Ref.set_(ref, now))
      })
    }
  }
  run(state: [Clock, Ref.URef<number>], getExcess: IO.UIO<number>, shrink: IO.UIO<void>): IO.UIO<void> {
    const [clock, ref] = state
    return pipe(
      getExcess,
      IO.chain((excess) => {
        if (excess <= 0) {
          return pipe(clock.sleep(this.timeToLive), IO.apSecond(this.run(state, getExcess, shrink)))
        } else {
          return pipe(
            Ref.get(ref),
            IO.crossWith(clock.currentTime, (start, end) => {
              const duration = end - start
              if (duration >= this.timeToLive) {
                return pipe(shrink, IO.apSecond(this.run(state, getExcess, shrink)))
              } else {
                return pipe(clock.sleep(this.timeToLive), IO.apSecond(this.run(state, getExcess, shrink)))
              }
            })
          )
        }
      })
    )
  }
}
