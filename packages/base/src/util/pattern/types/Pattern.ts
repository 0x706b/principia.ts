import type * as symbols from '../symbols'
import type { IsPlainObject, Primitives } from './helpers'

/**
 * GuardValue returns the value guarded by a type guard function.
 */
export type GuardValue<F> = F extends (value: any) => value is infer B
  ? B
  : F extends (value: infer A) => unknown
  ? A
  : never

export type GuardFunction<A, B extends A> = ((value: A) => value is B) | ((value: A) => boolean)

// Using internal tags here to dissuade people from using them inside patterns.
// Theses properties should be used by ts-pattern's internals only.
// Unfortunately they must be publically visible to work at compile time
export type GuardPattern<A, B extends A = never> = {
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.PatternKind]: symbols.Guard
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.Guard]: GuardFunction<A, B>
}

export type NotPattern<A> = {
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.PatternKind]: symbols.Not
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.Not]: Pattern<A>
}

export type AnonymousSelectPattern = {
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.PatternKind]: symbols.AnonymousSelect
}

export type NamedSelectPattern<K extends string> = {
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.PatternKind]: symbols.NamedSelect
  /** @internal This property should only be used by ts-pattern's internals. */
  [symbols.NamedSelect]: K
}

/**
 * ### Pattern
 * Patterns can be any (nested) javascript value.
 * They can also be a "wildcards", like `__`.
 */
export type Pattern<A> =
  | AnonymousSelectPattern
  | NamedSelectPattern<string>
  | GuardPattern<A, A>
  | NotPattern<A | any>
  | (A extends Primitives
      ? A
      : A extends readonly (infer I)[]
      ? A extends readonly [infer A1, infer A2, infer A3, infer A4, infer A5]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>, Pattern<A4>, Pattern<A5>]
        : A extends readonly [infer A1, infer A2, infer A3, infer A4]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>, Pattern<A4>]
        : A extends readonly [infer A1, infer A2, infer A3]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>]
        : A extends readonly [infer A1, infer A2]
        ? readonly [Pattern<A1>, Pattern<A2>]
        :
            | readonly []
            | readonly [Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>]
      : A extends Map<infer K, infer V>
      ? Map<K, Pattern<V>>
      : A extends Set<infer V>
      ? Set<Pattern<V>>
      : IsPlainObject<A> extends true
      ? { readonly [K in keyof A]?: Pattern<A[K]> }
      : A)
