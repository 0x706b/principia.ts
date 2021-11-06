import * as L from '../../List/core'
import * as M from '../../Maybe'

export class ImmutableQueue<A> implements Iterable<A> {
  constructor(private readonly backing: L.List<A>) {}

  push(a: A) {
    return new ImmutableQueue(L.append_(this.backing, a))
  }

  prepend(a: A) {
    return new ImmutableQueue(L.prepend_(this.backing, a))
  }

  get size() {
    return this.backing.length
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

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(L.filter_(this.backing, f))
  }

  static single<A>(a: A): ImmutableQueue<A> {
    return new ImmutableQueue(L.single(a))
  }

  [Symbol.iterator]() {
    return this.backing[Symbol.iterator]()
  }
}
