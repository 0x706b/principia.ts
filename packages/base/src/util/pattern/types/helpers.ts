import type { UnionToIntersection, UnionToTuple } from '../../types'

export type ValueOf<A> = A extends any[] ? A[number] : A[keyof A]

export type Values<A extends object> = UnionToTuple<ValueOf<A>>

/**
 * ### LeastUpperBound
 * An interesting one. A type taking two imbricated sets and returning the
 * smallest one.
 * We need that because sometimes the pattern's infered type holds more
 * information than the value on which we are matching (if the value is any
 * or unknown for instance).
 */

export type LeastUpperBound<A, B> = A extends B ? A : B extends A ? B : never

/**
 * if a key of an object has the never type,
 * returns never, otherwise returns the type of object
 **/

export type ExcludeIfContainsNever<A, B> = B extends Map<any, any> | Set<any>
  ? A
  : B extends readonly [any, ...any]
  ? ExcludeObjectIfContainsNever<A, keyof B & ('0' | '1' | '2' | '3' | '4')>
  : B extends any[]
  ? ExcludeObjectIfContainsNever<A, keyof B & number>
  : ExcludeObjectIfContainsNever<A, keyof B & string>

export type ExcludeObjectIfContainsNever<A, KeyConstraint = unknown> = A extends any
  ? {
      [k in KeyConstraint & keyof A]-?: [A[k]] extends [never] ? 'exclude' : 'include'
    }[KeyConstraint & keyof A] extends infer includeOrExclude
    ? (includeOrExclude extends 'include' ? ('include' extends includeOrExclude ? true : false) : false) extends true
      ? A
      : never
    : never
  : never

export type IsUnion<A> = [A] extends [UnionToIntersection<A>] ? false : true

export type Cast<A, B> = A extends B ? A : never

export type Flatten<Xs extends any[], Out extends any[] = []> = Xs extends readonly [infer head, ...infer tail]
  ? Flatten<tail, [...Out, ...Cast<head, any[]>]>
  : Out

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

export type Expect<T extends true> = T

export type IsAny<T> = 0 extends 1 & T ? true : false

export type Length<It extends any[]> = It['length']

export type Iterator<N extends number, It extends any[] = []> = It['length'] extends N ? It : Iterator<N, [any, ...It]>

export type Next<It extends any[]> = [any, ...It]
export type Prev<It extends any[]> = It extends readonly [any, ...infer tail] ? tail : []

export type Slice<Xs extends readonly any[], it extends any[], output extends any[] = []> = Length<it> extends 0
  ? output
  : Xs extends readonly [infer head, ...infer tail]
  ? Slice<tail, Prev<it>, [...output, head]>
  : output

export type Drop<Xs extends readonly any[], n extends any[]> = Length<n> extends 0
  ? Xs
  : Xs extends readonly [any, ...infer tail]
  ? Drop<tail, Prev<n>>
  : []

type BuiltInObjects = Function | Date | RegExp | Generator | { readonly [Symbol.toStringTag]: string }

export type IsPlainObject<O> = O extends object
  ? // to excluded branded string types,
    // like `string & { __brand: "id" }`
    // and built-in objects
    O extends string | BuiltInObjects
    ? false
    : true
  : false

export type Compute<A> = A extends BuiltInObjects ? A : { [k in keyof A]: A[k] } & unknown

// All :: Bool[] -> Bool
export type All<Xs> = Xs extends readonly [infer head, ...infer tail]
  ? boolean extends head
    ? false
    : head extends true
    ? All<tail>
    : false
  : true

export type Or<A extends boolean, B extends boolean> = true extends A | B ? true : false

export type WithDefault<A, Default> = [A] extends [never] ? Default : A

export type IsLiteral<T> = T extends null | undefined
  ? true
  : T extends string
  ? string extends T
    ? false
    : true
  : T extends number
  ? number extends T
    ? false
    : true
  : T extends boolean
  ? boolean extends T
    ? false
    : true
  : T extends symbol
  ? symbol extends T
    ? false
    : true
  : T extends bigint
  ? bigint extends T
    ? false
    : true
  : false

export type Primitives = number | boolean | string | undefined | null | symbol | bigint

export type Union<A, B> = [B] extends [A] ? A : [A] extends [B] ? B : A | B
