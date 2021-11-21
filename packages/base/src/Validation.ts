import type * as HKT from './HKT'

import * as E from './Either'
import * as P from './prelude'

export interface ValidationF<E, F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  readonly type: HKT.Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    E,
    this['A']
  >
  readonly variance: {
    K: F['variance']['K']
    Q: F['variance']['Q']
    W: F['variance']['W']
    X: F['variance']['X']
    I: F['variance']['I']
    S: F['variance']['S']
    R: F['variance']['R']
    E: F['variance']['E']
    A: F['variance']['A']
  }
}

export function getApplicativeValidation<F extends HKT.CovariantE, C = HKT.None>(
  F: P.MonadExcept<F, C>
): <E>(S: P.Semigroup<E>) => P.Applicative<ValidationF<E, F, C>, HKT.Fix<'E', E>>
export function getApplicativeValidation<F>(
  F: P.MonadExcept<HKT.FCoE<F>>
): <E>(S: P.Semigroup<E>) => P.Applicative<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>> {
  return <E>(S: P.Semigroup<E>) => {
    const crossWith_: P.CrossWithFn_<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>> = (fa, fb, f) =>
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

    return P.Applicative<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>>({
      map_: (fa, f) => F.map_(fa, f),
      crossWith_,
      pure: (a) => F.pure(a)
    })
  }
}

export function getAltValidation<F extends HKT.CovariantE, C = HKT.None>(
  F: P.MonadExcept<F, C> & P.Alt<F, C>
): <E>(S: P.Semigroup<E>) => P.Alt<ValidationF<E, F, C>, HKT.Fix<'E', E>>
export function getAltValidation<F>(
  F: P.MonadExcept<HKT.FCoE<F>> & P.Alt<HKT.F<F>>
): <E>(S: P.Semigroup<E>) => P.Alt<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>> {
  return <E>(S: P.Semigroup<E>) => {
    const alt_: P.AltFn_<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>> = (fa, that) =>
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
    return P.Alt<ValidationF<E, HKT.FCoE<F>>, HKT.Fix<'E', E>>({
      map_: (fa, f) => F.map_(fa, f),
      alt_
    })
  }
}
