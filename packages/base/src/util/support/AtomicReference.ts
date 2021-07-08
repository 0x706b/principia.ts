/* eslint-disable functional/immutable-data */
export class AtomicReference<A> {
  private current: A
  constructor(readonly initial: A) {
    this.current = initial
  }

  get get() {
    return this.current
  }

  set(value: A) {
    this.current = value
  }

  compareAndSet(old: A, value: A) {
    if (this.get === old) {
      this.set(value)
      return true
    }
    return false
  }

  getAndSet(value: A) {
    const previous = this.current
    this.current   = value
    return previous
  }
}
