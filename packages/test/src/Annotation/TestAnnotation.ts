import type { Either } from '@principia/base/Either'
import type * as Fiber from '@principia/base/Fiber'
import type { Tag } from '@principia/base/Has'
import type { URef } from '@principia/base/Ref'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { absurd } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as Set from '@principia/base/HashSet'
import { isObject } from '@principia/base/prelude'
import * as St from '@principia/base/Structural'

export const TestAnnotationTypeId = Symbol()
export type TestAnnotationTypeId = typeof TestAnnotationTypeId

export class TestAnnotation<V> {
  readonly _V!: () => V;

  readonly [TestAnnotationTypeId]: TestAnnotationTypeId = TestAnnotationTypeId

  constructor(
    readonly tag: Tag<V>,
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (v1: V, v2: V) => V
  ) {}

  get [St.$hash](): number {
    return St.combineHash(St.hashString(this.identifier), St.hash(this.tag))
  }

  [St.$equals](that: unknown): boolean {
    return (
      isTestAnnotation(that) &&
      this.tag.key === that.tag.key &&
      this.identifier === that.identifier &&
      St.equals(this.initial, that.initial)
    )
  }
}

export function isTestAnnotation(u: unknown): u is TestAnnotation<unknown> {
  return isObject(u) && TestAnnotationTypeId in u
}

export const Ignored = tag<number>()

export const ignored: TestAnnotation<number> = new TestAnnotation(Ignored, 'ignored', 0, (x, y) => x + y)

export const Repeated = tag<number>()

export const repeated: TestAnnotation<number> = new TestAnnotation(Repeated, 'repeated', 0, (x, y) => x + y)

export const Retried = tag<number>()

export const retried: TestAnnotation<number> = new TestAnnotation(Retried, 'retried', 0, (x, y) => x + y)

export const Tagged = tag<Set.HashSet<string>>()

export const tagged: TestAnnotation<Set.HashSet<string>> = new TestAnnotation(
  Tagged,
  'tagged',
  Set.makeDefault(),
  Set.union_
)

export const Timing = tag<number>()

export const timing: TestAnnotation<number> = new TestAnnotation(Timing, 'timing', 0, (x, y) => x + y)

export const Fibers = tag<Either<number, ReadonlyArray<URef<Set.HashSet<Fiber.RuntimeFiber<any, any>>>>>>()

export const fibers: TestAnnotation<Either<number, ReadonlyArray<URef<Set.HashSet<Fiber.RuntimeFiber<any, any>>>>>> =
  new TestAnnotation(Fibers, 'fibers', E.left(0), compose_)

function compose_<A>(
  left: Either<number, ReadonlyArray<A>>,
  right: Either<number, ReadonlyArray<A>>
): Either<number, ReadonlyArray<A>> {
  return E.isLeft(left)
    ? E.isLeft(right)
      ? E.left(left.left + right.left)
      : right
    : E.isRight(left)
    ? E.isRight(right)
      ? E.right(A.concat_(left.right, right.right))
      : right
    : absurd(undefined as never)
}
