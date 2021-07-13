import type { At } from './At'
import type { Iso } from './Iso'
import type { Optional } from './Optional'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import * as _ from './internal'
import { POptional } from './Optional'

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
export function fromAt<T, J, B>(at: At<T, J, O.Option<B>>): Ix<T, J, B> {
  return Ix((i) => _.optionalAndThenOptional(at.at(i), _.prismSome<B>()))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: Ix<S, I, A>) => Ix<T, I, A> {
  return (sia) => Ix((i) => _.optionalAndThenOptional(iso, sia.index(i)))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function array<A>(): Ix<ReadonlyArray<A>, number, A> {
  return Ix((i) =>
    POptional({
      getOrModify: (as) =>
        pipe(
          as,
          A.lookup(i),
          O.match(() => E.left(as), E.right)
        ),
      replace_: (as, a) =>
        pipe(
          A.updateAt_(as, i, a),
          O.getOrElse(() => as)
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
    POptional({
      getOrModify: (r) =>
        pipe(
          r,
          R.lookup(k),
          O.match(() => E.left(r), E.right)
        ),
      replace_: (r, a) => {
        if (r[k] === a || O.isNone(R.lookup_(r, k))) {
          return r
        }
        return R.upsertAt_(r, k, a)
      }
    })
  )
}
