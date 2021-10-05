import * as A from '../../Array/core'
import * as M from '../../Maybe'
import * as NA from '../../NonEmptyArray'

export class ImmutableQueue<A> {
  constructor(private readonly backing: readonly A[]) {}

  push(a: A) {
    return new ImmutableQueue([...this.backing, a])
  }

  prepend(a: A) {
    return new ImmutableQueue([a, ...this.backing])
  }

  get size() {
    return this.backing.length
  }

  dequeue() {
    if (A.isNonEmpty(this.backing)) {
      return M.just([NA.head(this.backing), new ImmutableQueue(NA.tail(this.backing))] as const)
    } else {
      return M.nothing()
    }
  }

  find(f: (a: A) => boolean) {
    return A.findLast(f)(this.backing)
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(A.filter(f)(this.backing))
  }
}
