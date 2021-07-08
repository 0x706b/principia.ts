/* eslint-disable functional/immutable-data */
export class LinkedListNode<A> {
  constructor(public value: A, public next: LinkedListNode<A> | null = null) {}
}

export class LinkedList<A> {
  constructor(public head: LinkedListNode<A> | null = null) {}

  get empty() {
    return this.head === null
  }

  prepend(value: A): void {
    const node = new LinkedListNode(value)
    if(!this.head) {
      this.head = node
    } else {
      node.next = this.head
      this.head = node
    }
  }

  unprepend(): A | null {
    if(!this.head) {
      return null
    }
    const h = this.head
    if(this.head.next) {
      this.head = this.head.next
    } else {
      this.head = null
    }
    return h.value
  }

  foldl<B>(b: B, f: (b: B, a: A) => B): B {
    let h   = this.head
    let acc = b
    while(h) {
      acc = f(acc, h.value)
      h   = h.next
    }
    return acc
  }
}