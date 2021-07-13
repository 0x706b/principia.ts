import type { Lens } from './Lens'

import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import * as _ from './internal'
import * as Iso from './Iso'

type Iso<S, A> = Iso.Iso<S, A>

/*
 * -------------------------------------------
 * At Model
 * -------------------------------------------
 */

export interface At<S, I, A> {
  readonly at: (i: I) => Lens<S, A>
}

export type AtMin<S, I, A> =
  | { readonly get: (i: I) => (s: S) => A, readonly set: (i: I) => (s: S, a: A) => S }
  | At<S, I, A>

export function At<S, I, A>(at: AtMin<S, I, A>): At<S, I, A> {
  if ('at' in at) {
    return at
  } else {
    return {
      at: (i) => _.makePLens({ get: at.get(i), replace_: at.set(i) })
    }
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Lift an instance of `At` using an `Iso`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: At<S, I, A>) => At<T, I, A> {
  return (sia) => At({ at: (i) => Iso.andThenLens_(iso, sia.at(i)) })
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function atRecord<A = never>(): At<Readonly<Record<string, A>>, string, O.Option<A>> {
  return At({
    at: (key) =>
      _.makePLens({
        get: (r) => R.lookup_(r, key),
        replace_: (s, b) =>
          O.match_(
            b,
            () => R.deleteAt_(s, key),
            (a) => R.upsertAt_(s, key, a)
          )
      })
  })
}
