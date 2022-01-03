import type * as O from '../Optional'

import * as A from '../Array'
import * as HR from '../HeterogeneousRecord'
import * as R from '../Record'
import * as Tu from '../tuple'
import * as L from './core'

export const prop_ = HR.propL_

/**
 * @dataFirst prop_
 */
export const prop = HR.propL

export const props_ = HR.propsL_

/**
 * @dataFirst props_
 */
export const props = HR.propsL

export const path_ = HR.pathL_

/**
 * @dataFirst path_
 */
export const path = HR.pathL

export const component_ = Tu.componentL_

/**
 * @dataFirst component_
 */
export const component = Tu.componentL

export function index_<S, A>(sa: L.Lens<S, ReadonlyArray<A>>, i: number): O.Optional<S, A> {
  return L.composeOptional_(sa, A.ix(i))
}

/**
 * @dataFirst index_
 */
export function index(i: number): <S, A>(sa: L.Lens<S, ReadonlyArray<A>>) => O.Optional<S, A> {
  return (sa) => index_(sa, i)
}

export function key_<S, A>(sa: L.Lens<S, R.ReadonlyRecord<string, A>>, k: string): O.Optional<S, A> {
  return L.composeOptional_(sa, R.ix(k))
}

/**
 * @dataFirst key_
 */
export function key(k: string): <S, A>(sa: L.Lens<S, R.ReadonlyRecord<string, A>>) => O.Optional<S, A> {
  return (sa) => key_(sa, k)
}
