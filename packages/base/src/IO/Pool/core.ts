import { flow, identity, pipe } from '../../function'
import * as HS from '../../HashSet'
import * as Ex from '../Exit'
import * as Fi from '../Fiber'
import * as IO from '../IO'
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

export class DefaultPool<E, A> implements Pool<E, A> {
  constructor(
    readonly creator: Ma.Managed<unknown, E, A>,
    readonly min: number,
    readonly max: number,
    readonly isShuttingDown: Ref.URef<boolean>,
    readonly size: Ref.URef<number>,
    readonly free: Q.UQueue<At.Attempted<E, A>>,
    readonly allocating: Ref.URef<number>,
    readonly invalidated: Ref.URef<HS.HashSet<A>>
  ) {}
  private allocate(): IO.UIO<void> {
    const self = this
    return IO.whenIO(IO.not(this.isShuttingDown.get))(
      IO.uninterruptibleMask(({ restore }) =>
        pipe(
          IO.gen(function* (_) {
            yield* _(Ref.update_(self.allocating, (n) => n + 1))
            const reservation = yield* _(Ma.reserve(self.creator))
            const exit        = yield* _(IO.result(restore(reservation.acquire)))
            const attempted   = yield* _(IO.succeed(new At.Attempted(exit, reservation.release(Ex.unit()))))
            yield* _(
              IO.crossSecond_(
                Q.offer_(self.free, attempted),
                Ref.update_(self.size, (n) => n + 1)
              )
            )
            return attempted
          }),
          IO.ensuring(Ref.update_(this.allocating, (n) => n - 1))
        )
      )
    )
  }

  get get() {
    const acquire: IO.UIO<At.Attempted<E, A>> = pipe(
      this.free,
      Q.take,
      IO.chain((acquired) =>
        Ex.match_(
          acquired.result,
          () => IO.succeed(acquired),
          (item) =>
            pipe(
              this.invalidated,
              Ref.get,
              IO.chain((set) => {
                if (HS.has_(set, item)) {
                  return pipe(
                    this.size,
                    Ref.update((n) => n - 1),
                    IO.crossSecond(this.allocate()),
                    IO.crossSecond(acquire)
                  )
                } else {
                  return IO.succeed(acquired)
                }
              })
            )
        )
      )
    )
    return pipe(
      acquire,
      Ma.bracket((attempted) => {
        if (At.isFailure(attempted)) {
          return pipe(
            this.size,
            Ref.update((n) => n - 1),
            IO.crossSecond(this.allocate())
          )
        } else {
          return Q.offer_(this.free, attempted)
        }
      }),
      Ma.chain(At.toManaged)
    )
  }

  private getAndShutdown = pipe(
    this.size,
    Ref.get,
    IO.map((n) => n > 0),
    IO.tap((more) =>
      IO.when(() => more)(
        pipe(
          this.free,
          Q.take,
          IO.chain((attempted) =>
            At.foreach_(attempted, (a) =>
              pipe(
                this.invalidated,
                Ref.update(HS.remove(a)),
                IO.crossSecond(Ref.update_(this.size, (n) => n - 1)),
                IO.crossSecond(attempted.finalizer)
              )
            )
          )
        )
      )
    )
  )

  initialize = pipe(this.allocate(), IO.replicate(this.min), IO.collectAllUnit)

  invalidate(a: A) {
    return Ref.update_(this.invalidated, HS.add(a))
  }

  shutdown = pipe(
    this.isShuttingDown,
    Ref.set(true),
    IO.crossSecond(IO.repeatWhile_(this.getAndShutdown, identity)),
    IO.crossSecond(Q.shutdown(this.free)),
    IO.crossSecond(Q.awaitShutdown(this.free))
  )
}

export function make<E, A>(get: Ma.Managed<unknown, E, A>, min: number, max: number): Ma.UManaged<Pool<E, A>> {
  return Ma.gen(function* (_) {
    const down  = yield* _(Ref.make(false))
    const size  = yield* _(Ref.make(0))
    const free  = yield* _(Q.makeBounded<At.Attempted<E, A>>(min))
    const alloc = yield* _(Ref.make(0))
    const inv   = yield* _(Ref.make(HS.makeDefault<A>()))
    const pool  = new DefaultPool(get, min, max, down, size, free, alloc, inv)
    const fiber = yield* _(IO.forkDaemon(pool.initialize))
    yield* _(Ma.finalizer(pipe(Fi.interrupt(fiber), IO.crossSecond(pool.shutdown))))
    return pool
  })
}
