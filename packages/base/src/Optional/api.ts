import * as A from '../Array'
import * as HR from '../HeterogeneousRecord'
import * as L from '../internal/Lens'
import * as R from '../Record'
import * as Tu from '../tuple'
import * as O from './core'

export function prop_<S, A, P extends keyof A>(sa: O.Optional<S, A>, prop: P): O.Optional<S, A[P]> {
  return O.andThen_(sa, HR.propL_(L.id<A>(), prop))
}

/**
 * @dataFirst prop_
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: O.Optional<S, A>) => O.Optional<S, A[P]> {
  return O.andThen(HR.propL_(L.id<A>(), prop))
}

export function props_<S, A, P extends keyof A>(
  sa: O.Optional<S, A>,
  ...props: [P, P, ...Array<P>]
): O.Optional<S, { [K in P]: A[K] }> {
  return O.andThen_(sa, HR.propsL_(L.id<A>(), ...props))
}

/**
 * @dataFirst props_
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: O.Optional<S, A>) => O.Optional<S, { [K in P]: A[K] }> {
  return O.andThen(HR.propsL_(L.id<A>(), ...props))
}

export function component_<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
  sa: O.Optional<S, A>,
  prop: P
): O.Optional<S, A[P]> {
  return O.andThen_(sa, Tu.componentL_(L.id<A>(), prop))
}

/**
 * @dataFirst component_
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: O.Optional<S, A>) => O.Optional<S, A[P]> {
  return O.andThen(Tu.componentL_(L.id<A>(), prop))
}

export function index_<S, A>(sa: O.Optional<S, ReadonlyArray<A>>, i: number): O.Optional<S, A> {
  return O.andThen_(sa, A.ix(i))
}

/**
 * @dataFirst index_
 */
export function index(i: number): <S, A>(sa: O.Optional<S, ReadonlyArray<A>>) => O.Optional<S, A> {
  return (sa) => index_(sa, i)
}

export function key_<S, A>(sa: O.Optional<S, R.ReadonlyRecord<string, A>>, k: string): O.Optional<S, A> {
  return O.andThen_(sa, R.ix(k))
}

/**
 * @dataFirst key_
 */
export function key(k: string): <S, A>(sa: O.Optional<S, R.ReadonlyRecord<string, A>>) => O.Optional<S, A> {
  return (sa) => key_(sa, k)
}