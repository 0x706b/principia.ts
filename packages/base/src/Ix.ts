import type { At } from './At'
import type { Iso } from './Iso'
import type { Optional } from './Optional'

import * as A from './Array/core'
import * as E from './Either'
import { pipe } from './function'
import * as Pr from './internal/Prism'
import * as M from './Maybe'
import * as Op from './Optional'
import * as R from './Record'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Ix<S, I, A> {
  readonly index: (i: I) => Optional<S, A>
}

export type IxMin<S, I, A> = Ix<S, I, A>

export function Ix<S, I, A>(index: IndexFn<S, I, A>): Ix<S, I, A> {
  return { index }
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
  return (sia) => Ix((i) => Op.andThen_(iso, sia.index(i)))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function array<A>(): Ix<ReadonlyArray<A>, number, A> {
  return Ix((i) =>
    Op.POptional({
      getOrModify: (as) =>
        pipe(
          as,
          A.lookup(i),
          M.match(() => E.left(as), E.right)
        ),
      replace_: (as, a) =>
        pipe(
          A.updateAt_(as, i, a),
          M.getOrElse(() => as)
        )
    })
  )
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function record<A>(): Ix<Record<string, A>, string, A> {
  return Ix((k) =>
    Op.POptional({
      getOrModify: (r) =>
        pipe(
          r,
          R.lookup(k),
          M.match(() => E.left(r), E.right)
        ),
      replace_: (r, a) => {
        if (r[k] === a || M.isNothing(R.lookup_(r, k))) {
          return r
        }
        return R.upsertAt_(r, k, a)
      }
    })
  )
}
