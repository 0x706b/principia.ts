import type { Boolean } from './Boolean'
import type { BuiltIn } from './BuiltIn'
import type { List } from './List'
import type { Has } from './Union'

export type Cast<A, B> = A extends B ? A : B

export type Extends<A, B> = [A] extends [never] ? 0 : A extends B ? 1 : 0

export type Contains<A, B> = Extends<A, B> extends 1 ? 1 : 0

export type Equals<A, B> = (<X>() => X extends B ? 1 : 0) extends <X>() => X extends A ? 1 : 0 ? 1 : 0

export type If<B extends Boolean, Then, Else = never> = B extends 1 ? Then : Else

export type Match =
  | 'default'
  // Extends<A, B>
  | 'extends->'
  // Contains<A, B>
  | 'contains->'
  // Equals<A, B>
  | 'equals'
  // Extends<B, A>
  | '<-extends'
  // Contains<B, A>
  | '<-contains'

export type Is<A, B, _ extends Match> = {
  default: Extends<A, B>
  'extends->': Extends<A, B>
  'contains->': Contains<A, B>
  '<-extends': Extends<B, A>
  '<-contains': Contains<B, A>
  equals: Equals<A, B>
}[_]

export type Key = string | number | symbol

export type Literal = string | number | bigint | boolean

export type Keys<A> = A extends List ? Exclude<keyof A, keyof any[]> | number : keyof A

export type KnownKeys<A> = {
  [K in keyof A]: string extends K ? never : number extends K ? never : K
} extends {
  [K in keyof A]: infer U
}
  ? U & Keys<A>
  : never

export type ComputeRaw<A> = A extends Function ? A : { [K in keyof A]: A[K] } & unknown

export type ComputeFlat<A> = A extends BuiltIn
  ? A
  : A extends Array<any>
  ? A extends Array<Record<Key, any>>
    ? Array<{ [K in keyof A[number]]: A[number][K] } & unknown>
    : A
  : A extends ReadonlyArray<any>
  ? A extends ReadonlyArray<Record<Key, any>>
    ? ReadonlyArray<{ [K in keyof A[number]]: A[number][K] } & unknown>
    : A
  : { [K in keyof A]: A[K] } & unknown

export type ComputeDeep<A, Seen = never> = A extends BuiltIn
  ? A
  : {
      0: A extends Array<any>
        ? A extends Array<Record<Key, any>>
          ? Array<{ [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen> } & unknown>
          : A
        : A extends ReadonlyArray<any>
        ? A extends ReadonlyArray<Record<Key, any>>
          ? ReadonlyArray<{ [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen> } & unknown>
          : A
        : { [K in keyof A]: ComputeDeep<A[K], A | Seen> } & unknown
      1: A
    }[Has<Seen, A>]

export type At<A, K extends Key> = A extends List
  ? number extends A['length']
    ? K extends number | `${number}`
      ? A[never] | undefined
      : undefined
    : K extends keyof A
    ? A[K]
    : undefined
  : unknown extends A
  ? unknown
  : K extends keyof A
  ? A[K]
  : undefined
