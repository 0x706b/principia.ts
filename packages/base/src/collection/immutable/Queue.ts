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
import * as M from '../../Maybe'
import * as Iter from '../Iterable'
import * as L from './List'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export class Queue<A> implements Iterable<A> {
  constructor(
    /* @internal */
    public _in: L.List<A>,
    /* @internal */
    public _out: L.List<A>
  ) {}

  [Symbol.iterator]() {
    return Iter.concat_(this._in, L.reverse(this._out))[Symbol.iterator]()
  }
}

const EmptyQueue: Queue<never> = new Queue(L._Nil, L._Nil)

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function empty<A>(): Queue<A> {
  return EmptyQueue
}

export function single<A>(a: A): Queue<A> {
  return new Queue(L._Nil, L.cons(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(queue: Queue<A>): boolean {
  return L.isEmpty(queue._in) && L.isEmpty(queue._out)
}

/*
 * -------------------------------------------------------------------------------------------------
 * operations
 * -------------------------------------------------------------------------------------------------
 */

export function length<A>(queue: Queue<A>): number {
  return L.length(queue._in) + L.length(queue._out)
}

export function unsafeHead<A>(queue: Queue<A>): A {
  if (L.isNonEmpty(queue._out)) {
    return L.unsafeHead(queue._out)
  } else if (L.isNonEmpty(queue._in)) {
    return L.unsafeLast(queue._in)
  } else {
    throw new NoSuchElementError('unsafeHead on empty Queue')
  }
}

export function head<A>(queue: Queue<A>): M.Maybe<A> {
  return isEmpty(queue) ? M.nothing() : M.just(unsafeHead(queue))
}

export function unsafeTail<A>(queue: Queue<A>): Queue<A> {
  if (L.isNonEmpty(queue._out)) {
    return new Queue(queue._in, queue._out.tail)
  } else if (L.isNonEmpty(queue._in)) {
    return new Queue(L.nil(), L.unsafeTail(L.reverse(queue._in)))
  } else {
    throw new NoSuchElementError('tail on empty Queue')
  }
}

export function tail<A>(queue: Queue<A>): M.Maybe<Queue<A>> {
  return isEmpty(queue) ? M.nothing() : M.just(unsafeTail(queue))
}

export function prepend_<A, B>(queue: Queue<A>, elem: B): Queue<A | B> {
  return new Queue(queue._in, L.prepend_(queue._out, elem))
}

/**
 * @dataFirst prepend_
 */
export function prepend<B>(elem: B): <A>(queue: Queue<A>) => Queue<A | B> {
  return (queue) => prepend_(queue, elem)
}

export function enqueue_<A, B>(queue: Queue<A>, elem: B): Queue<A | B> {
  return new Queue(L.prepend_(queue._in, elem), queue._out)
}

/**
 * @dataFirst enqueue_
 */
export function enqueue<B>(elem: B): <A>(queue: Queue<A>) => Queue<A | B> {
  return (queue) => enqueue_(queue, elem)
}

export function unasfeDequeue<A>(queue: Queue<A>): readonly [A, Queue<A>] {
  if (L.isEmpty(queue._out) && L.isNonEmpty(queue._in)) {
    const rev = L.reverse(queue._in)
    return [L.unsafeHead(rev), new Queue(L.nil(), L.unsafeTail(rev))]
  } else if (L.isNonEmpty(queue._out)) {
    return [L.unsafeHead(queue._out), new Queue(queue._in, L.unsafeTail(queue._out))]
  } else {
    throw new NoSuchElementError('unsafeDequeue on empty Queue')
  }
}

export function dequeue<A>(queue: Queue<A>): M.Maybe<readonly [A, Queue<A>]> {
  if (isEmpty(queue)) {
    return M.nothing()
  }
  return M.just(unasfeDequeue(queue))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Queue<A>, f: (a: A) => B): Queue<B> {
  return new Queue(L.map_(fa._in, f), L.map_(fa._out, f))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Queue<A>) => Queue<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: Queue<A>, b: B, f: (b: B, a: A) => B): B {
  let acc   = b
  let these = fa
  while (!isEmpty(these)) {
    acc   = f(acc, unsafeHead(these))
    these = unsafeTail(these)
  }
  return acc
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Queue<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function exists_<A>(queue: Queue<A>, p: Predicate<A>): boolean {
  return L.exists_(queue._in, p) || L.exists_(queue._out, p)
}

/**
 * @dataFirst exists_
 */
export function exists<A>(p: Predicate<A>): (queue: Queue<A>) => boolean {
  return (queue) => exists_(queue, p)
}

export function find_<A>(queue: Queue<A>, p: Predicate<A>): M.Maybe<A> {
  let these = queue
  while (!isEmpty(these)) {
    let head = unsafeHead(these)
    if (p(head)) {
      return M.just(head)
    }
    these = unsafeTail(these)
  }
  return M.nothing()
}

/**
 * @dataFirst find_
 */
export function find<A>(p: Predicate<A>): (queue: Queue<A>) => M.Maybe<A> {
  return (queue) => find_(queue, p)
}

export function filter_<A>(queue: Queue<A>, p: Predicate<A>): Queue<A> {
  return new Queue(L.filter_(queue._in, p), L.filter_(queue._out, p))
}

/**
 * @dataFirst filter_
 */
export function filter<A>(p: Predicate<A>): (queue: Queue<A>) => Queue<A> {
  return (queue) => filter_(queue, p)
}

export function count_<A>(queue: Queue<A>, p: Predicate<A>): number {
  return foldl_(queue, 0, (b, a) => (p(a) ? b + 1 : b))
}

/**
 * @dataFirst count_
 */
export function count<A>(p: Predicate<A>): (queue: Queue<A>) => number {
  return (queue) => count_(queue, p)
}
