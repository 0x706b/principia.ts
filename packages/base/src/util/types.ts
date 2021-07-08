import type { Has, Tag } from '../Has'
import type { NonEmptyArray } from '../NonEmptyArray'

export type Primitive = string | number | boolean | null | symbol

export type Constructor<A> = { new (...args: any[]): A }

export type _A<T> = [T] extends [{ ['_A']: () => infer A }] ? A : never

export type _R<T> = [T] extends [{ ['_R']: (_: infer R) => void }] ? R : never

export type _E<T> = [T] extends [{ ['_E']: () => infer E }] ? E : never

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type UnionToTuple<T> = UnionToIntersection<T extends any ? (t: T) => T : never> extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : []

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export declare type Erase<R, K> = R & K extends K & infer R1 ? R1 : R

/**
 * Excludes properties of type V from T
 */
export type ExcludeMatchingProperties<T, V> = Pick<T, { [K in keyof T]-?: T[K] extends V ? never : K }[keyof T]>

export type EnsureLiteral<K> = string extends K ? never : [K] extends [UnionToIntersection<K>] ? K : never

export type Mutable<T> = T extends NonEmptyArray<infer A>
  ? Array<A> & { 0: A }
  : T extends ReadonlyArray<infer A>
  ? Array<A>
  : T extends ReadonlySet<infer A>
  ? Set<A>
  : T extends ReadonlyMap<infer K, infer A>
  ? Map<K, A>
  : { -readonly [K in keyof T]: T[K] }

export type IsEqualTo<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

export type ServicesStruct<SS extends Record<string, Tag<any>>> = {
  [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? T : never
}

export type HasStruct<SS extends Record<string, Tag<any>>> = UnionToIntersection<
  { [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
>

export type ServicesTuple<SS extends ReadonlyArray<Tag<any>>> = {
  [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? T : never
}

export type HasTuple<SS extends ReadonlyArray<Tag<any>>> = UnionToIntersection<
  { [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS & number]
>
