import type { MutableNonEmptyArray, NonEmptyArray } from '../NonEmptyArray'
import type { Mutable } from '../prelude'

export function appendW_<A, B>(init: ReadonlyArray<A>, last: B): NonEmptyArray<A | B> {
  const len = init.length
  // perf: return [...init, last]
  const r = Array(len + 1) as MutableNonEmptyArray<A | B>
  r[len]  = last
  for (let i = 0; i < len; i++) {
    r[i] = init[i]
  }
  return r
}

export function ifoldl_<A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, b: B, a: A) => B): B {
  const len = fa.length
  let r     = b
  for (let i = 0; i < len; i++) {
    r = f(i, r, fa[i])
  }
  return r
}

export function ifoldr_<A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, a: A, b: B) => B): B {
  let r = b
  for (let i = fa.length - 1; i >= 0; i--) {
    r = f(i, fa[i], r)
  }
  return r
}

export function isNonEmpty<A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> {
  return as.length > 0
}

export function isOutOfBound_<A>(as: ReadonlyArray<A>, i: number): boolean {
  return i < 0 || i >= as.length
}

export function makeBy<A>(n: number, f: (i: number) => A): NonEmptyArray<A> {
  const j   = Math.max(0, Math.floor(n))
  const out = [f(0)] as Mutable<NonEmptyArray<A>>
  for (let i = 1; i < j; i++) {
    out.push(f(i))
  }
  return out
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function prependW_<A, B>(tail: ReadonlyArray<A>, head: B): NonEmptyArray<A | B> {
  const len = tail.length
  // perf: const out = [head]
  const out = Array(len + 1) as MutableNonEmptyArray<A | B>
  out[0]    = head
  for (let i = 0; i < len; i++) {
    out[i + 1] = tail[i]
  }
  return out
}
