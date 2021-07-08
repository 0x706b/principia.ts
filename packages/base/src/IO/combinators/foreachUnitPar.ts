// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Exit } from '../../Exit/core'
import type { Fiber } from '../../Fiber/core'
import type { FiberContext } from '../../internal/FiberContext'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as Ch from '../../Chunk/core'
import * as Ex from '../../Exit'
import { interrupt as interruptFiber } from '../../Fiber/combinators/interrupt'
import { flow, pipe } from '../../function'
import * as It from '../../Iterable'
import { fromIO, Managed } from '../../Managed/core'
import * as RM from '../../Managed/ReleaseMap'
import * as O from '../../Option'
import * as P from '../../Promise'
import * as Ref from '../../Ref/core'
import { tuple } from '../../tuple'
import * as I from '../core'
import { bracketExit_ } from './bracketExit'
import { forkDaemon, transplant } from './core-scope'
import { ensuring } from './ensuring'
import { interruptible, uninterruptible, uninterruptibleMask } from './interrupt'

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
  const arr  = Array.from(as)
  const size = arr.length

  if (size === 0) {
    return I.unit()
  }

  return I.gen(function* (_) {
    const parentId    = yield* _(I.fiberId())
    const causes      = yield* _(Ref.make<C.Cause<E>>(C.empty))
    const result      = yield* _(P.make<void, void>())
    const status      = yield* _(Ref.make<[number, number, boolean]>([0, 0, false]))
    const startEffect = pipe(
      status,
      Ref.modify(([started, done, failing]): [boolean, [number, number, boolean]] => {
        if (failing) {
          return [false, [started, done, failing]]
        } else {
          return [true, [started + 1, done, failing]]
        }
      })
    )

    const startFailure = pipe(
      status,
      Ref.update(([started, done, _]): [number, number, boolean] => [started, done, true]),
      I.crossFirst(P.fail_(result, undefined))
    )

    const effect = (a: A) =>
      pipe(
        I.defer(traceAs(f, () => f(a))),
        interruptible,
        I.tapCause((cause) =>
          pipe(
            causes,
            Ref.update((l) => C.both(l, cause)),
            I.crossSecond(startFailure)
          )
        ),
        ensuring(
          pipe(
            P.succeed_(result, undefined),
            I.whenIO(
              Ref.modify_(status, ([started, done, failing]) => [
                (failing ? started : size) === done + 1,
                [started, done + 1, failing] as [number, number, boolean]
              ])
            )
          )
        ),
        I.whenIO(startEffect),
        uninterruptible
      )

    const fibers = yield* _(transplant((graft) => I.foreach_(arr, flow(effect, graft, I.fork))))

    const interruptor = pipe(
      P.await(result),
      I.catchAll(() =>
        pipe(
          fibers,
          I.foreach((f) => I.fork(f.interruptAs(parentId))),
          I.chain(joinAllFibers)
        )
      ),
      fromIO,
      forkManaged
    )

    yield* _(
      useManaged_(interruptor, () =>
        pipe(
          P.fail_(result, undefined),
          I.crossSecond(I.chain_(causes.get, I.halt)),
          I.whenIO(
            pipe(
              fibers,
              I.foreach((f) => f.await),
              I.map(flow(Ch.find(Ex.isFailure), O.isSome))
            )
          ),
          I.refailWithTrace
        )
      )
    )
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
 * @dataFirst foreachUnitPar_
 * @trace 0
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
export function _foreachPar<R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return pipe(
    I.succeedLazy<B[]>(() => []),
    I.chain((mut_array) =>
      I.chain_(
        foreachUnitPar_(
          It.imap_(as, (n, a) => [a, n] as [A, number]),
          ([a, n]) =>
            I.chain_(I.defer(traceAs(f, () => f(a))), (b) =>
              I.succeedLazy(() => {
                mut_array[n] = b
              })
            )
        ),
        () => I.succeedLazy(() => mut_array)
      )
    ),
    I.map(Ch.from)
  )
}

function joinAllFibers<E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, E, Chunk<A>> {
  return I.tap_(I.chain_(awaitAllFibers(as), I.done), () => I.foreach_(as, (f) => f.inheritRefs))
}

function awaitAllFibers<E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, never, Exit<E, Chunk<A>>> {
  return I.result(_foreachPar(as, (f) => I.chain_(f.await, I.done)))
}

function useManaged_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => I.IO<R2, E2, B>
): I.IO<R & R2, E | E2, B> {
  return bracketExit_(
    RM.make,
    (rm) =>
      I.chain_(
        I.gives_(self.io, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    releaseAllSeq_
  )
}

function forkManaged<R, E, A>(self: Managed<R, E, A>): Managed<R, never, FiberContext<E, A>> {
  return new Managed(
    uninterruptibleMask(({ restore }) =>
      I.gen(function* (_) {
        const [r, outerReleaseMap] = yield* _(I.ask<readonly [R, RM.ReleaseMap]>())
        const innerReleaseMap      = yield* _(RM.make)
        const fiber                = yield* _(
          pipe(
            self.io,
            I.map(([, a]) => a),
            forkDaemon,
            I.giveAll(tuple(r, innerReleaseMap)),
            restore
          )
        )
        const releaseMapEntry      = yield* _(
          RM.add(outerReleaseMap, (e) => pipe(fiber, interruptFiber, I.crossSecond(releaseAllSeq_(innerReleaseMap, e))))
        )

        return tuple(releaseMapEntry, fiber)
      })
    )
  )
}

function releaseAllSeq_(_: RM.ReleaseMap, exit: Exit<any, any>): I.UIO<any> {
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
              (e) => I.done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
            ),
            new RM.Exited(s.nextKey, exit, s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}
