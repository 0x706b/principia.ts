// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Fiber, RuntimeFiber } from '../../Fiber/core'
import type { Exit } from '../Exit/core'

import { accessCallTrace, traceAs, traceFrom } from '@principia/compile/util'

import * as Ch from '../../Chunk/core'
import { interrupt as interruptFiber } from '../../Fiber/combinators/interrupt'
import * as FiberId from '../../Fiber/FiberId'
import { flow, identity, pipe } from '../../function'
import * as F from '../../Future'
import * as It from '../../Iterable'
import { Managed } from '../../Managed/core'
import * as RM from '../../Managed/ReleaseMap'
import * as M from '../../Maybe'
import * as Q from '../../Queue'
import * as Ref from '../../Ref/core'
import { tuple } from '../../tuple/core'
import { AtomicNumber } from '../../util/support/AtomicNumber'
import * as C from '../Cause'
import * as I from '../core'
import * as Ex from '../Exit'
import { bracketExit_ } from './bracketExit'
import { concurrencyWith } from './concurrency'
import { forkDaemon, transplant } from './core-scope'
import { uninterruptibleMask } from './interrupt'

function foreachConcurrentUnboundedUnit_<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, any>): I.IO<R, E, void> {
  return I.defer(() => {
    const arr  = Array.from(as)
    const size = arr.length

    if (size === 0) {
      return I.unit()
    }

    return uninterruptibleMask(({ restore }) => {
      const future = F.unsafeMake<void, void>(FiberId.none)
      const ref    = new AtomicNumber(0)
      return pipe(
        transplant((graft) =>
          I.foreach_(as, (a) =>
            pipe(
              graft(
                pipe(
                  restore(I.defer(() => f(a))),
                  I.matchCauseIO(
                    (cause) => I.crossSecond_(F.fail_(future, undefined), I.failCause(cause)),
                    () => {
                      if (ref.incrementAndGet() === size) {
                        F.unsafeDone_(future, I.unit())
                        return I.unit()
                      } else {
                        return I.unit()
                      }
                    }
                  )
                )
              ),
              forkDaemon
            )
          )
        ),
        I.chain((fibers) =>
          pipe(
            restore(F.await(future)),
            I.matchCauseIO(
              (cause) =>
                pipe(
                  foreachConcurrentUnbounded_(fibers, interruptFiber),
                  I.chain((exits) =>
                    pipe(
                      Ex.collectAllPar(...exits),
                      M.match(
                        () => I.failCause(C.stripFailures(cause)),
                        (exit) =>
                          Ex.isFailure(exit)
                            ? I.failCause(C.both(C.stripFailures(cause), exit.cause))
                            : I.failCause(C.stripFailures(cause))
                      )
                    )
                  )
                ),
              () => I.foreachUnit_(fibers, (fiber) => fiber.inheritRefs)
            )
          )
        )
      )
    })
  })

  // return I.gen(function* (_) {
  //   const parentId    = yield* _(I.fiberId())
  //   const causes      = yield* _(Ref.make<C.Cause<E>>(C.empty))
  //   const result      = yield* _(F.make<void, void>())
  //   const status      = yield* _(Ref.make<[number, number, boolean]>([0, 0, false]))
  //   const startEffect = pipe(
  //     status,
  //     Ref.modify(([started, done, failing]): [boolean, [number, number, boolean]] => {
  //       if (failing) {
  //         return [false, [started, done, failing]]
  //       } else {
  //         return [true, [started + 1, done, failing]]
  //       }
  //     })
  //   )

  //   const startFailure = pipe(
  //     status,
  //     Ref.update(([started, done, _]): [number, number, boolean] => [started, done, true]),
  //     I.crossFirst(F.fail_(result, undefined))
  //   )

  //   const effect = (a: A) =>
  //     pipe(
  //       I.defer(traceAs(f, () => f(a))),
  //       interruptible,
  //       I.tapCause((cause) =>
  //         pipe(
  //           causes,
  //           Ref.update((l) => C.both(l, cause)),
  //           I.crossSecond(startFailure)
  //         )
  //       ),
  //       I.ensuring(
  //         pipe(
  //           F.succeed_(result, undefined),
  //           I.whenIO(
  //             Ref.modify_(status, ([started, done, failing]) => [
  //               (failing ? started : size) === done + 1,
  //               [started, done + 1, failing] as [number, number, boolean]
  //             ])
  //           )
  //         )
  //       ),
  //       I.whenIO(startEffect),
  //       uninterruptible
  //     )

  //   const fibers = yield* _(transplant((graft) => I.foreach_(arr, flow(effect, graft, I.fork))))

  //   const interruptor = pipe(
  //     F.await(result),
  //     I.catchAll(() =>
  //       pipe(
  //         fibers,
  //         I.foreach((f) => I.fork(f.interruptAs(parentId))),
  //         I.chain(joinAll)
  //       )
  //     ),
  //     fromIO,
  //     fork
  //   )

  //   yield* _(
  //     use_(interruptor, () =>
  //       pipe(
  //         F.fail_(result, undefined),
  //         I.crossSecond(I.chain_(causes.get, I.failCause)),
  //         I.whenIO(
  //           pipe(
  //             fibers,
  //             I.foreach((f) => f.await),
  //             I.map(flow(Ch.find(Ex.isFailure), M.isJust))
  //           )
  //         ),
  //         I.refailWithTrace
  //       )
  //     )
  //   )

  //   yield* _(I.foreach_(fibers, (f) => f.inheritRefs))
  // })
}

