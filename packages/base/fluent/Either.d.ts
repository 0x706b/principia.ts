import type { Either, Left, Right } from '@principia/base/Either'
import type * as E from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type * as P from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Either: EitherStaticOps
  export type Either<E, A> = E.Left<E> | E.Right<A>
  export interface Left<E> extends E.Left<E> {}
  export interface Right<A> extends E.Right<A> {}
}

interface EitherStaticOps {
  /**
   * @rewriteStatic Alt from "@prinipia/base/Either"
   */
  Alt: typeof E.Alt
  /**
   * @rewriteStatic Applicative from "@prinipia/base/Either"
   */
  Applicative: typeof E.Applicative
  /**
   * @rewriteStatic ApplicativeExcept from "@prinipia/base/Either"
   */
  ApplicativeExcept: typeof E.ApplicativeExcept
  /**
   * @rewriteStatic Apply from "@prinipia/base/Either"
   */
  Apply: typeof E.Apply
  /**
   * @rewriteStatic Bifunctor from "@prinipia/base/Either"
   */
  Bifunctor: typeof E.Bifunctor
  /**
   * @rewriteStatic Fail from "@prinipia/base/Either"
   */
  Fail: typeof E.Fail
  /**
   * @rewriteStatic Foldable from "@prinipia/base/Either"
   */
  Foldable: typeof E.Foldable
  /**
   * @rewriteStatic Functor from "@prinipia/base/Either"
   */
  Functor: typeof E.Functor
  /**
   * @rewriteStatic Left from "@prinipia/base/Either"
   */
  Left: typeof E.Left
  /**
   * @rewriteStatic Monad from "@prinipia/base/Either"
   */
  Monad: typeof E.Monad
  /**
   * @rewriteStatic MonadExcept from "@prinipia/base/Either"
   */
  MonadExcept: typeof E.MonadExcept
  /**
   * @rewriteStatic MonoidalFunctor from "@prinipia/base/Either"
   */
  MonoidalFunctor: typeof E.MonoidalFunctor
  /**
   * @rewriteStatic Right from "@prinipia/base/Either"
   */
  Right: typeof E.Right
  /**
   * @rewriteStatic Semialign from "@prinipia/base/Either"
   */
  Semialign: typeof E.Semialign
  /**
   * @rewriteStatic SemimonoidalFunctor from "@prinipia/base/Either"
   */
  SemimonoidalFunctor: typeof E.SemimonoidalFunctor
  /**
   * @rewriteStatic Traversable from "@prinipia/base/Either"
   */
  Traversable: typeof E.Traversable
  /**
   * @rewriteStatic fromMaybe_ from "@prinipia/base/Either"
   */
  fromMaybe<E, A>(fa: Maybe<A>, onNone: () => E): E.Either<E, A>
  /**
   * @rewriteStatic fromMaybe from "@prinipia/base/Either"
   * @dataFirst fromMaybe_
   */
  fromMaybe<E>(onNone: () => E): <A>(fa: Maybe<A>) => E.Either<E, A>
  /**
   * @rewriteStatic fromNullable_ from "@prinipia/base/Either"
   */
  fromNullable<E, A>(a: A, e: () => E): E.Either<E, NonNullable<A>>
  /**
   * @rewriteStatic fromNullable from "@prinipia/base/Either"
   * @dataFirst fromNullable_
   */
  fromNullable<E>(e: () => E): <A>(a: A) => E.Either<E, NonNullable<A>>
  /**
   * @rewriteStatic fromNullableK_ from "@prinipia/base/Either"
   */
  fromNullableK<E, A extends ReadonlyArray<unknown>, B>(
    f: (...args: A) => B | null | undefined,
    e: () => E
  ): (...args: A) => E.Either<E, NonNullable<B>>
  /**
   * @rewriteStatic fromPredicate_ from "@prinipia/base/Either"
   */
  fromPredicate<E, A>(a: A, predicate: P.Predicate<A>, onFalse: (a: A) => E): E.Either<E, A>
  /**
   * @rewriteStatic fromPredicate from "@prinipia/base/Either"
   * @dataFirst fromPredicate
   */
  fromPredicate<E, A>(predicate: P.Predicate<A>, onFalse: (a: A) => E): (a: A) => E.Either<E, A>
  /**
   * @rewriteStatic fromPredicate from "@prinipia/base/Either"
   * @dataFirst fromPredicate
   */
  fromPredicate<E, A, B extends A>(refinement: P.Refinement<A, B>, onFalse: (a: A) => E): (a: A) => E.Either<E, B>
  /**
   * @rewriteStatic fromPredicate_ from "@prinipia/base/Either"
   */
  fromPredicate<E, A, B extends A>(a: A, refinement: P.Refinement<A, B>, onFalse: (a: A) => E): E.Either<E, B>
  /**
   * @rewriteStatic gen from "@prinipia/base/Either"
   */
  gen: typeof E.gen
  /**
   * @rewriteStatic getAltValidation from "@prinipia/base/Either"
   */
  getAltValidation: typeof E.getAltValidation
  /**
   * @rewriteStatic getApplicativeValidation from "@prinipia/base/Either"
   */
  getApplicativeValidation: typeof E.getApplicativeValidation
  /**
   * @rewriteStatic getEq from "@prinipia/base/Either"
   */
  getEq: typeof E.getEq
  /**
   * @rewriteStatic getFilterable from "@prinipia/base/Either"
   */
  getFilterable: typeof E.getFilterable
  /**
   * @rewriteStatic getSemigroup from "@prinipia/base/Either"
   */
  getSemigroup: typeof E.getSemigroup
  /**
   * @rewriteStatic getShow from "@prinipia/base/Either"
   */
  getShow: typeof E.getShow
  /**
   * @rewriteStatic getWitherable from "@prinipia/base/Either"
   */
  getWitherable: typeof E.getWitherable
  /**
   * @rewriteStatic left from "@prinipia/base/Either"
   */
  left: typeof E.left
  /**
   * @rewriteStatic mapN_ from "@prinipia/base/Either"
   */
  mapN: typeof E.mapN_
  /**
   * @rewriteStatic right from "@prinipia/base/Either"
   */
  right: typeof E.right
  /**
   * @rewriteStatic sequenceS from "@prinipia/base/Either"
   */
  sequenceS: typeof E.sequenceS
  /**
   * @rewriteStatic sequenceT from "@prinipia/base/Either"
   */
  sequenceT: typeof E.sequenceT
  /**
   * @rewriteStatic tryCatch from "@prinipia/base/Either"
   */
  tryCatch: typeof E.tryCatch
  /**
   * @rewriteStatic tryCatchK_ from "@prinipia/base/Either"
   */
  tryCatchK: typeof E.tryCatchK_
  /**
   * @rewriteStatic unit from "@prinipia/base/Either"
   */
  unit: typeof E.unit
}

