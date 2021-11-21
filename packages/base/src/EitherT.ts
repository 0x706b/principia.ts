import type * as HKT from './HKT'

import * as E from './Either'
import { flow } from './function'
import * as P from './prelude'

export interface EitherTF<F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  type: HKT.Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    HKT.Low<F, 'E'>,
    E.Either<this['E'], this['A']>
  >
  variance: {
    E: '+'
  }
}

export function getEitherT<F extends HKT.HKT, C = HKT.None>(M: P.Monad<F, C>): P.MonadExcept<EitherTF<F, C>>
export function getEitherT<F>(M: P.Monad<HKT.F<F>>): P.MonadExcept<EitherTF<HKT.F<F>>> {
  const chain_: P.MonadExcept<EitherTF<HKT.F<F>>>['chain_'] = <K, Q, W, X, I, S, R, E, A, E1, B>(
    ma: HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E, A>>,
    f: (a: A) => HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E1, B>>
  ): HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E | E1, B>> =>
    M.chain_(
      ma,
      E.match(
        (e) => M.pure(E.left(e)),
        (a) => f(a) as HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E | E1, B>>
      )
    )

  const catchAll_: P.MonadExcept<EitherTF<HKT.F<F>>>['catchAll_'] = <K, Q, W, X, I, S, R, E, A, E1, A1>(
    fa: HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E, A>>,
    f: (e: E) => HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E1, A1>>
  ): HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E1, A | A1>> =>
    M.chain_(
      fa,
      E.match(
        (e) => f(e),
        (a) => M.pure(E.right(a)) as HKT.FK<F, K, Q, W, X, I, S, R, any, E.Either<E1, A | A1>>
      )
    )

  return P.MonadExcept<EitherTF<HKT.F<F>>>({
    ...P.getApplicativeComposition(M, E.Applicative),
    fail: flow(E.left, M.pure),
    chain_,
    catchAll_
  })
}
