import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Just, Maybe, Nothing } from '@principia/base/Maybe'
import type * as M from '@principia/base/Maybe'
import type * as P from '@principia/base/prelude'
import type { These } from '@principia/base/These'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Maybe: MaybeStaticOps
  export interface Maybe<A> extends M.Maybe<A> {}
  export interface Nothing extends M.Nothing {}
  export interface Just<A> extends M.Just<A> {}
}

interface MaybeStaticOps {
  /**
   * @rewriteStatic Align from "@principia/base/Maybe"
   */
  Align: typeof M.Align
  /**
   * @rewriteStatic Alt from "@principia/base/Maybe"
   */
  Alt: typeof M.Alt
  /**
   * @rewriteStatic Applicative from "@principia/base/Maybe"
   */
  Applicative: typeof M.Applicative
  /**
   * @rewriteStatic ApplicativeExcept from "@principia/base/Maybe"
   */
  ApplicativeExcept: typeof M.ApplicativeExcept
  /**
   * @rewriteStatic Apply from "@principia/base/Maybe"
   */
  Apply: typeof M.Apply
  /**
   * @rewriteStatic Functor from "@principia/base/Maybe"
   */
  Functor: typeof M.Functor
  /**
   * @rewriteStatic just from "@principia/base/Maybe"
   */
  Just: typeof M.just
  /**
   * @rewriteStatic Monad from "@principia/base/Maybe"
   */
  Monad: typeof M.Monad
  /**
   * @rewriteStatic MonadExcept from "@principia/base/Maybe"
   */
  MonadExcept: typeof M.MonadExcept
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Maybe"
   */
  MonoidalFunctor: typeof M.MonoidalFunctor
  /**
   * @rewriteStatic nothing from "@principia/base/Maybe"
   */
  Nothing: typeof M.nothing
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Maybe"
   */
  SemimonoidalFunctor: typeof M.SemimonoidalFunctor
  /**
   * @rewriteStatic fromEither from "@principia/base/Maybe"
   */
  fromEither<E, A>(either: Either<E, A>): Maybe<A>
  /**
   * @rewriteStatic fromNullable from "@principia/base/Maybe"
   */
  fromNullable: typeof M.fromNullable
  /**
   * @rewriteStatic fromNullableK from "@principia/base/Maybe"
   */
  fromNullableK: typeof M.fromNullableK
  /**
   * @rewriteStatic fromPredicate_ from "@principia/base/Maybe"
   */
  fromPredicate<A, B extends A>(value: A, refinement: P.Refinement<A, B>): Maybe<B>
  /**
   * @rewriteStatic fromPredicate_ from "@principia/base/Maybe"
   */
  fromPredicate<A>(value: A, predicate: P.Predicate<A>): Maybe<A>
  /**
   * @rewriteStatic fromPredicate from "@principia/base/Maybe"
   * @dataFirst fromPredicate_
   */
  fromPredicate<A, B extends A>(refinement: P.Refinement<A, B>): (value: A) => Maybe<B>
  /**
   * @rewriteStatic fromPredicate from "@principia/base/Maybe"
   * @dataFirst fromPredicate_
   */
  fromPredicate<A>(predicate: P.Predicate<A>): (value: A) => Maybe<A>
  /**
   * @rewriteStatic getApplyMonoid from "@principia/base/Maybe"
   */
  getApplyMonoid: typeof M.getApplyMonoid
  /**
   * @rewriteStatic getApplySemigroup from "@principia/base/Maybe"
   */
  getApplySemigroup: typeof M.getApplySemigroup
  /**
   * @rewriteStatic getEq from "@principia/base/Maybe"
   */
  getEq: typeof M.getEq
  /**
   * @rewriteStatic getFirstMonoid from "@principia/base/Maybe"
   */
  getFirstMonoid: typeof M.getFirstMonoid
  /**
   * @rewriteStatic getGuard from "@principia/base/Maybe"
   */
  getGuard: typeof M.getGuard
  /**
   * @rewriteStatic getLastMonoid from "@principia/base/Maybe"
   */
  getLastMonoid: typeof M.getLastMonoid
  /**
   * @rewriteStatic getMonoid from "@principia/base/Maybe"
   */
  getMonoid: typeof M.getMonoid
  /**
   * @rewriteStatic getShow from "@principia/base/Maybe"
   */
  getShow: typeof M.getShow
  /**
   * @rewriteStatic pure from "@principia/base/Maybe"
   */
  pure: typeof M.pure
  /**
   * @rewriteStatic tryCatch from "@principia/base/Maybe"
   */
  tryCatch: typeof M.tryCatch
  /**
   * @rewriteStatic tryCatchK from "@principia/base/Maybe"
   */
  tryCatchK: typeof M.tryCatchK
  /**
   * @rewriteStatic unit from "@principia/base/Maybe"
   */
  unit: typeof M.unit
}

