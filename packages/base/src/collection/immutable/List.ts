/*
 * This file is ported from
 *
 * Scala (https://www.scala-lang.org)
 *
 * Copyright EPFL and Lightbend, Inc.
 *
 * Licensed under Apache License 2.0
 * (http://www.apache.org/licenses/LICENSE-2.0).
 *
 * See the doc/LICENSE.md file in the root of this source tree
 * for more information regarding copyright ownership
 */

import type { Predicate } from '../../prelude'

import { NoSuchElementError } from '../../Error'
import { unsafeCoerce } from '../../function'
import * as M from '../../Maybe'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export class Cons<A> implements Iterable<A> {
  readonly _tag = 'Cons'
  constructor(readonly head: A, public tail: List<A>) {}

  [Symbol.iterator](): Iterator<A> {
    let done = false
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let these: List<A> = this
    return {
      next() {
        if (done) {
          return this.return!()
        }
        if (isEmpty(these)) {
          done = true
          return this.return!()
        }
        const value: A = these.head
        these          = these.tail
        return { done, value }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
        }
        return { done: true, value }
      }
    }
  }
}

export class Nil implements Iterable<never> {
  readonly _tag = 'Nil';
  [Symbol.iterator](): Iterator<never> {
    return {
      next() {
        return { done: true, value: undefined }
      }
    }
  }
}

export const _Nil = new Nil()

export type List<A> = Cons<A> | Nil

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function nil<A>(): List<A> {
  return _Nil
}

export function cons<A>(head: A, tail: List<A> = nil()): List<A> {
  return new Cons(head, tail)
}