function foreachConcurrentBoundedUnit_<R, E, A>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => I.IO<R, E, A>
): I.IO<R, E, void> {
  const size   = 'length' in as && typeof as['length'] === 'number' ? as['length'] : It.size(as)
  const worker = (queue: Q.UQueue<A>): I.IO<R, E, void> =>
    pipe(
      Q.poll(queue),
      I.chain(
        M.match(
          () => I.unit(),
          flow(
            f,
            I.chain(() => worker(queue))
          )
        )
      )
    )
  return I.gen(function* (_) {
    const queue = yield* _(Q.makeBounded<A>(size))
    yield* _(Q.offerAll_(queue, as))
    yield* _(foreachConcurrentUnboundedUnit_(I.replicate_(worker(queue), n), identity))
  })
}

function foreachConcurrentUnbounded_<R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return pipe(
    I.succeedLazy<B[]>(() => []),
    I.chain((array) =>
      I.chain_(
        foreachConcurrentUnboundedUnit_(
          It.map_(as, (a, n) => [a, n] as [A, number]),
          ([a, n]) =>
            I.chain_(I.defer(traceAs(f, () => f(a))), (b) =>
              I.succeedLazy(() => {
                array[n] = b
              })
            )
        ),
        () => I.succeedLazy(() => array)
      )
    ),
    I.map(Ch.from)
  )
}

function foreachConcurrentBounded_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, Chunk<B>> {
  const size   = 'length' in as && typeof as['length'] === 'number' ? as['length'] : It.size(as)
  const worker = (queue: Q.UQueue<readonly [A, number]>, array: Array<any>): I.IO<R, E, void> =>
    pipe(
      Q.poll(queue),
      I.chain(
        traceAs(
          f,
          M.match(
            () => I.unit(),
            ([a, n]) =>
              pipe(
                f(a),
                I.tap((b) =>
                  I.succeedLazy(() => {
                    array[n] = b
                  })
                ),
                I.chain(() => worker(queue, array))
              )
          )
        )
      )
    )

  return I.gen(function* (_) {
    const array = yield* _(I.succeedLazy(() => new Array(size)))
    const queue = yield* _(Q.makeBounded<readonly [A, number]>(size))
    yield* _(pipe(Q.offerAll_(queue, pipe(as, It.zipWithIndex))))
    yield* _(foreachConcurrentUnboundedUnit_(I.replicate_(worker(queue, array), n), identity))
    return Ch.from(array)
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 *
 * @trace 1
 */
export function foreachUnitPar_<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, any>): I.IO<R, E, void> {
  return concurrencyWith(
    M.match(
      () => foreachConcurrentUnboundedUnit_(as, f),
      (n) => foreachConcurrentBoundedUnit_(as, n, f)
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 *
 * @trace 0
 * @dataFirst foreachUnitPar_
 */
export function foreachUnitPar<R, E, A>(f: (a: A) => I.IO<R, E, any>): (as: Iterable<A>) => I.IO<R, E, void> {
  return (as) => foreachUnitPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 1
 */
export function foreachPar_<R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Ch.Chunk<B>> {
  return concurrencyWith(
    M.match(
      () => foreachConcurrentUnbounded_(as, f),
      (n) => foreachConcurrentBounded_(as, n, f)
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 0
 * @dataFirst foreachPar_
 */
export function foreachPar<R, E, A, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, Ch.Chunk<B>> {
  return (as) => foreachPar_(as, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fiber combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function joinAll<E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, E, Chunk<A>> {
  return I.tap_(I.chain_(awaitAll(as), I.fromExit), () => I.foreach_(as, (f) => f.inheritRefs))
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function awaitAll<E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, never, Exit<E, Chunk<A>>> {
  return I.result(foreachPar_(as, (f) => I.chain_(f.await, I.fromExit)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Managed combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Run an effect while acquiring the resource before and releasing it after
 *
 * @trace 1
 */
export function use_<R, E, A, R2, E2, B>(ma: Managed<R, E, A>, f: (a: A) => I.IO<R2, E2, B>): I.IO<R & R2, E | E2, B> {
  return bracketExit_(
    RM.make,
    traceAs(f, (rm) =>
      pipe(
        uninterruptibleMask(({ restore }) =>
          pipe(
            restore(ma.io),
            I.gives((r: R) => tuple(r, rm))
          )
        ),
        I.chain(([, a]) => f(a))
      )
    ),
    releaseAllSequential_
  )
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 *
 * @trace call
 */
export function fork<R, E, A>(self: Managed<R, E, A>): Managed<R, never, RuntimeFiber<E, A>> {
  const trace = accessCallTrace()
  return new Managed(
    uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const [r, outerReleaseMap] = yield* _(I.ask<readonly [R, RM.ReleaseMap]>())
          const innerReleaseMap      = yield* _(RM.make)
          const fiber                = yield* _(
            pipe(
              self.io,
              I.map(([, a]) => a),
              forkDaemon,
              I.give(tuple(r, innerReleaseMap)),
              restore
            )
          )
          const releaseMapEntry = yield* _(
            RM.add(outerReleaseMap, (e) =>
              pipe(fiber, interruptFiber, I.crossSecond(releaseAllSequential_(innerReleaseMap, e)))
            )
          )

          return tuple(releaseMapEntry, fiber)
        })
      )
    )
  )
}

function releaseAllSequential_(_: RM.ReleaseMap, exit: Exit<any, any>): I.UIO<any> {
  return pipe(
    _.ref,
    Ref.modify((s): [I.UIO<any>, RM.State] => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            I.chain_(
              I.foreach_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) => I.result(s.update(f)(exit))),
              (e) => I.fromExit(M.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
            ),
            new RM.Exited(s.nextKey, exit, s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}
