// tracing: off

import type { Eq } from '../../Eq'
import type { IO, UIO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as HM from '../../HashMap'
import * as O from '../../Option'
import * as P from '../../Promise'
import * as RefM from '../../RefM'
import { tuple } from '../../tuple'
import * as I from '../core'

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @trace 0
 */
export function memoize<R, E, A, B>(f: (a: A) => IO<R, E, B>): UIO<(a: A) => IO<R, E, B>> {
  return pipe(
    RefM.make(HM.makeDefault<A, P.Promise<E, B>>()),
    I.map(
      traceAs(
        f,
        (ref) => (a: A) =>
          I.gen(function* (_) {
            const promise = yield* _(
              pipe(
                RefM.modifyIO_(ref, (m) => {
                  const memo = HM.get_(m, a)
                  if (O.isSome(memo)) {
                    return I.succeed(tuple(memo.value, m))
                  } else {
                    return I.gen(function* (_) {
                      const p = yield* _(P.make<E, B>())
                      yield* _(I.fork(P.fulfill_(p, f(a))))
                      return tuple(p, HM.set_(m, a, p))
                    })
                  }
                })
              )
            )
            return yield* _(P.await(promise))
          })
      )
    )
  )
}

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export function memoizeEq<A>(eq: Eq<A>) {
  return (
    /**
     * @trace 0
     */
    <R, E, B>(f: (a: A) => IO<R, E, B>): UIO<(a: A) => IO<R, E, B>> =>
      pipe(
        RefM.make(HM.makeDefault<A, P.Promise<E, B>>()),
        I.map(
          traceAs(
            f,
            (ref) => (a: A) =>
              I.gen(function* (_) {
                const promise = yield* _(
                  pipe(
                    RefM.modifyIO_(ref, (m) => {
                      for (const [k, v] of m) {
                        if (eq.equals_(k, a)) {
                          return I.succeed(tuple(v, m))
                        }
                      }
                      return I.gen(function* (_) {
                        const p = yield* _(P.make<E, B>())
                        yield* _(I.fork(P.fulfill_(p, f(a))))
                        return tuple(p, HM.set_(m, a, p))
                      })
                    })
                  )
                )
                return yield* _(P.await(promise))
              })
          )
        )
      )
  )
}
