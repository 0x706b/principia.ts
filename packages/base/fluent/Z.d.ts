import type { Chunk } from '@principia/base/Chunk'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { Eq, Erase, Predicate } from '@principia/base/prelude'
import type * as Z from '@principia/base/Z'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Z: ZStaticOps
  export interface Z<W, S1, S2, R, E, A> extends Z.Z<W, S1, S2, R, E, A> {}
  export interface Sync<R, E, A> extends Z.Z<never, unknown, never, R, E, A> {}
  export interface USync<A> extends Sync<unknown, never, A> {}
  export interface FSync<E, A> extends Sync<unknown, E, A> {}
  export interface URSync<R, A> extends Sync<R, never, A> {}
}

export interface ZStaticOps {
  /**
   * @rewriteStatic Applicative from "@principia/base/Z"
   */
  Applicative: typeof Z.Applicative
  /**
   * @rewriteStatic ApplicativeExcept from "@principia/base/Z"
   */
  ApplicativeExcept: typeof Z.ApplicativeExcept
  /**
   * @rewriteStatic Apply from "@principia/base/Z"
   */
  Apply: typeof Z.Apply
  /**
   * @rewriteStatic Functor from "@principia/base/Z"
   */
  Functor: typeof Z.Functor
  /**
   * @rewriteStatic Monad from "@principia/base/Z"
   */
  Monad: typeof Z.Monad
  /**
   * @rewriteStatic MonadEnv from "@principia/base/Z"
   */
  MonadEnv: typeof Z.MonadEnv
  /**
   * @rewriteStatic MonadExcept from "@principia/base/Z"
   */
  MonadExcept: typeof Z.MonadExcept
  /**
   * @rewriteStatic MonadState from "@principia/base/Z"
   */
  MonadState: typeof Z.MonadState
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Z"
   */
  MonoidalFunctor: typeof Z.MonoidalFunctor
  /**
   * @rewriteStatic ReaderCategory from "@principia/base/Z"
   */
  ReaderCategory: typeof Z.ReaderCategory
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Z"
   */
  SemimonoidalFunctor: typeof Z.SemimonoidalFunctor
  /**
   * @rewriteStatic StateCategory from "@principia/base/Z"
   */
  StateCategory: typeof Z.StateCategory
  /**
   * @rewriteStatic ask from "@principia/base/Z"
   */
  ask: typeof Z.ask
  /**
   * @rewriteStatic asks from "@principia/base/Z"
   */
  asks: typeof Z.asks
  /**
   * @rewriteStatic asksZ from "@principia/base/Z"
   */
  asksZ: typeof Z.asksZ
  /**
   * @rewriteStatic defer from "@principia/base/Z"
   */
  defer: typeof Z.defer
  /**
   * @rewriteStatic deferTry from "@principia/base/Z"
   */
  deferTry: typeof Z.deferTry
  /**
   * @rewriteStatic deferTryCatch_ from "@principia/base/Z"
   */
  deferTryCatch: typeof Z.deferTryCatch_
  /**
   * @rewriteStatic fail from "@principia/base/Z"
   */
  fail: typeof Z.fail
  /**
   * @rewriteStatic failCause from "@principia/base/Z"
   */
  failCause: typeof Z.failCause
  /**
   * @rewriteStatic failCause from "@principia/base/Z"
   */
  failCause: typeof Z.failCause
  /**
   * @rewriteStatic failCauseLazy from "@principia/base/Z"
   */
  failCauseLazy: typeof Z.failCauseLazy
  /**
   * @rewriteStatic failCauseLazy from "@principia/base/Z"
   */
  failCauseLazy: typeof Z.failCauseLazy
  /**
   * @rewriteStatic foreach_ from "@principia/base/Z"
   */
  foreach<W, S, R, E, A, B>(as: Iterable<A>, f: (a: A, i: number) => Z<W, S, S, R, E, B>): Z<W, S, S, R, E, C.Chunk<B>>
  /**
   * @rewriteStatic foreach from "@principia/base/Z"
   * @dataFirst foreach_
   */
  foreach<A, W, S, R, E, B>(
    f: (a: A, i: number) => Z<W, S, S, R, E, B>
  ): (as: Iterable<A>) => Z<W, S, S, R, E, C.Chunk<B>>
  /**
   * @rewriteStatic foreachUnit_ from "@principia/base/Z"
   */
  foreachUnit<A, W, S, R, E>(as: Iterable<A>, f: (a: A, i: number) => Z<W, S, S, R, E, void>): Z<W, S, S, R, E, void>
  /**
   * @rewriteStatic foreachUnit from "@principia/base/Z"
   * @dataFirst foreachUnit_
   */
  foreachUnit<A, W, S, R, E>(
    f: (a: A, i: number) => Z<W, S, S, R, E, void>
  ): (as: Iterable<A>) => Z<W, S, S, R, E, void>
  /**
   * @rewriteStatic fromEither from "@principia/base/Z"
   */
  fromEither: typeof Z.fromEither
  /**
   * @rewriteStatic fromEitherLazy from "@principia/base/Z"
   */
  fromEitherLazy: typeof Z.fromEitherLazy
  /**
   * @rewriteStatic fromOption from "@principia/base/Z"
   */
  fromOption: typeof Z.fromOption
  /**
   * @rewriteStatic fromOptionLazy from "@principia/base/Z"
   */
  fromOptionLazy: typeof Z.fromOptionLazy
  /**
   * @rewriteStatic gen from "@principia/base/Z"
   */
  gen: typeof Z.gen
  /**
   * @rewriteStatic get from "@principia/base/Z"
   */
  get: typeof Z.get
  /**
   * @rewriteStatic gets from "@principia/base/Z"
   */
  gets: typeof Z.gets
  /**
   * @rewriteStatic getsZ from "@principia/base/Z"
   */
  getsZ: typeof Z.getsZ
  /**
   * @rewriteStatic modify from "@principia/base/Z"
   */
  modify: typeof Z.modify
  /**
   * @rewriteStatic modifyEither from "@principia/base/Z"
   */
  modifyEither: typeof Z.modifyEither
  /**
   * @rewriteStatic pure from "@principia/base/Z"
   */
  pure: typeof Z.pure
  /**
   * @rewriteStatic put from "@principia/base/Z"
   */
  put: typeof Z.put
  /**
   * @rewriteStatic sequenceS from "@principia/base/Z"
   */
  sequenceS: typeof Z.sequenceS
  /**
   * @rewriteStatic sequenceT from "@principia/base/Z"
   */
  sequenceT: typeof Z.sequenceT
  /**
   * @rewriteStatic tell from "@principia/base/Z"
   */
  tell: typeof Z.tell
  /**
   * @rewriteStatic tellAll from "@principia/base/Z"
   */
  tellAll: typeof Z.tellAll
  /**
   * @rewriteStatic try from "@principia/base/Z"
   */
  try: typeof Z.try
  /**
   * @rewriteStatic tryCatch_ from "@principia/base/Z"
   */
  tryCatch: typeof Z.tryCatch_
  /**
   * @rewriteStatic unit from "@principia/base/Z"
   */
  unit: typeof Z.unit
}

