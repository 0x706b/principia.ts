import type { Erase, UnionToIntersection } from './util/types'

/*
 * -------------------------------------------------------------------------------------------------
 * Base
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/base.ts
 * -------------------------------------------------------------------------------------------------
 */

export interface Auto {
  // readonly Auto: unique symbol
}

export interface Base<F, C = Auto> {
  readonly _F: F
  readonly _C: C
}

export interface BaseHKT<F, C = Auto> {
  readonly _HKT: unique symbol
  readonly _URI: F
  readonly _C: C
}

export type MapURIS<F, C = Auto> = F extends [URI<infer U, infer CU>, ...infer Rest]
  ? [URI<U, CU & C>, ...MapURIS<Rest, C>]
  : []

export type CompositionBase2<F extends URIS, G extends URIS, CF = Auto, CG = Auto> = Base<
  [...MapURIS<F, CF>, ...MapURIS<G, CG>]
>

/*
 * -------------------------------------------------------------------------------------------------
 * Generic Helpers
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/hkt.ts
 * -------------------------------------------------------------------------------------------------
 */

export const HKT_URI = 'HKT'
export type HKT_URI = typeof HKT_URI
export interface HKT<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

export const HKT2_URI = 'HKT2'
export type HKT2_URI = typeof HKT2_URI
export interface HKT2<URI, E, A> extends HKT<URI, A> {
  readonly _E: E
}

export const HKT3_URI = 'HKT3'
export type HKT3_URI = typeof HKT3_URI
export interface HKT3<URI, R, E, A> extends HKT2<URI, E, A> {
  readonly _R: R
}

export const HKT4_URI = 'HKT4'
export type HKT4_URI = typeof HKT4_URI
export interface HKT4<URI, S, R, E, A> extends HKT3<URI, R, E, A> {
  readonly _S: S
}

export type UHKT<F> = [URI<'HKT', CustomType<'F', F>>]
export type UHKT2<F> = [URI<'HKT2', CustomType<'F', F>>]
export type UHKT3<F> = [URI<'HKT3', CustomType<'F', F>>]
export type UHKT4<F> = [URI<'HKT4', CustomType<'F', F>>]

/*
 * -------------------------------------------------------------------------------------------------
 * HKT Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/hkt.ts
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A type-level dictionary for HKTs: URI -> Concrete Type
 */
export interface URItoKind<
  // encodes metadata carried at the URI level (like additional params)
  FC,
  // encodes constraints on parameters and variance at the typeclass level
  TC,
  // encodes nominal keys
  N extends string,
  // encodes generic keys
  K,
  // encodes free logic
  Q,
  // encodes free logic
  W,
  // encodes free logic
  X,
  // encodes free logic
  I,
  // encodes free logic
  S,
  // encodes free logic
  R,
  // encodes free logic
  E,
  // encodes output
  A
> {
  [HKT_URI]: HKT<AccessCustom<FC, 'F'>, A>
  [HKT2_URI]: HKT2<AccessCustom<FC, 'F'>, E, A>
  [HKT3_URI]: HKT3<AccessCustom<FC, 'F'>, R, E, A>
  [HKT4_URI]: HKT4<AccessCustom<FC, 'F'>, S, R, E, A>
}

/**
 * A type-level dictionary for indexed HKTs
 */
export interface URItoIndex<N extends string, K> {
  [HKT_URI]: K
  [HKT2_URI]: K
  [HKT3_URI]: K
  [HKT4_URI]: K
}

/*
 * -------------------------------------------------------------------------------------------------
 * Kind Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/kind.ts
 * -------------------------------------------------------------------------------------------------
 */

export type ConcreteURIS = keyof URItoKind<any, any, any, any, any, any, any, any, any, any, any, any>

export type URIS = [URI<ConcreteURIS, any>, ...URI<ConcreteURIS, any>[]]

export interface URI<F extends ConcreteURIS, C = {}> {
  readonly _F: F
  readonly _C: C
}

export type AppendURI<F extends URIS, G extends URI<ConcreteURIS, any>> = F extends URIS ? [...F, G] : F

export type PrependURI<G extends URI<ConcreteURIS, any>, F extends URIS> = F extends URIS ? [G, ...F] : F

