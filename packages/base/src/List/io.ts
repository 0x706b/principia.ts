import type { List } from './core'

import { pipe } from '../function'
import * as I from '../IO'
import * as L from './core'

export function mapM_<A, R, E, B>(l: List<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, List<B>> {
  return L.foldl_(l, I.succeed(L.emptyPushable<B>()) as I.IO<R, E, L.MutableList<B>>, (b, a) =>
    I.crossWith_(
      b,
      I.defer(() => f(a)),
      (acc, r) => {
        L.push(r, acc)
        return acc
      }
    )
  )
}

export function mapM<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (l: List<A>) => I.IO<R, E, List<B>> {
  return (l) => mapM_(l, f)
}

export function dropWhileM_<A, R, E>(l: List<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, List<A>> {
  return I.defer(() => {
    let dropping  = I.succeed(true) as I.IO<R, E, boolean>
    const newList = L.emptyPushable<A>()
    L.forEach_(l, (a) => {
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) {
            return true
          } else {
            L.push(a, newList)
            return false
          }
        })
      )
    })
    return I.asLazy_(dropping, () => newList)
  })
}

export function dropWhileM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (l: List<A>) => I.IO<R, E, List<A>> {
  return (l) => dropWhileM_(l, p)
}

export function filterM_<A, R, E>(l: List<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, List<A>> {
  return I.defer(() => {
    let r = I.succeed(L.emptyPushable<A>()) as I.IO<R, E, L.MutableList<A>>
    L.forEach_(l, (a) => {
      r = I.crossWith_(r, p(a), (l, b) => {
        if (b) {
          L.push(a, l)
        }
        return l
      })
    })
    return r
  })
}

export function filterM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (l: List<A>) => I.IO<R, E, List<A>> {
  return (l) => filterM_(l, p)
}
