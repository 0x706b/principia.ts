/* eslint-disable functional/immutable-data */
export class MutableStack<A> {
  private array: Array<any> = Array(13)
  private size              = 0
  private nesting           = 0

  constructor(a?: A) {
    if (a) {
      this.push(a)
    }
  }

  push(value: A): void {
    if (this.size === 13) {
      this.array    = [this.array, value, null, null, null, null, null, null, null, null, null, null, null]
      this.size     = 2
      this.nesting += 1
    } else {
      this.array[this.size] = value
      this.size            += 1
    }
  }
  pop(): A | null {
    if (this.size <= 0) {
      return null
    } else {
      const idx = this.size - 1
      let a     = this.array[idx]
      if (idx === 0 && this.nesting > 0) {
        this.array     = a as any
        a              = this.array[12]
        this.array[12] = null
        this.size      = 12
        this.nesting  -= 1
      } else {
        this.array[idx] = null
        this.size       = idx
      }
      return a
    }
  }
  peek(): A | null {
    if (this.size <= 0) {
      return null
    } else {
      const idx = this.size - 1
      let a     = this.array[idx]
      if (idx === 0 && this.nesting > 0) {
        a = a[12]
      }
      return a
    }
  }
  peekOrElse(a: A): A {
    return this.size <= 0 ? a : (this.peek() as A)
  }
  get isEmpty(): boolean {
    return this.size === 0
  }
}
