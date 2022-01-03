import type * as HKT from '../HKT'
import type * as P from '../prelude'
import type { PTraversal, PTraversalMin } from '../Traversal'

import * as C from '../Const'
import * as I from '../Identity'
import { PSetter } from '../Setter'
import { makeFold } from './Fold'

export function makePTraversal<S, T, A, B>(Tr: PTraversalMin<S, T, A, B>): PTraversal<S, T, A, B> {
  return {
    modifyA_: Tr.modifyA_,
    modifyA: (F) => (f) => (s) => Tr.modifyA_(F)(s, f),
    ...PSetter({
      modify_: (s, f) => Tr.modifyA_(I.Applicative)(s, f),
      set_: (s, b) => Tr.modifyA_(I.Applicative)(s, () => b)
    }),
    ...makeFold({
      foldMap_:
        <M>(M: P.Monoid<M>) =>
        (s: S, f: (a: A) => M) =>
          Tr.modifyA_(C.getApplicative(M))(s, (a) => C.make(f(a)))
    })
  }
}

export function compose_<S, T, A, B, C, D>(
  sa: PTraversal<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return makePTraversal<S, T, C, D>({
    modifyA_: (F) => (s, f) => sa.modifyA_(F)(s, ab.modifyA(F)(f))
  })
}

/**
 * Create a `Traversal` from a `Traversable`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromTraversable<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <
  A,
  B,
  K = HKT.Low<T, 'K'>,
  Q = HKT.Low<T, 'Q'>,
  W = HKT.Low<T, 'W'>,
  X = HKT.Low<T, 'X'>,
  I = HKT.Low<T, 'I'>,
  S = HKT.Low<T, 'S'>,
  R = HKT.Low<T, 'R'>,
  E = HKT.Low<T, 'E'>,
  K1 = HKT.Low<T, 'K'>,
  Q1 = HKT.Low<T, 'Q'>,
  W1 = HKT.Low<T, 'W'>,
  X1 = HKT.Low<T, 'X'>,
  I1 = HKT.Low<T, 'I'>,
  S1 = HKT.Low<T, 'S'>,
  R1 = HKT.Low<T, 'R'>,
  E1 = HKT.Low<T, 'E'>
>() => PTraversal<HKT.Kind<T, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<T, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>, A, B>
export function fromTraversable<T>(
  T: P.Traversable<HKT.F<T>>
): <A, B>() => PTraversal<
  HKT.FK<T, any, any, any, any, any, any, any, any, A>,
  HKT.FK<T, any, any, any, any, any, any, any, any, B>,
  A,
  B
> {
  return <A, B>() =>
    makePTraversal<
      HKT.FK<T, any, any, any, any, any, any, any, any, A>,
      HKT.FK<T, any, any, any, any, any, any, any, any, B>,
      A,
      B
    >({
      modifyA_: (F) => {
        const traverseF_ = T.traverse_(F)
        return (s, f) => traverseF_(s, f)
      }
    })
}
