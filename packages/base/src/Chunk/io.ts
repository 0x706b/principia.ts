/* eslint-disable functional/immutable-data */
import type { Chunk, ChunkBuilder } from './core'

import { identity, pipe } from '../function'
import * as I from '../IO'
import * as O from '../Option'
import * as C from './core'

/*
 * -------------------------------------------------------------------------------------------------
 * io combinators
 * -------------------------------------------------------------------------------------------------
 */

export function mapIO_<A, R, E, B>(as: Chunk<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return I.defer(() => {
    const out = C.builder<B>()
    return pipe(
      as,
      I.foreachUnit((a) =>
        I.map_(f(a), (b) => {
          out.append(b)
        })
      ),
      I.asLazy(() => out.result())
    )
  })
}

export function mapIO<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => mapIO_(as, f)
}

export function mapIOPar_<A, R, E, B>(as: Chunk<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return I.chain_(I.succeed<B[]>(Array(as.length)), (mut_bs) => {
    function fn([a, n]: readonly [A, number]) {
      return I.chain_(
        I.defer(() => f(a)),
        (b) =>
          I.succeedLazy(() => {
            mut_bs[n] = b
          })
      )
    }
    return I.chain_(I.foreachUnitPar_(C.zipWithIndex(as), fn), () => I.succeedLazy(() => C.from(mut_bs)))
  })
}

export function mapIOPar<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => mapIOPar_(as, f)
}

export function collectAllIO<R, E, A>(as: Chunk<I.IO<R, E, A>>): I.IO<R, E, Chunk<A>> {
  return mapIO_(as, identity)
}

function findIOLoop_<R, E, A>(
  iterator: Iterator<ArrayLike<A>>,
  f: (a: A) => I.IO<R, E, boolean>,
  array: ArrayLike<A>,
  i: number,
  length: number
): I.IO<R, E, O.Option<A>> {
  if (i < length) {
    const a = array[i]
    return f(a)['>>=']((b) => (b ? I.succeed(O.some(a)) : findIOLoop_(iterator, f, array, i + 1, length)))
  }
  let result
  if (!(result = iterator.next()).done) {
    const arr = result.value
    const len = arr.length
    return findIOLoop_(iterator, f, arr, 0, len)
  }
  return I.succeed(O.none())
}

export function findIO_<R, E, A>(as: Chunk<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, O.Option<A>> {
  C.concrete(as)
  const iterator = as.arrayIterator()
  let result
  if (!(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    return findIOLoop_(iterator, f, array, 0, length)
  } else {
    return I.succeed(O.none())
  }
}

export function findIO<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, O.Option<A>> {
  return (as) => findIO_(as, f)
}

export function foldlIO_<A, R, E, B>(as: Chunk<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return C.foldl_(as, I.succeed(b) as I.IO<R, E, B>, (acc, a) => I.chain_(acc, (b) => f(b, a)))
}

export function foldlIO<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, B> {
  return (as) => foldlIO_(as, b, f)
}

export function takeWhileIO_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.defer(() => {
    C.concrete(as)
    let taking: I.IO<R, E, boolean> = I.succeed(true)
    const out                       = C.builder<A>()
    const iterator                  = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const j = i
        taking  = I.chain_(taking, (b) => {
          const a = array[j]
          return I.map_(b ? p(a) : I.succeed(false), (b1) => {
            if (b1) {
              out.append(a)
              return true
            } else {
              return false
            }
          })
        })
      }
    }
    return I.asLazy_(taking, () => out.result())
  })
}

export function takeWhileIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => takeWhileIO_(as, p)
}

export function dropWhileIO_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.defer(() => {
    C.concrete(as)
    let dropping: I.IO<R, E, boolean> = I.succeed(true)
    const out                         = C.builder<A>()
    const iterator                    = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const j  = i
        dropping = I.chain_(dropping, (d) => {
          const a = array[j]
          return I.map_(d ? p(a) : I.succeed(false), (b) => {
            if (b) {
              return true
            } else {
              out.append(a)
              return false
            }
          })
        })
      }
    }
    return I.asLazy_(dropping, () => out.result())
  })
}

export function dropWhileIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => dropWhileIO_(as, p)
}

export function filterIO_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.defer(() => {
    C.concrete(as)
    const c                              = C.builder<A>()
    let out: I.IO<R, E, ChunkBuilder<A>> = I.succeed(c)
    const iterator                       = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const a = array[i]
        out     = I.crossWith_(out, p(a), (chunk, res) => {
          if (res) {
            return chunk.append(a)
          } else {
            return chunk
          }
        })
      }
    }
    return I.map_(out, (b) => b.result())
  })
}

export function filterIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => filterIO_(as, p)
}
