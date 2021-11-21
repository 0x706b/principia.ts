import type { UnionToIntersection } from './prelude'

export declare const URI: unique symbol
export declare const CURI: unique symbol

export type Variance = '-' | '+' | '_'

export type VarianceOf<F extends HKT, N extends ParamName> = F['variance'][N]

export interface HKT {
  readonly K?: unknown
  readonly Q?: unknown
  readonly W?: unknown
  readonly X?: unknown
  readonly I?: unknown
  readonly S?: unknown
  readonly R?: unknown
  readonly E?: unknown
  readonly A?: unknown
  readonly type?: unknown

  readonly index?: unknown

  readonly variance: {
    readonly K?: Variance
    readonly Q?: Variance
    readonly W?: Variance
    readonly X?: Variance
    readonly I?: Variance
    readonly S?: Variance
    readonly R?: Variance
    readonly E?: Variance
    readonly A?: Variance
  }
}

export type CovariantE = HKT & {
  readonly variance: {
    E: '+'
  }
}

export type ContravariantR = HKT & {
  readonly variance: {
    R: '-'
  }
}

export interface Typeclass<F extends HKT, C = None> {
  readonly [URI]: F
  readonly [CURI]: C
}

export interface Typeclass2<F extends HKT, G extends HKT, C = None, D = None> {
  readonly _F: F
  readonly _G: G
  readonly _CF: C
  readonly _CG: D
}

export interface Compose2<F extends HKT, G extends HKT, C = None, D = None> extends HKT {
  readonly type: Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    this['E'],
    Kind<G, D, this['K'], this['Q'], this['W'], this['X'], this['I'], this['S'], this['R'], this['E'], this['A']>
  >
}

export interface FK<F, K, Q, W, X, I, S, R, E, A> {
  readonly _F: F
  readonly _K: K
  readonly _Q: Q
  readonly _W: W
  readonly _X: X
  readonly _I: I
  readonly _S: S
  readonly _R: R
  readonly _E: E
  readonly _A: A
}

export interface FK1<F, A> {
  readonly _F: F
  readonly _K: unknown
  readonly _Q: unknown
  readonly _W: unknown
  readonly _X: unknown
  readonly _I: unknown
  readonly _S: unknown
  readonly _R: unknown
  readonly _E: unknown
  readonly _A: A
}

export interface F<F> extends HKT {
  readonly type: FK<
    F,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    this['E'],
    this['A']
  >
  readonly variance: {
    readonly K: '_'
    readonly Q: '_'
    readonly W: '_'
    readonly X: '_'
    readonly I: '_'
    readonly S: '_'
    readonly R: '_'
    readonly E: '_'
    readonly A: '_'
  }
}

export interface FCoE<F> extends HKT {
  readonly type: FK<
    F,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    this['E'],
    this['A']
  >
  readonly variance: {
    readonly K: '_'
    readonly Q: '_'
    readonly W: '_'
    readonly X: '_'
    readonly I: '_'
    readonly S: '_'
    readonly R: '_'
    readonly E: '+'
    readonly A: '_'
  }
}

export interface FContraR<F> extends HKT {
  readonly type: FK<
    F,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    this['E'],
    this['A']
  >
  readonly variance: {
    readonly K: '_'
    readonly Q: '_'
    readonly W: '_'
    readonly X: '_'
    readonly I: '_'
    readonly S: '_'
    readonly R: '-'
    readonly E: '_'
    readonly A: '_'
  }
}

export type ParamName = 'K' | 'Q' | 'W' | 'X' | 'I' | 'S' | 'R' | 'E' | 'A'

export type Kind<F extends HKT, C, K, Q, W, X, I, S, R, E, A> = F extends { readonly type: unknown }
  ? (F & {
      readonly K: OrFix<C, 'K', K>
      readonly Q: OrFix<C, 'Q', Q>
      readonly W: OrFix<C, 'W', W>
      readonly X: OrFix<C, 'X', X>
      readonly I: OrFix<C, 'I', I>
      readonly S: OrFix<C, 'S', S>
      readonly R: OrFix<C, 'R', R>
      readonly E: OrFix<C, 'E', E>
      readonly A: A
    })['type']
  : FK<F, K, Q, W, X, I, S, R, E, A>

export type Infer<F extends HKT, C, N extends ParamName | 'A' | 'C', K> = [K] extends [
  Kind<F, C, infer K, infer Q, infer W, infer X, infer I, infer S, infer R, infer E, infer A>
]
  ? N extends 'C'
    ? C
    : N extends 'K'
    ? K
    : N extends 'Q'
    ? Q
    : N extends 'W'
    ? W
    : N extends 'X'
    ? X
    : N extends 'I'
    ? I
    : N extends 'S'
    ? S
    : N extends 'R'
    ? R
    : N extends 'E'
    ? E
    : N extends 'A'
    ? A
    : never
  : never

/**
 * Lower bounds for variance
 */

export interface Lows {
  '-': unknown
  '+': never
  _: any
}

export type Low<F extends HKT, N extends ParamName> = F['variance'][N] extends Variance ? Lows[F['variance'][N]] : never

/**
 * Type mixing for variance
 */

export interface Mixes<P extends ReadonlyArray<unknown>> {
  '-': P extends [any]
    ? P[0]
    : P extends [any, any]
    ? P[0] & P[1]
    : P extends [any, any, any]
    ? P[0] & P[1] & P[2]
    : P extends [any, any, any, any]
    ? P[0] & P[1] & P[2] & P[3]
    : P extends [any, any, any, any, any]
    ? P[0] & P[1] & P[2] & P[3] & P[4]
    : UnionToIntersection<P[number]>
  '+': P[number]
  _: P[0]
}
export type Mix<
  F extends HKT,
  N extends ParamName,
  P extends ReadonlyArray<unknown>
> = F['variance'][N] extends Variance ? Mixes<P>[F['variance'][N]] : P[0]

export type OrNever<K> = unknown extends K ? never : K

export type MixStruct<F extends HKT, N extends ParamName, X, Y> = F['variance'][N] extends '_'
  ? X
  : F['variance'][N] extends '+'
  ? Y[keyof Y]
  : F['variance'][N] extends '-'
  ? UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
  : X

export interface Intros<A, B> {
  '-': B
  '+': B
  _: A
}

/**
 * Type introduction for variance
 */

export type Intro<F extends HKT, N extends ParamName, A, B> = F['variance'][N] extends Variance
  ? Intros<A, B>[F['variance'][N]]
  : A

/**
 * Type parameter constraint
 */

export type None = {
  [Fix]: {}
}

export declare const Fix: unique symbol

export interface Fix<N extends ParamName, A> {
  [Fix]: {
    [K in N]: () => A
  }
}

export type OrFix<C, N extends ParamName, A> = C extends Fix<N, infer X> ? X : A

export type IndexFor<F extends HKT, K> = F extends { readonly index: unknown } ? F['index'] : K

/**
 * Instance util
 */

export function instance<F>(_: Omit<F, typeof URI | typeof CURI | '_F' | '_G' | '_CF' | '_CG'>): F {
  // @ts-expect-error
  return _
}
