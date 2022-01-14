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

import { IndexOutOfBoundsError, NoSuchElementError } from '../../Error'
import * as L from '../immutable/List'

export class ListBuffer<A> implements Iterable<A> {
  private first: L.List<A>             = L._Nil
  private last0: L.Cons<A> | undefined = undefined
  private len = 0;

  [Symbol.iterator](): Iterator<A> {
    return this.first[Symbol.iterator]()
  }

  get length(): number {
    return this.len
  }

  get isEmpty(): boolean {
    return this.len === 0
  }

  get unsafeHead(): A {
    if (this.isEmpty) {
      throw new NoSuchElementError('head on empty ListBuffer')
    }
    return (this.first as L.Cons<A>).head
  }

  get unsafeTail(): L.List<A> {
    if (this.isEmpty) {
      throw new NoSuchElementError('tail on empty ListBuffer')
    }
    return (this.first as L.Cons<A>).tail
  }

  append(elem: A): this {
    const last1 = new L.Cons(elem, L._Nil)
    if (this.len === 0) {
      this.first = last1
    } else {
      this.last0!.tail = last1
    }
    this.last0 = last1
    this.len  += 1
    return this
  }

  prepend(elem: A): this {
    this.insert(0, elem)
    return this
  }

  unprepend(): A {
    if (this.isEmpty) {
      throw new NoSuchElementError('unprepend on empty ListBuffer')
    }
    const h    = (this.first as L.Cons<A>).head
    this.first = (this.first as L.Cons<A>).tail
    this.len  -= 1
    return h
  }

  get toList(): L.List<A> {
    return this.first
  }

  insert(idx: number, elem: A): this {
    if (idx < 0 || idx > this.len) {
      throw new IndexOutOfBoundsError(`${idx} is out of bounds (min 0, max ${this.len - 1})`)
    }
    if (idx === this.len) {
      this.append(elem)
    } else {
      const p  = this.locate(idx)
      const nx = L.prepend_(this.getNext(p), elem)
      if (p === undefined) {
        this.first = nx
      } else {
        (p as L.Cons<A>).tail = nx
      }
      this.len += 1
    }
    return this
  }

  foldl<B>(b: B, f: (b: B, a: A) => B): B {
    return L.foldl_(this.first, b, f)
  }

  private getNext(p: L.List<A> | undefined): L.List<A> {
    if (p === undefined) {
      return this.first
    } else {
      return L.unsafeTail(p)
    }
  }

  private locate(i: number): L.List<A> | undefined {
    if (i === 0) {
      return undefined
    } else if (i === this.len) {
      return this.last0
    } else {
      let p = this.first
      for (let j = i - 1; j > 0; j--) {
        p = L.unsafeTail(p)
      }
      return p
    }
  }
}
