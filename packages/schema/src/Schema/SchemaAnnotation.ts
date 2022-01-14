import type { Equatable, Hashable } from '@principia/base/Structural'

import * as St from '@principia/base/Structural'
import { isObject } from '@principia/base/util/predicates'

export const SchemaAnnotationTypeId = Symbol()
export type SchemaAnnotationTypeId = typeof SchemaAnnotationTypeId

export class SchemaAnnotation<V> implements Hashable, Equatable {
  readonly _V!: () => V

  readonly [SchemaAnnotationTypeId]: SchemaAnnotationTypeId = SchemaAnnotationTypeId

  readonly tag: symbol = Symbol()

  constructor(readonly identifier: string, readonly initial: V, readonly combine: (v1: V, v2: V) => V) {}

  get [St.$hash](): number {
    return St.combineHash(St.hashString(this.identifier), St.hash(this.tag))
  }
  [St.$equals](that: unknown): boolean {
    return (
      isSchemaAnnotation(that) &&
      this.tag === that.tag &&
      this.identifier === that.identifier &&
      St.equals(this.initial, that.initial)
    )
  }
}

export function isSchemaAnnotation(u: unknown): u is SchemaAnnotation<unknown> {
  return isObject(u) && SchemaAnnotationTypeId in u
}
