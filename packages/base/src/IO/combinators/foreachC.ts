// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Fiber, RuntimeFiber } from '../../Fiber/core'
import type { Exit } from '../Exit/core'

import { accessCallTrace, traceAs, traceFrom } from '@principia/compile/util'

import * as Ch from '../../Chunk/core'
import { interrupt as interruptFiber } from '../../Fiber/combinators/interrupt'
import * as FiberId from '../../Fiber/FiberId'
import * as FR from '../../FiberRef/core'
import { flow, identity, pipe } from '../../function'
import * as F from '../../Future'
import { AtomicNumber } from '../../internal/AtomicNumber'
import * as It from '../../Iterable'
import * as Ma from '../../Managed/core'
import * as RM from '../../Managed/ReleaseMap/core'
import * as M from '../../Maybe'
import * as Q from '../../Queue'
import * as Ref from '../../Ref/core'
import { tuple } from '../../tuple/core'
import * as C from '../Cause'
import * as I from '../core'
import * as Ex from '../Exit'
import { bracketExit, bracketExit_ } from './bracketExit'
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
                    (cause) => I.apSecond_(F.fail_(future, undefined), I.failCause(cause)),
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
                      Ex.collectAllC(exits),
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
}

function foreachConcurrentUnboundedUnitWorker_<R, E, A>(
  queue: Q.UQueue<A>,
  f: (a: A) => I.IO<R, E, any>
): I.IO<R, E, void> {
  return pipe(
    Q.poll(queue),
    I.chain(
      M.match(
        () => I.unit(),
        flow(
          f,
          I.chain(() => foreachConcurrentUnboundedUnitWorker_(queue, f))
        )
      )
    )
  )
}

function foreachConcurrentBoundedUnit_<R, E, A>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => I.IO<R, E, any>
): I.IO<R, E, void> {
  return I.defer(() => {
    const size = 'length' in as && typeof as['length'] === 'number' ? as['length'] : It.size(as)
    if (size === 0) {
      return I.unit()
    }
    return I.gen(function* (_) {
      const queue = yield* _(Q.makeBounded<A>(size))
      yield* _(Q.offerAll_(queue, as))
      yield* _(
        foreachConcurrentUnboundedUnit_(I.replicate_(foreachConcurrentUnboundedUnitWorker_(queue, f), n), identity)
      )
    })
  })
}

function foreachConcurrentUnbounded_<R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return pipe(
    I.succeedLazy<B[]>(() => []),
    I.chain((array) =>
      I.chain_(
        foreachConcurrentUnboundedUnit_(It.zipWithIndex(as), ([n, a]) =>
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

function foreachConcurrentBoundedWorker_<R, E, A, B>(
  queue: Q.UQueue<readonly [number, A]>,
  array: Array<any>,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, void> {
  return pipe(
    Q.poll(queue),
    I.chain(
      traceAs(
        f,
        M.match(
          () => I.unit(),
          ([n, a]) =>
            pipe(
              f(a),
              I.tap((b) =>
                I.succeedLazy(() => {
                  array[n] = b
                })
              ),
              I.chain(() => foreachConcurrentBoundedWorker_(queue, array, f))
            )
        )
      )
    )
  )
}

function foreachConcurrentBounded_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, Chunk<B>> {
  return I.defer(() => {
    const size = 'length' in as && typeof as['length'] === 'number' ? as['length'] : It.size(as)
    if (size === 0) {
      return I.succeed(Ch.empty())
    }
    return I.gen(function* (_) {
      const array = yield* _(I.succeedLazy(() => new Array(size)))
      const queue = yield* _(Q.makeBounded<readonly [number, A]>(size))
      yield* _(pipe(Q.offerAll_(queue, pipe(as, It.zipWithIndex))))
      yield* _(
        foreachConcurrentUnboundedUnit_(I.replicate_(foreachConcurrentBoundedWorker_(queue, array, f), n), identity)
      )
      return Ch.from(array)
    })
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
export function foreachUnitC_<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, any>): I.IO<R, E, void> {
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
 * @dataFirst foreachUnitC
 */
export function foreachUnitC<R, E, A>(f: (a: A) => I.IO<R, E, any>): (as: Iterable<A>) => I.IO<R, E, void> {
  return (as) => foreachUnitC_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 1
 */
export function foreachC_<R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Ch.Chunk<B>> {
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
 * @dataFirst foreachC_
 */
export function foreachC<R, E, A, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, Ch.Chunk<B>> {
  return (as) => foreachC_(as, f)
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
  return I.result(foreachC_(as, (f) => I.chain_(f.await, I.fromExit)))
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
export function use_<R, E, A, R2, E2, B>(
  ma: Ma.Managed<R, E, A>,
  f: (a: A) => I.IO<R2, E2, B>
): I.IO<R & R2, E | E2, B> {
  return pipe(
    RM.make,
    I.chain((releaseMap) =>
      pipe(
        Ma.currentReleaseMap,
        FR.locally(
          releaseMap,
          pipe(
            FR.get(Ma.currentReleaseMap),
            bracketExit(
              () =>
                pipe(
                  ma.io,
                  I.chain(([_, a]) => f(a))
                ),
              releaseAllSequential_
            )
          )
        )
      )
    )
  )
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 *
 * @trace call
 */
export function fork<R, E, A>(self: Ma.Managed<R, E, A>): Ma.Managed<R, never, RuntimeFiber<E, A>> {
  const trace = accessCallTrace()
  return new Ma.Managed(
    uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const outerReleaseMap = yield* _(FR.get(Ma.currentReleaseMap))
          const innerReleaseMap = yield* _(RM.make)
          const fiber           = yield* _(
            pipe(
              Ma.currentReleaseMap,
              FR.locally(
                innerReleaseMap,
                restore(
                  pipe(
                    self.io,
                    I.map(([_, a]) => a),
                    forkDaemon
                  )
                )
              )
            )
          )
          const releaseMapEntry = yield* _(
            RM.add_(outerReleaseMap, (e) =>
              pipe(fiber, interruptFiber, I.apSecond(releaseAllSequential_(innerReleaseMap, e)))
            )
          )

          return tuple(releaseMapEntry, fiber)
        })
      )
    )
  )
}

function releaseAllSequential_(releaseMap: RM.ReleaseMap, exit: Exit<any, any>): I.UIO<any> {
  return pipe(
    RM.ReleaseMap.reverseGet(releaseMap),
    Ref.modify((s): [I.UIO<any>, RM.State] => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            I.chain_(
              I.foreach_(Array.from(s.finalizers).reverse(), ([_, f]) => I.result(s.update(f)(exit))),
              (e) => I.fromExit(M.getOrElse_(Ex.collectAll(e), () => Ex.succeed(Ch.empty())))
            ),
            new RM.Exited(s.nextKey, exit, s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}