interface EitherOps<E, A> {
  /**
   * @rewrite _ap from "@principia/base/Either"
   */
  ap<E, A, E1, B>(this: Either<E, A>, fab: Either<E1, (a: A) => B>): Either<E | E1, B>

  /**
   * @rewrite bimap_ from "@principia/base/Either"
   */
  bimap<E, A, E1, B>(this: Either<E, A>, f: (e: E) => E1, g: (a: A) => B): Either<E1, B>

  /**
   * @rewrite catchAll_ from "@principia/base/Either"
   */
  catchAll<E, A, E1, B>(this: Either<E, A>, f: (e: E) => Either<E1, B>): Either<E1, A | B>

  /**
   * @rewrite catchJust_ from "@principia/base/Either"
   */
  catchJust<E, A, E1, B>(this: Either<E, A>, f: (e: E) => Maybe<Either<E1, B>>): Either<E | E1, A | B>

  /**
   * @rewrite chain_ from "@principia/base/Either"
   */
  chain<E, A, E1, B>(this: Either<E, A>, f: (a: A) => Either<E1, B>): Either<E | E1, B>

  /**
   * @rewrite chainS_ from "@principia/base/Either"
   */
  chainS<E, A, BN extends string, E1, B>(
    this: Either<E, A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => Either<E1, B>
  ): Either<E | E1, { [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite cross_ from "@principia/base/Either"
   */
  cross<E, A, E1, B>(this: Either<E, A>, that: Either<E1, B>): Either<E | E1, readonly [A, B]>

  /**
   * @rewrite crossS_ from "@principia/base/Either"
   */
  crossS<E, A, BN extends string, E1, B>(
    this: Either<E, A>,
    name: Exclude<BN, keyof A>,
    fb: E.Either<E1, B>
  ): Either<E | E1, { [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite crossT_ from "@principia/base/Either"
   */
  crossT<E, A extends ReadonlyArray<unknown>, E1, B>(
    this: Either<E, A>,
    fb: Either<E1, B>
  ): Either<E | E1, readonly [...A, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Either"
   */
  crossWith<E, A, E1, B, C>(this: Either<E, A>, that: Either<E1, B>, f: (a: A, b: B) => C): Either<E | E1, C>

  /**
   * @rewrite getLeft from "@principia/base/Maybe"
   */
  getLeft<E, A>(this: Either<E, A>): Maybe<E>

  /**
   * @rewrite getOrElse_ from "@principia/base/Either"
   */
  getOrElse<E, A, B>(this: Either<E, A>, onLeft: (e: E) => B): A | B

  /**
   * @rewrite getRight from "@principia/base/Maybe"
   */
  getRight<E, A>(this: Either<E, A>): Maybe<A>

  /**
   * @rewrite isLeft from "@principia/base/Either"
   */
  isLeft<E, A>(this: Either<E, A>): this is Left<E>

  /**
   * @rewrite isRight from "@principia/base/Either"
   */
  isRight<E, A>(this: Either<E, A>): this is Right<A>

  /**
   * @rewrite map_ from "@principia/base/Either"
   */
  map<E, A, B>(this: Either<E, A>, f: (a: A) => B): Either<E, B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Either"
   */
  mapA<E, A, F extends HKT.HKT, C = HKT.Auto>(
    this: Either<E, A>,
    A: P.Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E1, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, Either<E, B>>

  /**
   * @rewrite mapLeft_ from "@principia/base/Either"
   */
  mapLeft<E, A, E1>(this: Either<E, A>, f: (e: E) => E): Either<E1, A>

  /**
   * @rewrite match_ from "@principia/base/Either"
   */
  match<E, A, B, C>(this: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C

  /**
   * @rewrite pureS_ from "@principia/base/Either"
   */
  pureS<E, A, BN extends string, B>(
    this: Either<E, A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => B
  ): Either<E | E1, { [K in keyof A | BN]: K extends keyof A ? A[K] : B }>

  /**
   * @rewrite swap from "@principia/base/Either"
   */
  swap<E, A>(this: Either<E, A>): Either<A, E>

  /**
   * @rewrite tap_ from "@principia/base/Either"
   */
  tap<E, A, E1, B>(this: Either<E, A>, f: (a: A) => Either<E1, B>): Either<E | E1, A>

  /**
   * @rewrite toS_ from "@principia/base/Either"
   */
  toS<E, A, BN extends string>(this: Either<E, A>, name: BN): Either<E, { [K in BN]: A }>

  /**
   * @rewrite tupled from "@principia/base/Either"
   */
  tupled<E, A>(this: Either<E, A>): Either<E, readonly [A]>
}

declare module '@principia/base/internal/Either' {
  interface Left<E> extends EitherOps<E, never> {}
  interface Right<A> extends EitherOps<never, A> {}
}
