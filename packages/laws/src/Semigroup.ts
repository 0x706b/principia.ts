import type { Eq } from '@principia/base/Eq'
import type { Semigroup } from '@principia/base/Semigroup'

export const SemigroupLaws = {
  associativity: <A>(S: Semigroup<A>, E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return E.equals_(S.combine_(S.combine_(a, b), c), S.combine_(a, S.combine_(b, c)))
  }
}
