import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { None, Option, Some } from '@principia/base/Option'
import type * as O from '@principia/base/Option'
import type * as P from '@principia/base/prelude'
import type { These } from '@principia/base/These'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Option: OptionStaticOps
  export interface Option<A> extends O.Option<A> {}
  export interface None extends O.None {}
  export interface Some<A> extends O.Some<A> {}
}

interface OptionStaticOps {
  /**
   * @rewriteStatic Align from "@principia/base/Option"
   */
  Align: typeof O.Align
  /**
   * @rewriteStatic Alt from "@principia/base/Option"
   */
  Alt: typeof O.Alt
  /**
   * @rewriteStatic Applicative from "@principia/base/Option"
   */
  Applicative: typeof O.Applicative
  /**
   * @rewriteStatic ApplicativeExcept from "@principia/base/Option"
   */
  ApplicativeExcept: typeof O.ApplicativeExcept
  /**
   * @rewriteStatic Apply from "@principia/base/Option"
   */
  Apply: typeof O.Apply
  /**
   * @rewriteStatic Functor from "@principia/base/Option"
   */
  Functor: typeof O.Functor
  /**
   * @rewriteStatic Monad from "@principia/base/Option"
   */
  Monad: typeof O.Monad
  /**
   * @rewriteStatic MonadExcept from "@principia/base/Option"
   */
  MonadExcept: typeof O.MonadExcept
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Option"
   */
  MonoidalFunctor: typeof O.MonoidalFunctor
  /**
   * @rewriteStatic none from "@principia/base/Option"
   */
  None: typeof O.none
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Option"
   */
  SemimonoidalFunctor: typeof O.SemimonoidalFunctor
  /**
   * @rewriteStatic some from "@principia/base/Option"
   */
  Some: typeof O.some
  /**
   * @rewriteStatic fromEither from "@principia/base/Option"
   */
  fromEither<E, A>(either: Either<E, A>): Option<A>
  /**
   * @rewriteStatic fromNullable from "@principia/base/Option"
   */
  fromNullable: typeof O.fromNullable
  /**
   * @rewriteStatic fromNullableK from "@principia/base/Option"
   */
  fromNullableK: typeof O.fromNullableK
  /**
   * @rewriteStatic fromPredicate_ from "@principia/base/Option"
   */
  fromPredicate<A, B extends A>(value: A, refinement: P.Refinement<A, B>): Option<B>
  /**
   * @rewriteStatic fromPredicate_ from "@principia/base/Option"
   */
  fromPredicate<A>(value: A, predicate: P.Predicate<A>): Option<A>
  /**
   * @rewriteStatic fromPredicate from "@principia/base/Option"
   * @dataFirst fromPredicate_
   */
  fromPredicate<A, B extends A>(refinement: P.Refinement<A, B>): (value: A) => Option<B>
  /**
   * @rewriteStatic fromPredicate from "@principia/base/Option"
   * @dataFirst fromPredicate_
   */
  fromPredicate<A>(predicate: P.Predicate<A>): (value: A) => Option<A>
  /**
   * @rewriteStatic getApplyMonoid from "@principia/base/Option"
   */
  getApplyMonoid: typeof O.getApplyMonoid
  /**
   * @rewriteStatic getApplySemigroup from "@principia/base/Option"
   */
  getApplySemigroup: typeof O.getApplySemigroup
  /**
   * @rewriteStatic getEq from "@principia/base/Option"
   */
  getEq: typeof O.getEq
  /**
   * @rewriteStatic getFirstMonoid from "@principia/base/Option"
   */
  getFirstMonoid: typeof O.getFirstMonoid
  /**
   * @rewriteStatic getGuard from "@principia/base/Option"
   */
  getGuard: typeof O.getGuard
  /**
   * @rewriteStatic getLastMonoid from "@principia/base/Option"
   */
  getLastMonoid: typeof O.getLastMonoid
  /**
   * @rewriteStatic getMonoid from "@principia/base/Option"
   */
  getMonoid: typeof O.getMonoid
  /**
   * @rewriteStatic getShow from "@principia/base/Option"
   */
  getShow: typeof O.getShow
  /**
   * @rewriteStatic pure from "@principia/base/Option"
   */
  pure: typeof O.pure
  /**
   * @rewriteStatic tryCatch from "@principia/base/Option"
   */
  tryCatch: typeof O.tryCatch
  /**
   * @rewriteStatic tryCatchK from "@principia/base/Option"
   */
  tryCatchK: typeof O.tryCatchK
  /**
   * @rewriteStatic unit from "@principia/base/Option"
   */
  unit: typeof O.unit
}