export type Rest<F extends [any, ...any[]]> = F extends [any, ...infer Rest] ? Rest : []

export type Kind<F extends URIS, C, N extends string, K, Q, W, X, I, S, R, E, A> = F extends [any, ...infer Next]
  ? Next extends URIS
    ? URItoKind<
        F[0]['_C'],
        C,
        OrFix<'N', F[0]['_C'], OrFix<'N', C, N>>,
        OrFix<'K', F[0]['_C'], OrFix<'K', C, K>>,
        OrFix<'Q', F[0]['_C'], OrFix<'Q', C, Q>>,
        OrFix<'W', F[0]['_C'], OrFix<'W', C, W>>,
        OrFix<'X', F[0]['_C'], OrFix<'X', C, X>>,
        OrFix<'I', F[0]['_C'], OrFix<'I', C, I>>,
        OrFix<'S', F[0]['_C'], OrFix<'S', C, S>>,
        OrFix<'R', F[0]['_C'], OrFix<'R', C, R>>,
        OrFix<'E', F[0]['_C'], OrFix<'E', C, E>>,
        Kind<Next, C, N, K, Q, W, X, I, S, R, E, A>
      >[F[0]['_F']]
    : URItoKind<
        F[0]['_C'],
        C,
        OrFix<'N', F[0]['_C'], OrFix<'N', C, N>>,
        OrFix<'K', F[0]['_C'], OrFix<'K', C, K>>,
        OrFix<'Q', F[0]['_C'], OrFix<'Q', C, Q>>,
        OrFix<'W', F[0]['_C'], OrFix<'W', C, W>>,
        OrFix<'X', F[0]['_C'], OrFix<'X', C, X>>,
        OrFix<'I', F[0]['_C'], OrFix<'I', C, I>>,
        OrFix<'S', F[0]['_C'], OrFix<'S', C, S>>,
        OrFix<'R', F[0]['_C'], OrFix<'R', C, R>>,
        OrFix<'E', F[0]['_C'], OrFix<'E', C, E>>,
        A
      >[F[0]['_F']]
  : never

/*
 * -------------------------------------------------------------------------------------------------
 * Inference
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/infer.ts
 * -------------------------------------------------------------------------------------------------
 */

export type Infer<F extends URIS, C, P extends Param | 'A' | 'C', K> = [K] extends [
  Kind<F, C, infer N, infer K, infer Q, infer W, infer X, infer I, infer S, infer R, infer E, infer A>
]
  ? P extends 'C'
    ? C
    : P extends 'N'
    ? N
    : P extends 'K'
    ? K
    : P extends 'Q'
    ? Q
    : P extends 'W'
    ? W
    : P extends 'X'
    ? X
    : P extends 'I'
    ? I
    : P extends 'S'
    ? S
    : P extends 'R'
    ? R
    : P extends 'E'
    ? E
    : P extends 'A'
    ? A
    : never
  : never

export type URIOf<K extends Kind<any, any, any, any, any, any, any, any, any, any, any, any>> = K extends Kind<
  infer F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? F
  : never

export type IndexForBase<F extends ConcreteURIS, N extends string, K> = F extends keyof URItoIndex<any, any>
  ? URItoIndex<N, K>[F]
  : K

export type IndexFor<F extends URIS, N extends string, K> = IndexForBase<
  {
    [K in keyof F]: F[K] extends ConcreteURIS ? F[K] : F[K] extends URI<infer U, any> ? U : never
  }[number],
  N,
  K
>

export type CompositionIndexForBase<F extends ConcreteURIS[], N extends string, K> = 1 extends F['length']
  ? F[0] extends keyof URItoIndex<any, any>
    ? URItoIndex<N, K>[F[0]]
    : K
  : {
      [P in keyof F]: F[P] extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F[P]] : K
    }

export type CompositionIndexFor<F extends URIS, N extends string, K> = CompositionIndexForBase<
  {
    [K in keyof F]: F[K] extends ConcreteURIS ? F[K] : F[K] extends URI<infer U, any> ? U : never
  },
  N,
  K
>

/*
 * -------------------------------------------------------------------------------------------------
 * Custom
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/custom.ts
 * -------------------------------------------------------------------------------------------------
 */

