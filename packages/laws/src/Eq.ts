import type { Eq } from '@principia/base/Eq'

export const EqLaws = {
  reflexivity: <A>(E: Eq<A>) => (a: A): boolean => {
    return E.equals_(a, a)
  },
  symmetry: <A>(E: Eq<A>) => (a: A, b: A): boolean => {
    return E.equals_(a, b) === E.equals_(b, a)
  },
  transitivity: <A>(E: Eq<A>) => (a: A, b: A, c: A): boolean => {
    return (E.equals_(a, b) && E.equals_(b, c)) === (E.equals_(a, b) && E.equals_(a, c))
  }
}
