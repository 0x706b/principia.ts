/* eslint-disable functional/immutable-data */
export class OneShot<A> {
  private value: A | undefined = undefined

  isSet(): boolean {
    return this.value != null
  }

  set(v: A) {
    if (v == null) {
      throw new Error('Defect: OneShot variable cannot be set to null value')
    }
    if (this.value != null) {
      throw new Error('Defect: OneShot variable cannot be set twice')
    }
    this.value = v
  }

  get(): A {
    if (this.value == null) {
      throw new Error('Defect: OneShot variable not set')
    }
    return this.value
  }
}
