import type { Eq } from '@principia/base/Eq'
import type { Monoid } from '@principia/base/Monoid'

export const MonoidLaws = {
  rightIdentity: <A>(M: Monoid<A>, E: Eq<A>) => (a: A): boolean => {
    return E.equals_(M.combine_(a, M.nat), a)
  },
  leftIdentity: <A>(M: Monoid<A>, E: Eq<A>) => (a: A): boolean => {
    return E.equals_(M.combine_(M.nat, a), a)
  }
}