declare module '@principia/base/Z' {
  export interface Z<W, S1, S2, R, E, A> {
    /**
     * @rewrite alt_ from "@principia/base/Z"
     */
    alt<W, S1, S2, R, E, A, W1, S3, R1, E1, A1>(
      this: Z<W, S1, S2, R, E, A>,
      fb: () => Z<W1, S1, S3, R1, E1, A1>
    ): Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1>
    /**
     * @rewrite bimap_ from "@principia/base/Z"
     */
    bimap<W, S1, S2, R, E, A, G, B>(this: Z<W, S1, S2, R, E, A>, f: (e: E) => G, g: (a: A) => B): Z<W, S1, S2, R, G, B>
    /**
     * @rewrite catchAll_ from "@principia/base/Z"
     */
    catchAll<W, S1, S2, R, E, A, S3, R1, E1, B>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
    ): Z<W, S1, S3, R & R1, E1, B | A>
    /**
     * @rewrite catchSome_ from "@principia/base/Z"
     */
    catchSome<W, S1, S2, R, E, A, S3, R1, E1, B>(
      this: Z<W, S1, S2, R, E, A>,
      f: (e: E) => Option<Z<W, S1, S3, R1, E1, B>>
    ): Z<W, S1, S2 | S3, R & R1, E | E1, B | A>
    /**
     * @rewrite censor_ from "@principia/base/Z"
     */
    censor<W, S1, S2, R, E, A, W1>(this: Z<W, S1, S2, R, E, A>, f: (ws: Chunk<W>) => Chunk<W1>): Z<W1, S1, S2, R, E, A>
    /**
     * @rewrite contramapState_ from "@principia/base/Z"
     */
    contramapState<W, S1, S2, R, E, A, S0>(this: Z<W, S1, S2, R, E, A>, f: (s: S0) => S1): Z<W, S0, S2, R, E, A>
    /**
     * @rewrite cross_ from "@principia/base/Z"
     */
    cross<W, S, R, E, A, R1, E1, B>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>
    ): Z<W, S, S, R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossFirst_ from "@principia/base/Z"
     */
    crossFirst<W, S, R, E, A, R1, E1, B>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>
    ): Z<W, S, S, R & R1, E | E1, A>
    /**
     * @rewrite crossPar_ from "@principia/base/Z"
     */
    crossPar<W, S, R, E, A, R1, E1, B>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>
    ): Z<W, S, S, R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossSecond_ from "@principia/base/Z"
     */
    crossSecond<W, S, R, E, A, R1, E1, B>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>
    ): Z<W, S, S, R & R1, E | E1, B>
    /**
     * @rewrite crossWith_ from "@principia/base/Z"
     */
    crossWith<W, S, R, E, A, R1, E1, B, C>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>,
      f: (a: A, b: B) => C
    ): Z<W, S, S, R & R1, E | E1, C>
    /**
     * @rewrite crossWithPar_ from "@principia/base/Z"
     */
    crossWithPar<W, S, R, E, A, R1, E1, B, C>(
      this: Z<W, S, S, R, E, A>,
      fb: Z<W, S, S, R1, E1, B>,
      f: (a: A, b: B) => C
    ): Z<W, S, S, R & R1, E | E1, C>
    /**
     * @rewriteGetter either from "@principia/base/Z"
     */
    either: Z<W, S1, S1 | S2, R, never, Either<E, A>>
    /**
     * @rewriteGetter erase from "@principia/base/Z"
     */
    erase: Z<never, S1, S2, R, E, A>
    /**
     * @rewrite give_ from "@principia/base/Z"
     */
    give<W, S1, S2, R, E, A, R0>(this: Z<W, S1, S2, R, E, A>, r: R0): Z<W, S1, S2, Erase<R, R0>, E, A>
    /**
     * @rewrite giveAll_ from "@principia/base/Z"
     */
    giveAll(r: R): Z<W, S1, S2, unknown, E, A>
    /**
     * @rewrite giveState_ from "@principia/base/Z"
     */
    giveState(s: S1): Z<W, unknown, S2, R, E, A>
    /**
     * @rewrite gives_ from "@principia/base/Z"
     */
    gives<W, S1, S2, R, E, A, R0>(this: Z<W, S1, S2, R, E, A>, f: (r0: R0) => R): Z<W, S1, S2, R0, E, A>
    /**
     * @rewriteGetter listen from "@principia/base/Z"
     */
    listen: Z<W, S1, S2, R, E, readonly [A, Chunk<W>]>
    /**
     * @rewrite listens_ from "@principia/base/Z"
     */
    listens<W, S1, S2, R, E, A, B>(
      this: Z<W, S1, S2, R, E, A>,
      f: (l: Chunk<W>) => B
    ): Z<W, S1, S2, R, E, readonly [A, B]>
    /**
     * @rewrite mapError_ from "@principia/base/Z"
     */
    mapError<W, S1, S2, R, E, A, G>(this: Z<W, S1, S2, R, E, A>, f: (e: E) => G): Z<W, S1, S2, R, G, A>
    /**
     * @rewrite mapState_ from "@principia/base/Z"
     */
    mapState<W, S1, S2, R, E, A, S3>(this: Z<W, S1, S2, R, E, A>, f: (s: S2) => S3): Z<W, S1, S3, R, E, A>
    /**
     * @rewrite match_ from "@principia/base/Z"
     */
    match<W, S1, S2, R, E, A, B, C>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (e: E) => B,
      onSuccess: (a: A) => C
    ): Z<W, S1, S2, R, never, B | C>
    /**
     * @rewrite matchCauseZ_ from "@principia/base/Z"
     */
    matchCauseZ<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
      onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchLogCauseZ_ from "@principia/base/Z"
     */
    matchLogCauseZ<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (ws: Chunk<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
      onSuccess: (ws: Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchLogZ_ from "@principia/base/Z"
     */
    matchLogZ<W, S1, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (ws: Chunk<W>, e: E) => Z<W1, S1, S3, R1, E1, B>,
      onSuccess: (ws: Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchZ_ from "@principia/base/Z"
     */
    matchZ<W, S1, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (e: E) => Z<W1, S1, S3, R1, E1, B>,
      onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite orElse_ from "@principia/base/Z"
     */
    orElse<W, S1, S2, R, E, A, S3, S4, R1, E1>(
      this: Z<W, S1, S2, R, E, A>,
      onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>
    ): Z<W, S1 & S3, S4 | S2, R & R1, E1, A>
    /**
     * @rewrite orElseEither_ from "@principia/base/Z"
     */
    orElseEither<W, S1, S2, R, E, A, S3, S4, R1, E1, A1>(
      this: Z<W, S1, S2, R, E, A>,
      that: Z<W, S3, S4, R1, E1, A1>
    ): Z<W, S1 & S3, S4 | S2, R & R1, E1, Either<A, A1>>
    /**
     * @rewrite repeatN_ from "@principia/base/Z"
     */
    repeatN<W, S1, S2 extends S1, R, E, A>(this: Z<W, S1, S2, R, E, A>, n: number): Z<W, S1, S2, R, E, A>
    /**
     * @rewrite repeatUntil_ from "@principia/base/Z"
     */
    repeatUntil<W, S1, S2 extends S1, R, E, A>(
      this: Z<W, S1, S2, R, E, A>,
      predicate: Predicate<A>
    ): Z<W, S1, S2, R, E, A>
    /**
     * @rewriteConstraint repeatUntilEquals_ from "@principia/base/Z"
     */
    repeatUntilEquals<W, S1, S2 extends S1, R, E, A>(
      this: Z<W, S1, S2, R, E, A>,
      E: Eq<A>
    ): (value: () => A) => Z<W, S1, S2, R, E, A>
    /**
     * @rewrite run_ from "@principia/base/Z"
     */
    run<W, S1, S2, A>(this: Z<W, S1, S2, unknown, never, A>, s: S1): readonly [S2, A]
    /**
     * @rewrite runAll_ from "@principia/base/Z"
     */
    runAll<W, S1, S2, E, A>(
      this: Z<W, S1, S2, unknown, E, A>,
      s: S1
    ): readonly [Chunk<W>, Either<Cause<E>, readonly [S2, A]>]
    /**
     * @rewrite runEither from "@principia/base/Z"
     */
    runEither<E, A>(this: Z<never, unknown, unknown, unknown, E, A>): Either<E, A>
    /**
     * @rewrite runReader_ from "@principia/base/Z"
     */
    runReader<W, R, A>(this: Z<W, unknown, never, R, never, A>, r: R): A
    /**
     * @rewrite runReaderEither_ from "@principia/base/Z"
     */
    runReaderEither<R, E, A>(this: Z<never, unknown, unknown, R, E, A>, env: R): Either<E, A>
    /**
     * @rewrite runResult from "@principia/base/Z"
     */
    runResult<W, A>(this: Z<W, unknown, unknown, unknown, never, A>): A
    /**
     * @rewrite runState_ from "@principia/base/Z"
     */
    runState<W, S1, S2, A>(this: Z<W, S1, S2, unknown, never, A>, s: S1): S2
    /**
     * @rewrite runStateResult_ from "@principia/base/Z"
     */
    runStateResult<W, S1, S2, A>(this: Z<W, S1, S2, unknown, never, A>, s: S1): A
    /**
     * @rewrite runWriter from "@principia/base/Z"
     */
    runWriter<W, A>(this: Z<W, unknown, unknown, unknown, never, A>): readonly [Chunk<W>, A]
    /**
     * @rewrite subsumeEither from "@principia/base/Z"
     */
    subsumeEither<W, S1, S2, R, E, E1, A>(this: Z<W, S1, S2, R, E, Either<E1, A>>): Z<W, S1, S2, R, E | E1, A>
    /**
     * @rewrite tap_ from "@principia/base/Z"
     */
    tap<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
      this: Z<W, S1, S2, R, E, A>,
      f: (a: A) => Z<W1, S2, S3, R1, E1, B>
    ): Z<W | W1, S1, S3, R1 & R, E1 | E, A>
    /**
     * @rewrite transform_ from "@principia/base/Z"
     */
    transform<W, S1, S2, R, E, A, S3, B>(
      this: Z<W, S1, S2, R, E, A>,
      f: (s: S2, a: A) => readonly [B, S3]
    ): Z<W, S1, S3, R, E, B>
    /**
     * @rewrite zip_ from "@principia/base/Z"
     */
    zip<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
      this: Z<W, S1, S2, R, E, A>,
      fb: Z<W1, S2, S3, Q, D, B>
    ): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]>
    /**
     * @rewrite zipFirst_ from "@principia/base/Z"
     */
    zipFirst<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
      this: Z<W, S1, S2, R, E, A>,
      fb: Z<W1, S2, S3, Q, D, B>
    ): Z<W | W1, S1, S3, Q & R, D | E, A>
    /**
     * @rewrite zipSecond from "@principia/base/Z"
     */
    zipSecond<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
      this: Z<W, S1, S2, R, E, A>,
      fb: Z<W1, S2, S3, Q, D, B>
    ): Z<W | W1, S1, S3, Q & R, D | E, B>
    /**
     * @rewrite zipWith_ from "@principia/base/Z"
     */
    zipWith<W, S1, S2, R, E, A, W1, S3, R1, E1, B, C>(
      this: Z<W, S1, S2, R, E, A>,
      fb: Z<W1, S2, S3, R1, E1, B>,
      f: (a: A, b: B) => C
    ): Z<W | W1, S1, S3, R1 & R, E1 | E, C>
  }
}
