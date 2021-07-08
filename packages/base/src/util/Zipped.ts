import { isObject } from './predicates'

export const ZippedTypeId = Symbol()
export type ZippedTypeId = typeof ZippedTypeId

export class Zipped<A extends ReadonlyArray<unknown>> implements Iterable<A[number]> {
  declare readonly [ZippedTypeId]: ZippedTypeId
  constructor(readonly array: A) {
    this[ZippedTypeId] = ZippedTypeId
  }
  [Symbol.iterator]() {
    return this.array[Symbol.iterator]()
  }
}

export function isZipped(_: unknown): _ is Zipped<any> {
  return isObject(_) && ZippedTypeId in _
}

export function zip<A, B>(a: A, b: B): Zip<A, B> {
  // @ts-expect-error
  return isZipped(a)
    ? isZipped(b)
      ? new Zipped([...a, ...b])
      : new Zipped([...a, b])
    : isZipped(b)
    ? new Zipped([a, ...b])
    : new Zipped([a, b])
}

export type Zip<A, B> = A extends Zipped<infer X1>
  ? B extends Zipped<infer X2>
    ? Zipped<readonly [...X1, ...X2]>
    : Zipped<readonly [...X1, B]>
  : B extends Zipped<infer X2>
  ? Zipped<readonly [A, ...X2]>
  : Zipped<readonly [A, B]>
