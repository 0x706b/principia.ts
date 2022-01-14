import type * as O from '../Optional/core'

import * as A from '../collection/immutable/Array'
import * as HR from '../collection/immutable/HeterogeneousRecord'
import * as R from '../collection/immutable/Record'
import * as L from '../internal/Lens'
import * as Tu from '../tuple'
import * as Pr from './core'

export function prop_<S, A, P extends keyof A>(sa: Pr.Prism<S, A>, prop: P): O.Optional<S, A[P]> {
  return Pr.composeLens_(sa, HR.propL_(L.id<A>(), prop))
}

/**
 * @dataFirst prop_
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: Pr.Prism<S, A>) => O.Optional<S, A[P]> {
  return (sa) => prop_(sa, prop)
}

export function props_<S, A, P extends keyof A>(
  sa: Pr.Prism<S, A>,
  ...props: [P, P, ...Array<P>]
): O.Optional<S, { [K in P]: A[K] }> {
  return Pr.composeLens_(sa, HR.propsL_(L.id<A>(), ...props))
}

/**
 * @dataFirst props_
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Pr.Prism<S, A>) => O.Optional<S, { [K in P]: A[K] }> {
  return (sa) => props_(sa, ...props)
}

export function component_<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
  sa: Pr.Prism<S, A>,
  prop: P
): O.Optional<S, A[P]> {
  return Pr.composeLens_(sa, Tu.componentL_(L.id<A>(), prop))
}

/**
 * @dataFirst component_
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: Pr.Prism<S, A>) => O.Optional<S, A[P]> {
  return Pr.composeLens(Tu.componentL_(L.id<A>(), prop))
}

export function index_<S, A>(sa: Pr.Prism<S, ReadonlyArray<A>>, i: number): O.Optional<S, A> {
  return Pr.composeOptional_(sa, A.ix(i))
}

export function index(i: number): <S, A>(sa: Pr.Prism<S, ReadonlyArray<A>>) => O.Optional<S, A> {
  return (sa) => index_(sa, i)
}

export function key_<S, A>(sa: Pr.Prism<S, R.ReadonlyRecord<string, A>>, k: string): O.Optional<S, A> {
  return Pr.composeOptional_(sa, R.ix(k))
}

export function key(k: string): <S, A>(sa: Pr.Prism<S, R.ReadonlyRecord<string, A>>) => O.Optional<S, A> {
  return (sa) => key_(sa, k)
}