interface MaybeOps<A> {
  /**
   * @rewrite align_ from "@principia/base/Maybe"
   */
  align<A, B>(this: Maybe<A>, that: Maybe<B>): Maybe<These<A, B>>

  /**
   * @rewrite alignWith_ from "@principia/base/Maybe"
   */
  alignWith<A, B, C>(this: Maybe<A>, that: Maybe<B>, f: (_: These<A, B>) => C): Maybe<C>

  /**
   * @rewrite alt_ from "@principia/base/Maybe"
   */
  alt<A>(this: Maybe<A>, that: () => Maybe<A>): Maybe<A>

  /**
   * @rewrite _ap from "@principia/base/Maybe"
   */
  ap<A, B>(this: Maybe<A>, fab: Maybe<(a: A) => B>): Maybe<B>

  /**
   * @rewrite chain_ from "@principia/base/Maybe"
   */
  chain<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B>

  /**
   * @rewrite chainNullableK_ from "@principia/base/Maybe"
   */
  chainNullableK<A, B>(this: Maybe<A>, f: (a: A) => B | null | undefined): Maybe<B>

  /**
   * @rewrite chainS_ from "@principia/base/Maybe"
   */
  chainS<A, BN extends string, B>(
    this: Maybe<A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => Maybe<B>
  ): Maybe<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite cross_ from "@principia/base/Maybe"
   */
  cross<A, B>(this: Maybe<A>, that: Maybe<B>): Maybe<readonly [A, B]>

  /**
   * @rewrite crossS_ from "@principia/base/Maybe"
   */
  crossS<A, BN extends string, B>(
    this: Maybe<A>,
    name: Exclude<BN, keyof A>,
    fb: Maybe<B>
  ): Maybe<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite crossT_ from "@principia/base/Maybe"
   */
  crossT<A extends ReadonlyArray<unknown>, B>(this: Maybe<A>, fb: Maybe<B>): Maybe<[...A, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Maybe"
   */
  crossWith<A, B, C>(this: Maybe<A>, that: Maybe<B>, f: (a: A, b: B) => C): Maybe<C>

  /**
   * @rewrite getOrElse_ from "@principia/base/Maybe"
   */
  getOrElse<A, B>(this: Maybe<A>, f: () => B): A | B

  /**
   * @rewrite isJust from "@principia/base/Maybe"
   */
  isJust<A>(this: Maybe<A>): this is Just<A>

  /**
   * @rewrite isNothing from "@principia/base/Maybe"
   */
  isNothing<A>(this: Maybe<A>): this is Nothing

  /**
   * @rewrite map_ from "@principia/base/Maybe"
   */
  map<A, B>(this: Maybe<A>, f: (a: A) => B): Maybe<B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Maybe"
   */
  mapA<A, F extends HKT.URIS, C = HKT.Auto>(
    this: Maybe<A>,
    A: P.Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<B>>

  /**
   * @rewrite match_ from "@principia/base/Maybe"
   */
  match<A, B, C>(this: Maybe<A>, onNothing: () => B, onJust: (a: A) => C): B | C

  /**
   * @rewrite pureS_ from "@principia/base/Maybe"
   */
  pureS<A, BN extends string, B>(
    this: Maybe<A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => B
  ): Maybe<{ [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite tap_ from "@principia/base/Maybe"
   */
  tap<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<A>

  /**
   * @rewrite toS_ from "@principia/base/Maybe"
   */
  toS<A, BN extends string>(this: Maybe<A>, name: BN): Maybe<{ [K in BN]: A }>

  /**
   * @rewriteGetter toUndefined from "@principia/base/Maybe"
   */
  value: A | undefined
}

declare module '@principia/base/internal/Maybe' {
  interface Just<A> extends MaybeOps<A> {}
  interface Nothing extends MaybeOps<never> {}
}