export function from<A>(prefix: Iterable<A>): List<A> {
  const iter = prefix[Symbol.iterator]()
  let a: IteratorResult<A>
  if (!(a = iter.next()).done) {
    const result = new Cons(a.value, _Nil)
    let curr     = result
    while (!(a = iter.next()).done) {
      const temp = new Cons(a.value, _Nil)
      curr.tail  = temp
      curr       = temp
    }
    return result
  } else {
    return _Nil
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(list: List<A>): list is Nil {
  return list._tag === 'Nil'
}

export function isNonEmpty<A>(list: List<A>): list is Cons<A> {
  return list._tag === 'Cons'
}

/*
 * -------------------------------------------------------------------------------------------------
 * operations
 * -------------------------------------------------------------------------------------------------
 */

export function prepend_<A, B>(list: List<A>, elem: B): List<A | B> {
  return new Cons<A | B>(elem, list)
}

/**
 * @dataFirst prepend_
 */
export function prepend<B>(elem: B): <A>(list: List<A>) => List<A | B> {
  return (list) => prepend_(list, elem)
}

export function prependAll_<A, B>(list: List<A>, prefix: List<B>): List<A | B> {
  if (isEmpty(list)) {
    return prefix
  } else if (isEmpty(prefix)) {
    return list
  } else {
    const result = new Cons<A | B>(prefix.head, list)
    let curr     = result
    let that     = prefix.tail
    while (!isEmpty(that)) {
      const temp = new Cons<A | B>(that.head, list)
      curr.tail  = temp
      curr       = temp
      that       = that.tail
    }
    return result
  }
}

/**
 * @dataFirst prependAll_
 */
export function prependAll<B>(prefix: List<B>): <A>(list: List<A>) => List<A | B> {
  return (list) => prependAll_(list, prefix)
}

export function length<A>(list: List<A>): number {
  let these = list
  let len   = 0
  while (!isEmpty(these)) {
    len  += 1
    these = these.tail
  }
  return len
}

export function reverse<A>(list: List<A>): List<A> {
  let result: List<A> = nil()
  let these           = list
  while (!isEmpty(these)) {
    result = prepend_(result, these.head)
    these  = these.tail
  }
  return result
}

export function unsafeHead<A>(list: List<A>): A {
  if (isEmpty(list)) {
    throw new NoSuchElementError('unsafeHead on empty List')
  }
  return list.head
}

export function head<A>(list: List<A>): M.Maybe<A> {
  if (isEmpty(list)) {
    return M.nothing()
  }
  return M.just(list.head)
}

export function unsafeLast<A>(list: List<A>): A {
  if (isEmpty(list)) {
    throw new NoSuchElementError('unsafeLast on empty List')
  }
  let these = list
  let scout = list.tail
  while (!isEmpty(scout)) {
    these = scout
    scout = scout.tail
  }
  return these.head
}

export function unsafeTail<A>(list: List<A>): List<A> {
  if (isEmpty(list)) {
    throw new NoSuchElementError('unsafeTail on empty List')
  }
  return list.tail
}

export function tail<A>(list: List<A>): M.Maybe<List<A>> {
  return isEmpty(list) ? M.nothing() : M.just(unsafeTail(list))
}

export function forEach_<A, U>(list: List<A>, f: (a: A) => U): void {
  let these = list
  while (!isEmpty(these)) {
    f(these.head)
    these = these.tail
  }
}

/**
 * @dataFirst forEach_
 */
export function forEach<A, U>(f: (a: A) => U): (list: List<A>) => void {
  return (list) => forEach_(list, f)
}

export function concat_<A, B>(xs: List<A>, ys: List<B>): List<A | B> {
  return prependAll_(ys, xs)
}

/**
 * @dataFirst concat_
 */
export function concat<B>(ys: List<B>): <A>(xs: List<A>) => List<A | B> {
  return (xs) => concat_(xs, ys)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: List<A>, f: (a: A) => B): List<B> {
  if (isEmpty(fa)) {
    return fa
  } else {
    const h        = new Cons(f(fa.head), _Nil)
    let t: Cons<B> = h
    let rest       = fa.tail
    while (!isEmpty(rest)) {
      const nx = new Cons(f(rest.head), _Nil)
      t.tail   = nx
      t        = nx
      rest     = rest.tail
    }
    return h
  }
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: List<A>) => List<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function exists_<A>(list: List<A>, p: Predicate<A>): boolean {
  let these = list
  while (!isEmpty(these)) {
    if (p(these.head)) {
      return true
    }
    these = these.tail
  }
  return false
}

/**
 * @dataFirst exists_
 */
export function exists<A>(p: Predicate<A>): (list: List<A>) => boolean {
  return (list) => exists_(list, p)
}

export function find_<A>(list: List<A>, p: Predicate<A>): M.Maybe<A> {
  let these = list
  while (!isEmpty(these)) {
    if (p(these.head)) {
      return M.just(these.head)
    }
    these = these.tail
  }
  return M.nothing()
}

/**
 * @dataFirst find_
 */
export function find<A>(p: Predicate<A>): (list: List<A>) => M.Maybe<A> {
  return (list) => find_(list, p)
}

export function foldl_<A, B>(fa: List<A>, b: B, f: (b: B, a: A) => B): B {
  let acc   = b
  let these = fa
  while (!isEmpty(these)) {
    acc   = f(acc, these.head)
    these = these.tail
  }
  return acc
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: List<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function take_<A>(list: List<A>, n: number): List<A> {
  if (isEmpty(list) || n <= 0) {
    return _Nil
  } else {
    const h  = new Cons(list.head, _Nil)
    let t    = h
    let rest = list.tail
    let i    = 1
    while (i < n) {
      if (isEmpty(rest)) {
        return list
      }
      i       += 1
      const nx = new Cons(rest.head, _Nil)
      t.tail   = nx
      t        = nx
      rest     = rest.tail
    }
    return h
  }
}

/**
 * @dataFirst take_
 */
export function take(n: number): <A>(list: List<A>) => List<A> {
  return (list) => take_(list, n)
}

/*
 * -------------------------------------------------------------------------------------------------
 * filter
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A>(list: List<A>, p: Predicate<A>): List<A> {
  return filterCommon_(list, p, false)
}

/**
 * @dataFirst filter_
 */
export function filter<A>(p: Predicate<A>): (list: List<A>) => List<A> {
  return (list) => filter_(list, p)
}

function noneIn<A>(l: List<A>, p: Predicate<A>, isFlipped: boolean): List<A> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (isEmpty(l)) {
      return nil()
    } else {
      if (p(l.head) !== isFlipped) {
        return allIn(l, l.tail, p, isFlipped)
      } else {
        // eslint-disable-next-line no-param-reassign
        l = l.tail
      }
    }
  }
}

function allIn<A>(start: List<A>, remaining: List<A>, p: Predicate<A>, isFlipped: boolean): List<A> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (isEmpty(remaining)) {
      return start
    } else {
      if (p(remaining.head) !== isFlipped) {
        // eslint-disable-next-line no-param-reassign
        remaining = remaining.tail
      } else {
        return partialFill(start, remaining, p, isFlipped)
      }
    }
  }
}

function partialFill<A>(origStart: List<A>, firstMiss: List<A>, p: Predicate<A>, isFlipped: boolean): List<A> {
  const newHead   = new Cons(unsafeHead(origStart), _Nil)
  let toProcess   = unsafeTail(origStart) as Cons<A>
  let currentLast = newHead

  while (!(toProcess === firstMiss)) {
    const newElem    = cons(unsafeHead(toProcess))
    currentLast.tail = newElem
    currentLast      = unsafeCoerce(newElem)
    toProcess        = unsafeCoerce(toProcess.tail)
  }

  let next                = firstMiss.tail
  let nextToCopy: Cons<A> = unsafeCoerce(next)
  while (!isEmpty(next)) {
    const head = unsafeHead(next)
    if (p(head) !== isFlipped) {
      next = next.tail
    } else {
      while (!(nextToCopy === next)) {
        const newElem    = new Cons(unsafeHead(nextToCopy), _Nil)
        currentLast.tail = newElem
        currentLast      = newElem
        nextToCopy       = unsafeCoerce(nextToCopy.tail)
      }
      nextToCopy = unsafeCoerce(next.tail)
      next       = next.tail
    }
  }

  if (!isEmpty(nextToCopy)) {
    currentLast.tail = nextToCopy
  }

  return newHead
}

function filterCommon_<A>(list: List<A>, p: Predicate<A>, isFlipped: boolean): List<A> {
  return noneIn(list, p, isFlipped)
}