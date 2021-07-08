import type { EitherURI } from './Either'
import type * as HKT from './HKT'

import * as E from './Either'
import { flow } from './function'
import * as P from './prelude'

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.V<'E', '+'>

export function getEitherT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): EitherT<F, C>
export function getEitherT<F>(M: P.Monad<HKT.UHKT<F>>): EitherT<HKT.UHKT<F>> {
  const chain_: EitherT<HKT.UHKT<F>>['chain_'] = <E, A, E1, B>(
    ma: HKT.HKT<F, E.Either<E, A>>,
    f: (a: A) => HKT.HKT<F, E.Either<E1, B>>
  ) =>
    M.chain_(
      ma,
      E.match(
        (e) => M.pure(E.left<E | E1, B>(e)),
        (a) => f(a)
      )
    )

  const catchAll_: EitherT<HKT.UHKT<F>>['catchAll_'] = <E, A, E1, A1>(
    fa: HKT.HKT<F, E.Either<E, A>>,
    f: (e: E) => HKT.HKT<F, E.Either<E1, A1>>
  ): HKT.HKT<F, E.Either<E1, A | A1>> =>
    M.chain_(
      fa,
      E.match(
        (e): HKT.HKT<F, E.Either<E1, A | A1>> => f(e),
        (a) => M.pure(E.right(a))
      )
    )

  return P.MonadExcept({
    ...P.getApplicativeComposition(M, E.Applicative),
    fail: flow(E.left, M.pure),
    chain_,
    catchAll_
  })
}

export interface EitherT<M extends HKT.URIS, C = HKT.Auto>
  extends P.MonadExcept<[M[0], ...HKT.Rest<M>, HKT.URI<EitherURI>], V<C>> {}
