import { pipe } from '../function'
import * as I from '../IO'
import { tuple } from '../prelude'
import * as A from './core'

/**
 * Effectfully maps the elements of this Array.
 */
export function mapIO_<A, R, E, B>(as: ReadonlyArray<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    A.foldl(I.succeed([0, Array(as.length)]) as I.IO<R, E, readonly [number, Array<B>]>, (b, a) =>
      I.crossWith_(
        b,
        I.defer(() => f(a)),
        ([i, mut_acc], b) => {
          mut_acc[i] = b
          return tuple(i + 1, mut_acc)
        }
      )
    ),
    I.map(([, bs]) => bs)
  )
}

/**
 * Effectfully maps the elements of this Array.
 */
export function mapIO<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapIO_(as, f)
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapIOPar_<A, R, E, B>(as: ReadonlyArray<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, ReadonlyArray<B>> {
  return I.chain_(I.succeed<B[]>(Array(as.length)), (mut_bs) => {
    function fn([a, n]: [A, number]) {
      return I.chain_(
        I.defer(() => f(a)),
        (b) =>
          I.succeedLazy(() => {
            mut_bs[n] = b
          })
      )
    }
    return I.chain_(
      I.foreachUnitPar_(
        A.imap_(as, (n, a) => [a, n] as [A, number]),
        fn
      ),
      () => I.succeedLazy(() => mut_bs)
    )
  })
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapIOPar<A, R, E, B>(
  f: (a: A) => I.IO<R, E, B>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapIOPar_(as, f)
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
    let dest: I.IO<R, E, S> = I.succeed(s)
    const mut_out: Array<B> = Array(as.length)
    for (let i = 0; i < as.length; i++) {
      const v = as[i]
      dest    = I.chain_(dest, (state) =>
        I.map_(f(state, v), ([b, s2]) => {
          mut_out[i] = b
          return s2
        })
      )
    }
    return I.map_(dest, (s) => [mut_out, s])
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

export function dropWhileIO<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => dropWhileIO_(as, p)
}

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

export function takeWhileIO<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => takeWhileIO_(as, p)
}

export function foldlIO_<A, R, E, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return A.foldl_(as, I.succeed(b) as I.IO<R, E, B>, (acc, a) => I.chain_(acc, (b) => f(b, a)))
}

export function foldlIO<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: ReadonlyArray<A>) => I.IO<R, E, B> {
  return (as) => foldlIO_(as, b, f)
}
