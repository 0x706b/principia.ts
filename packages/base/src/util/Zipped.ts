import { isObject } from './predicates'

export const ZippedTypeId = Symbol.for('@principia/base/Zipped')
export type ZippedTypeId = typeof ZippedTypeId

export class Zipped<A extends ReadonlyArray<unknown>> implements Iterable<A[number]> {
  readonly _typeId: ZippedTypeId = ZippedTypeId
  constructor(readonly array: A) {}
  [Symbol.iterator]() {
    return this.array[Symbol.iterator]()
  }
}

export function isZipped(u: unknown): u is Zipped<any> {
  return isObject(u) && '_typeId' in u && u['_typeId'] === ZippedTypeId
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