interface OptionOps<A> {
  /**
   * @rewrite align_ from "@principia/base/Option"
   */
  align<A, B>(this: Option<A>, that: Option<B>): Option<These<A, B>>

  /**
   * @rewrite alignWith_ from "@principia/base/Option"
   */
  alignWith<A, B, C>(this: Option<A>, that: Option<B>, f: (_: These<A, B>) => C): Option<C>

  /**
   * @rewrite alt_ from "@principia/base/Option"
   */
  alt<A>(this: Option<A>, that: () => Option<A>): Option<A>

  /**
   * @rewrite _ap from "@principia/base/Option"
   */
  ap<A, B>(this: Option<A>, fab: Option<(a: A) => B>): Option<B>

  /**
   * @rewrite chain_ from "@principia/base/Option"
   */
  chain<A, B>(this: Option<A>, f: (a: A) => Option<B>): Option<B>

  /**
   * @rewrite chainNullableK_ from "@principia/base/Option"
   */
  chainNullableK<A, B>(this: Option<A>, f: (a: A) => B | null | undefined): Option<B>

  /**
   * @rewrite chainS_ from "@principia/base/Option"
   */
  chainS<A, BN extends string, B>(
    this: Option<A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => Option<B>
  ): Option<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite cross_ from "@principia/base/Option"
   */
  cross<A, B>(this: Option<A>, that: Option<B>): Option<readonly [A, B]>

  /**
   * @rewrite crossS_ from "@principia/base/Option"
   */
  crossS<A, BN extends string, B>(
    this: Option<A>,
    name: Exclude<BN, keyof A>,
    fb: Option<B>
  ): Option<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite crossT_ from "@principia/base/Option"
   */
  crossT<A extends ReadonlyArray<unknown>, B>(this: Option<A>, fb: Option<B>): Option<[...A, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Option"
   */
  crossWith<A, B, C>(this: Option<A>, that: Option<B>, f: (a: A, b: B) => C): Option<C>

  /**
   * @rewrite getOrElse_ from "@principia/base/Option"
   */
  getOrElse<A, B>(this: Option<A>, f: () => B): A | B

  /**
   * @rewrite isNone from "@principia/base/Option"
   */
  isNone<A>(this: Option<A>): this is None

  /**
   * @rewrite isSome from "@principia/base/Option"
   */
  isSome<A>(this: Option<A>): this is Some<A>

  /**
   * @rewrite map_ from "@principia/base/Option"
   */
  map<A, B>(this: Option<A>, f: (a: A) => B): Option<B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Option"
   */
  mapA<A, F extends HKT.URIS, C = HKT.Auto>(
    this: Option<A>,
    A: P.Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<B>>

  /**
   * @rewrite match_ from "@principia/base/Option"
   */
  match<A, B, C>(this: Option<A>, onNone: () => B, onSome: (a: A) => C): B | C

  /**
   * @rewrite pureS_ from "@principia/base/Option"
   */
  pureS<A, BN extends string, B>(
    this: Option<A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => B
  ): Option<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite tap_ from "@principia/base/Option"
   */
  tap<A, B>(this: Option<A>, f: (a: A) => Option<B>): Option<A>

  /**
   * @rewrite toS_ from "@principia/base/Option"
   */
  toS<A, BN extends string>(this: Option<A>, name: BN): Option<{ [K in BN]: A }>

  /**
   * @rewriteGetter toUndefined from "@principia/base/Option"
   */
  value: A | undefined
}

declare module '@principia/base/internal/Option' {
  interface Some<A> extends OptionOps<A> {}
  interface None extends OptionOps<never> {}
}
