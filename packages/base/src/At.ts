import type { Lens } from './Lens'

import { makePLens } from './internal/Lens'
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
      at: (i) => makePLens({ get: at.get(i), set_: at.set(i) })
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
