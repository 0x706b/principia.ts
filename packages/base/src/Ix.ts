import type { At } from './At'
import type { Iso } from './Iso'
import type * as M from './Maybe'
import type { Optional } from './Optional'

import * as Op from './internal/Optional'
import * as Pr from './internal/Prism'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Ix<S, I, A> {
  readonly ix: (i: I) => Optional<S, A>
}

export type IxMin<S, I, A> = Ix<S, I, A>

export function Ix<S, I, A>(ix: IndexFn<S, I, A>): Ix<S, I, A> {
  return { ix }
}

export interface IndexFn<S, I, A> {
  (i: I): Optional<S, A>
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromAt<T, J, B>(at: At<T, J, M.Maybe<B>>): Ix<T, J, B> {
  return Ix((i) => Op.andThen_(at.at(i), Pr.prismJust<B>()))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: Ix<S, I, A>) => Ix<T, I, A> {
  return (sia) => Ix((i) => Op.andThen_(iso, sia.ix(i)))
}
