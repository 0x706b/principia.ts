import type { Vector } from './core'

import { pipe } from '../../../function'
import * as I from '../../../IO'
import * as M from '../../../Maybe'
import * as V from './core'

export function mapIO_<A, R, E, B>(l: Vector<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Vector<B>> {
  return V.foldl_(l, I.succeed(V.emptyPushable<B>()) as I.IO<R, E, V.MutableVector<B>>, (b, a) =>
    I.crossWith_(
      b,
      I.defer(() => f(a)),
      (acc, r) => {
        V.push(r, acc)
        return acc
      }
    )
  )
}

export function mapIO<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (l: Vector<A>) => I.IO<R, E, Vector<B>> {
  return (l) => mapIO_(l, f)
}

export function dropWhileIO_<A, R, E>(l: Vector<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Vector<A>> {
  return I.defer(() => {
    let dropping  = I.succeed(true) as I.IO<R, E, boolean>
    const newList = V.emptyPushable<A>()
    V.forEach_(l, (a) => {
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) {
            return true
          } else {
            V.push(a, newList)
            return false
          }
        })
      )
    })
    return I.asLazy_(dropping, () => newList)
  })
}

export function dropWhileIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (l: Vector<A>) => I.IO<R, E, Vector<A>> {
  return (l) => dropWhileIO_(l, p)
}

export function takeWhileIO_<A, R, E>(l: Vector<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Vector<A>> {
  return I.defer(() => {
    let taking: I.IO<R, E, boolean> = I.succeed(true)
    const out = V.emptyPushable<A>()
    V.forEach_(l, (a) => {
      taking = I.chain_(taking, (b) =>
        I.map_(b ? p(a) : I.succeed(false), (b1) => {
          if (b1) {
            V.push(a, out)
            return true
          } else {
            return false
          }
        })
      )
    })
    return I.asLazy_(taking, () => out)
  })
}

export function takeWhileIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (l: Vector<A>) => I.IO<R, E, Vector<A>> {
  return (l) => takeWhileIO_(l, p)
}

function findIOLoop<R, E, A>(iterator: Iterator<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, M.Maybe<A>> {
  let r = iterator.next()
  if (!r.done) {
    return I.chain_(f(r.value), (b) => (b ? I.succeed(M.just(r.value)) : findIOLoop(iterator, f)))
  } else {
    return I.succeed(M.nothing())
  }
}

export function findIO_<R, E, A>(l: Vector<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, M.Maybe<A>> {
  return findIOLoop(l[Symbol.iterator](), f)
}

export function findIO<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (l: Vector<A>) => I.IO<R, E, M.Maybe<A>> {
  return (l) => findIO_(l, f)
}

export function filterIO_<A, R, E>(l: Vector<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Vector<A>> {
  return I.defer(() => {
    let r = I.succeed(V.emptyPushable<A>()) as I.IO<R, E, V.MutableVector<A>>
    V.forEach_(l, (a) => {
      r = I.crossWith_(r, p(a), (l, b) => {
        if (b) {
          V.push(a, l)
        }
        return l
      })
    })
    return r
  })
}

export function filterIO<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (l: Vector<A>) => I.IO<R, E, Vector<A>> {
  return (l) => filterIO_(l, p)
}
