import type { Predicate } from '../../prelude'

import * as L from '../../List/core'
import * as M from '../../Maybe'

export class ImmutableQueue<A> implements Iterable<A> {
  constructor(private readonly backing: L.List<A>) {}

  enqueue(a: A) {
    return new ImmutableQueue(L.append_(this.backing, a))
  }

  prepend(a: A) {
    return new ImmutableQueue(L.prepend_(this.backing, a))
  }

  get size() {
    return this.backing.length
  }

  get head(): M.Maybe<A> {
    return L.head(this.backing)
  }

  get tail(): ImmutableQueue<A> {
    return new ImmutableQueue(L.tail(this.backing))
  }

  dequeue() {
    if (L.isNonEmpty(this.backing)) {
      return M.just([L.unsafeHead(this.backing)!, new ImmutableQueue(L.tail(this.backing))] as const)
    } else {
      return M.nothing()
    }
  }

  find(f: (a: A) => boolean) {
    return L.findLast_(this.backing, f)
  }

  exists(f: Predicate<A>) {
    return M.isJust(this.find(f))
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(L.filter_(this.backing, f))
  }

  count(f: Predicate<A>) {
    return this.foldl(0, (b, a) => (f(a) ? b + 1 : b))
  }

  map<B>(f: (a: A) => B) {
    return new ImmutableQueue(L.map_(this.backing, f))
  }

  foldl<B>(b: B, f: (b: B, a: A) => B): B {
    return L.foldl_(this.backing, b, f)
  }

  static single<A>(a: A): ImmutableQueue<A> {
    return new ImmutableQueue(L.single(a))
  }

  static empty<A = never>(): ImmutableQueue<A> {
    return new ImmutableQueue(L.empty())
  }

  [Symbol.iterator]() {
    return this.backing[Symbol.iterator]()
  }
}
