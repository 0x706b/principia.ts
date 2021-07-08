import type * as HKT from './HKT'

import * as E from './Either'
import * as P from './prelude'

export function getApplicativeValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: P.MonadExcept<F, C>
): <E>(S: P.Semigroup<E>) => P.Applicative<F, P.Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getApplicativeValidation<F>(
  F: P.MonadExcept<HKT.UHKT2<F>>
): <E>(S: P.Semigroup<E>) => P.Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: P.Semigroup<E>) => {
    const crossWith_: P.CrossWithFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, fb, f) =>
      F.flatten(
        F.crossWith_(F.either(fa), F.either(fb), (ea, eb) =>
          E.match_(
            ea,
            (e) =>
              E.match_(
                eb,
                (e1) => F.fail(S.combine_(e, e1)),
                () => F.fail(e)
              ),
            (a) => E.match_(eb, F.fail, (b) => F.pure(f(a, b)))
          )
        )
      )

    return P.Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      crossWith_,
      pure: F.pure
    })
  }
}

export function getAltValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: P.MonadExcept<F, C> & P.Alt<F, C>
): <E>(S: P.Semigroup<E>) => P.Alt<F, P.Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getAltValidation<F>(
  F: P.MonadExcept<HKT.UHKT2<F>> & P.Alt<HKT.UHKT2<F>>
): <E>(S: P.Semigroup<E>) => P.Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: P.Semigroup<E>) => {
    const alt_: P.AltFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, that) =>
      F.chain_(
        F.either(fa),
        E.match(
          (e) =>
            F.chain_(
              F.either(that()),
              E.match(
                (e1) => F.fail(S.combine_(e, e1)),
                (a) => F.pure(a)
              )
            ),
          (a) => F.pure(a)
        )
      )
    return P.Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      alt_
    })
  }
}
