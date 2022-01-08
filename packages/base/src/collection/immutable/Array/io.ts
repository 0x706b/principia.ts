import type { Maybe } from '../../../Maybe'

import { constVoid, pipe } from '../../../function'
import * as I from '../../../IO'
import * as It from '../../Iterable/core'
import * as M from '../../../Maybe'
import * as A from './core'

/**
 * Discards elements of an Array while the effectful predicate holds
 */
export function dropWhileIO_<A, R, E>(
  as: ReadonlyArray<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.defer(() => {
    let dropping        = I.succeed(true) as I.IO<R, E, boolean>
    const ret: Array<A> = []

    for (let i = 0; i < as.length; i++) {
      const a  = as[i]
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) {
            return true
          } else {
            ret.push(a)
            return false
          }
        })
      )
    }
    return I.asLazy_(dropping, () => ret)
  })
}

/**
 * Discards elements of an Array while the effectful predicate holds
 */
export function dropWhileIO<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => dropWhileIO_(as, p)
}

/**
 * Filters an Array with an effectful function
 */
export function filterIO_<A, R, E>(
  as: ReadonlyArray<A>,
  f: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.defer(() => {
    const ret: Array<A>               = []
    let computation: I.IO<R, E, void> = I.unit()
    for (let i = 0; i < as.length; i++) {
      const a     = as[i]
      computation = pipe(
        computation,
        I.chain(() => f(a)),
        I.map((b) => (b ? (ret.push(a), undefined) : undefined))
      )
    }
    return I.asLazy_(computation, () => ret)
  })
}

/**
 * Filters an Array with an effectful function
 */
export function filterIO<A, R, E>(
  f: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => filterIO_(as, f)
}

/**
 * Filters and maps an Array with an effectful function
 */
export function filterMapIO_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => I.IO<R, E, Maybe<B>>
): I.IO<R, E, ReadonlyArray<B>> {
  return I.defer(() => {
    const ret: Array<B>               = []
    let computation: I.IO<R, E, void> = I.unit()
    for (let i = 0; i < as.length; i++) {
      const a     = as[i]
      computation = pipe(
        computation,
        I.chain(() => f(a)),
        I.map(
          M.match(constVoid, (b) => {
            ret.push(b)
          })
        )
      )
    }
    return I.asLazy_(computation, () => ret)
  })
}

/**
 * Filters and maps an Array with an effectful function
 */
export function filterMapIO<A, R, E, B>(
  f: (a: A) => I.IO<R, E, Maybe<B>>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => filterMapIO_(as, f)
}

/**
 * Performs an effectful left-associative fold over an Array
 */
export function foldlIO_<A, R, E, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return A.foldl_(as, I.succeed(b) as I.IO<R, E, B>, (acc, a) => I.chain_(acc, (b) => f(b, a)))
}

/**
 * Performs an effectful left-associative fold over an Array
 */
export function foldlIO<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: ReadonlyArray<A>) => I.IO<R, E, B> {
  return (as) => foldlIO_(as, b, f)
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumIO_<S, A, R, E, B>(
  as: ReadonlyArray<A>,
  s: S,
  f: (s: S, a: A) => I.IO<R, E, readonly [B, S]>
): I.IO<R, E, readonly [ReadonlyArray<B>, S]> {
  return I.defer(() => {
    let computation: I.IO<R, E, S> = I.succeed(s)
    const out: Array<B>            = Array(as.length)
    for (let i = 0; i < as.length; i++) {
      const v     = as[i]
      computation = I.chain_(computation, (state) =>
        I.map_(f(state, v), ([b, s2]) => {
          out[i] = b
          return s2
        })
      )
    }
    return I.map_(computation, (s) => [out, s])
  })
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumIO<S, A, R, E, B>(
  s: S,
  f: (s: S, a: A) => I.IO<R, E, readonly [B, S]>
): (as: ReadonlyArray<A>) => I.IO<R, E, readonly [ReadonlyArray<B>, S]> {
  return (as) => mapAccumIO_(as, s, f)
}

/**
 * Effectfully maps the elements of this Array.
 */
export function mapIO_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    A.ifoldl(I.succeed(Array(as.length)) as I.IO<R, E, Array<B>>, (index, computation, value) =>
      I.crossWith_(
        computation,
        I.defer(() => f(index, value)),
        (acc, b) => {
          acc[index] = b
          return acc
        }
      )
    )
  )
}

/**
 * Effectfully maps the elements of this Array.
 */
export function mapIO<A, R, E, B>(
  f: (i: number, a: A) => I.IO<R, E, B>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapIO_(as, f)
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapIOC_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> {
  return I.chain_(I.succeed<B[]>(Array(as.length)), (bs) => {
    function fn([n, a]: readonly [number, A]) {
      return I.chain_(
        I.defer(() => f(n, a)),
        (b) =>
          I.succeedLazy(() => {
            bs[n] = b
          })
      )
    }
    return I.chain_(I.foreachUnitC_(It.zipWithIndex(as), fn), () => I.succeedLazy(() => bs))
  })
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapIOC<A, R, E, B>(
  f: (i: number, a: A) => I.IO<R, E, B>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapIOC_(as, f)
}

/**
 * Takes elements of an Array while the effectful predicate holds
 */
export function takeWhileIO_<R, E, A>(
  as: ReadonlyArray<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.defer(() => {
    let taking          = I.succeed(true) as I.IO<R, E, boolean>
    const ret: Array<A> = []

    for (let i = 0; i < as.length; i++) {
      const a = as[i]
      taking  = pipe(
        taking,
        I.chain((t) => (t ? p(a) : I.succeed(false))),
        I.map((t) => {
          if (t) {
            ret.push(a)
            return true
          } else {
            return false
          }
        })
      )
    }
    return I.asLazy_(taking, () => ret)
  })
}

/**
 * Takes elements of an Array while the effectful predicate holds
 */
export function takeWhileIO<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => takeWhileIO_(as, p)
}