export interface CustomType<P extends string, V> {
  CustomType: {
    [p in P]: () => V
  }
}

export type AccessCustom<C, P extends string, D = any> = C extends CustomType<P, infer V> ? V : D

export type AccessCustomExtends<C, P extends string, D = any> = C extends CustomType<P, infer V>
  ? V extends D
    ? V
    : D
  : D

/*
 * -------------------------------------------------------------------------------------------------
 * Fix
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/fix.ts
 * -------------------------------------------------------------------------------------------------
 */

export type Param = 'N' | 'K' | 'Q' | 'W' | 'I' | 'X' | 'S' | 'R' | 'E'

export interface Fix<P extends Param, F> {
  Fix: {
    [p in P]: {
      F: () => F
    }
  }
}

export type OrFix<P extends Param, A, B> = A extends Fix<P, infer X>
  ? P extends 'N'
    ? X extends string
      ? X
      : B
    : X
  : B

export type Unfix<C, P extends Param> = (Exclude<keyof C, 'Fix'> extends never
  ? unknown
  : {
      [K in Exclude<keyof C, 'Fix'>]: C[K]
    }) &
  (keyof C & 'Fix' extends never
    ? unknown
    : {
        [K in keyof C & 'Fix']: {
          [KK in Exclude<keyof C[K], P>]: C[K][KK]
        }
      })

export type CleanParam<C, P extends Param> = C extends (Auto | V<P, '_'> | V<P, '+'> | Fix<P, any>) & infer X ? X : C

/*
 * -------------------------------------------------------------------------------------------------
 * OrNever
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/or-never.ts
 * -------------------------------------------------------------------------------------------------
 */

export type OrNever<K> = unknown extends K ? never : K

/*
 * -------------------------------------------------------------------------------------------------
 * Variance Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/variance.ts
 * -------------------------------------------------------------------------------------------------
 */

export type Variance = '+' | '-' | '_'

export interface V<F extends Param, V extends Variance> {
  Variance: {
    [v in V]: () => F
  }
}

/**
 * Composes types according to variance specified in C
 */
export type Mix<C, P extends Param, X extends [any, ...any[]]> = C extends V<P, '_'>
  ? X[0]
  : C extends V<P, '+'>
  ? X[number]
  : C extends V<P, '-'>
  ? X extends [any]
    ? X[0]
    : X extends [any, any]
    ? X[0] & X[1]
    : X extends [any, any, any]
    ? X[0] & X[1] & X[2]
    : X extends [any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3]
    : X extends [any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4]
    : X extends [any, any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4] & X[5]
    : UnionToIntersection<{ [k in keyof X]: OrNever<X[k]> }[keyof X]>
  : X[0]

/**
 * Composes a record of types to the base respecting variance from C
 */
export type MixStruct<C, P extends Param, X, Y> = C extends V<P, '_'>
  ? X
  : C extends V<P, '+'>
  ? Y[keyof Y]
  : C extends V<P, '-'>
  ? P extends 'N'
    ? string
    : UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
  : X

/**
 * Used in subsequent definitions to either vary a paramter or keep it fixed to "Fixed"
 */
export type Intro<C, P extends Param, Fixed, Current> = C extends V<P, '_'>
  ? Fixed
  : C extends V<P, '+'>
  ? Current
  : C extends V<P, '-'>
  ? Current
  : Fixed

/**
 * Initial type depending on variance of P in C (eg: initial Contravariant R = unknown, initial Covariant E = never)
 */
export type Initial<C, P extends Param> = C extends V<P, '-'>
  ? P extends 'N'
    ? string
    : unknown
  : C extends V<P, '+'>
  ? never
  : any

export type Strip<C, P extends Param> = Erase<C, V<P, '_'> & V<P, '-'> & V<P, '+'>>

/*
 * -------------------------------------------------------------------------------------------------
 * Instance Helpers
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/instance.ts
 * -------------------------------------------------------------------------------------------------
 */

export type Ignores = '_F' | '_G' | 'Commutative' | '_C' | '_CF' | '_CG'

/**
 * A helper for constructing typeclass instances
 */
export const instance = <T>(_: Omit<T, Ignores>): T => _ as any
