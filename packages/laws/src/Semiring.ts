import type { Eq } from '@principia/base/Eq'
import type { Semiring } from '@principia/base/Semiring'

import { allEquals } from './utils'

export const SemiringLaws = {
  addAssociativity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return E.equals_(S.add_(S.add_(a, b), c), S.add_(a, S.add_(b, c)))
  },
  addIdentity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A): boolean => {
    return allEquals(E)(a, S.add_(a, S.zero), S.add_(S.zero, a))
  },
  commutativity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A, b: A): boolean => {
    return E.equals_(S.add_(a, b), S.add_(b, a))
  },
  mulAssociativity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return E.equals_(S.mul_(S.mul_(a, b), c), S.mul_(a, S.mul_(b, c)))
  },
  mulIdentity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A): boolean => {
    return allEquals(E)(a, S.mul_(a, S.one), S.mul_(S.one, a))
  },
  leftDistributivity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return E.equals_(S.mul_(a, S.add_(b, c)), S.add_(S.mul_(a, b), S.mul_(a, c)))
  },
  rightDistributivity: <A>(S: Semiring<A>, E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return E.equals_(S.mul_(S.add_(a, b), c), S.add_(S.mul_(a, c), S.mul_(b, c)))
  },
  annihilation: <A>(S: Semiring<A>, E: Eq<A>) => (a: A): boolean => {
    return allEquals(E)(S.zero, S.mul_(a, S.zero), S.mul_(S.zero, a))
  }
}
