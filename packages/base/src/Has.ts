// tracing: off

/**
 * Originally ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Has.scala
 * by Michael Arnaldi and the Matechs Garage Contributors
 *
 * Copyright 2017-2020 John A. De Goes and the ZIO Contributors
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

import type { Option } from './internal/Option'

import { fromNullable, none } from './internal/Option'
import { isObject } from './prelude'

/**
 * URI used in Has
 */
export declare const HasURI: unique symbol

/**
 * Has signal presence of a specific service provided via Tag in the environment
 */
export interface Has<T> {
  [HasURI]: {
    _T: () => T
  }
}

/**
 * Extract the type of a class constructor
 */
export type ConstructorType<K extends Constructor<any>> = K extends {
  prototype: infer T
}
  ? T
  : never

export type Constructor<T> = Function & { prototype: T }

export const TagTypeId = Symbol('@principia/base/Has/Tag')
export type TagTypeId = typeof TagTypeId

/**
 * Tag Encodes capabilities of reading and writing a service T into a generic environment
 */
export class Tag<T> {
  readonly [TagTypeId]: TagTypeId = TagTypeId
  readonly _T!: T
  constructor(readonly def: boolean = false, readonly key: PropertyKey = Symbol()) {}
  readonly overridable = (): Tag<T> => new Tag(true, this.key)
  readonly fixed       = (): Tag<T> => new Tag(false, this.key)
  readonly refine      = <T1 extends T>(): Tag<T1> => new Tag(this.def, this.key)
  readonly read        = (r: Has<T>): T => r[this.key]
  readonly readOption  = (r: unknown): Option<T> => (isObject(r) ? fromNullable(r[this.key]) : none())
  readonly setKey      = (s: PropertyKey): Tag<T> => new Tag(this.def, s)
  readonly of          = (_: T): Has<T> => ({ [this.key]: _ } as any)
}

export function isTag(u: unknown): u is Tag<unknown> {
  return isObject(u) && TagTypeId in u
}

/**
 * Extract the Has type from any augumented variant
 */
export type HasTag<T> = [T] extends [Tag<infer A>] ? Has<A> : never

function makeTag<T>(def = false, key: PropertyKey = Symbol()): Tag<T> {
  return new Tag(def, key)
}

/**
 * Create a service entry Tag from a type and a URI
 */
export function tag<T extends Constructor<any>>(_: T): Tag<ConstructorType<T>>
export function tag<T>(): Tag<T>
export function tag(_?: any): Tag<unknown> {
  return makeTag()
}

/**
 * Get the service type of a Has
 */
export type ServiceType<T> = [T] extends [Has<infer A>] ? A : never

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export function replaceServiceIn<T>(_: Tag<T>, f: (t: T) => T): <R>(r: R & Has<T>) => R & Has<T> {
  return (r) => ({
    ...r,
    [_.key]: f(r[_.key])
  })
}

/**
 * Replaces the service with the required Service Entry, in the specified environment
 */
export function replaceServiceIn_<R, T>(r: R & Has<T>, _: Tag<T>, f: (t: T) => T): R & Has<T> {
  return {
    ...r,
    [_.key]: f(r[_.key])
  } as any
}

/**
 * Flags the current Has to be overridable, when this is used subsequently provided
 * environments will override pre-existing. Useful to provide defaults.
 */
export function overridable<T>(h: Tag<T>): Tag<T> {
  return h.overridable()
}

export function mergeEnvironments<T, R1>(_: Tag<T>, r: R1, t: T): R1 & Has<T> {
  return _.def && r[_.key]
    ? r
    : ({
        ...r,
        [_.key]: t
      } as any)
}

export class DerivationContext {
  readonly hasMap = new Map<Tag<any>, Tag<any>>()
  derive<T, T2>(has: Tag<T>, f: () => Tag<T2>): Tag<T2> {
    const inMap = this.hasMap.get(has)
    if (inMap) {
      return inMap
    }
    const computed = f()
    this.hasMap.set(has, computed)
    return computed
  }
}
