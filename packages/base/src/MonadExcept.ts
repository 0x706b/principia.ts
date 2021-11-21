import type { ApplicativeExceptMin } from './ApplicativeExcept'
import type { Either } from './internal/Either'
import type { MonadMin } from './Monad'

import { pureF } from './Applicative'
import { ApplicativeExcept } from './ApplicativeExcept'
import { chainF_ } from './Chain'
import { pipe } from './function'
import * as HKT from './HKT'
import * as E from './internal/Either'
import { Monad } from './Monad'

export interface MonadExcept<F extends HKT.CovariantE, C = HKT.None> extends Monad<F, C>, ApplicativeExcept<F, C> {
  readonly subsumeEither: SubsumeEitherFn<F, C>
}

export type MonadExceptMin<F extends HKT.CovariantE, C = HKT.None> = MonadMin<F, C> & ApplicativeExceptMin<F, C>

export function MonadExcept<F extends HKT.CovariantE, C = HKT.None>(F: MonadExceptMin<F, C>): MonadExcept<F, C>
export function MonadExcept<F>(F: MonadExceptMin<HKT.FCoE<F>>): MonadExcept<HKT.FCoE<F>> {
  const MonadF             = Monad(F)
  const ApplicativeExceptF = ApplicativeExcept(F)
  return HKT.instance<MonadExcept<HKT.FCoE<F>>>({
    ...MonadF,
    ...ApplicativeExceptF,
    subsumeEither: (ma) => pipe(ma, MonadF.chain(E.match(ApplicativeExceptF.fail, ApplicativeExceptF.pure)))
  })
}

export interface SubsumeEitherFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<HKT.OrFix<C, 'E', E1>, A>>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, HKT.Mix<F, 'E', [E, E1]>, A>
}

export function getSubsumeEither<F extends HKT.CovariantE, C = HKT.None>(F: MonadExceptMin<F, C>): SubsumeEitherFn<F, C>
export function getSubsumeEither<F>(F: MonadExceptMin<HKT.FCoE<F>>): SubsumeEitherFn<HKT.FCoE<F>> {
  const chain_ = chainF_(F)
  const pure   = pureF(F)
  return (fa) => chain_(fa, E.match(F.fail, pure))
}
