import type { Chunk } from '@principia/base/Chunk'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { Eq, Erase, Predicate } from '@principia/base/prelude'

declare module '@principia/base/Z' {
  export interface Z<W, S1, S2, R, E, A> {
    /**
     * @rewrite alt_ from "@principia/base/Z"
     */
    alt<W1, S1, S3, R1, E1, A1>(fb: () => Z<W1, S1, S3, R1, E1, A1>): Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1>
    /**
     * @rewrite bimap_ from "@principia/base/Z"
     */
    bimap<G, B>(f: (e: E) => G, g: (a: A) => B): Z<W, S1, S2, R, G, B>
    /**
     * @rewrite catchAll_ from "@principia/base/Z"
     */
    catchAll<S3, R1, E1, B>(onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>): Z<W, S1, S3, R & R1, E1, B | A>
    /**
     * @rewrite catchSome_ from "@principia/base/Z"
     */
    catchSome<S3, R1, E1, B>(f: (e: E) => Option<Z<W, S1, S3, R1, E1, B>>): Z<W, S1, S2 | S3, R & R1, E | E1, B | A>
    /**
     * @rewrite censor_ from "@principia/base/Z"
     */
    censor<W1>(f: (ws: Chunk<W>) => Chunk<W1>): Z<W1, S1, S2, R, E, A>
    /**
     * @rewrite contramapState_ from "@principia/base/Z"
     */
    contramapState<S0>(f: (s: S0) => S1): Z<W, S0, S2, R, E, A>
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
    give<R0>(r: R0): Z<W, S1, S2, Erase<R, R0>, E, A>
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
    gives<R0>(f: (r0: R0) => R): Z<W, S1, S2, R0, E, A>
    /**
     * @rewriteGetter listen from "@principia/base/Z"
     */
    listen: Z<W, S1, S2, R, E, readonly [A, Chunk<W>]>
    /**
     * @rewrite listens_ from "@principia/base/Z"
     */
    listens<B>(f: (l: Chunk<W>) => B): Z<W, S1, S2, R, E, readonly [A, B]>
    /**
     * @rewrite mapError_ from "@principia/base/Z"
     */
    mapError<G>(f: (e: E) => G): Z<W, S1, S2, R, G, A>
    /**
     * @rewrite mapState_ from "@principia/base/Z"
     */
    mapState<S3>(f: (s: S2) => S3): Z<W, S1, S3, R, E, A>
    /**
     * @rewrite match_ from "@principia/base/Z"
     */
    match<B, C>(onFailure: (e: E) => B, onSuccess: (a: A) => C): Z<W, S1, S2, R, never, B | C>
    /**
     * @rewrite matchCauseZ_ from "@principia/base/Z"
     */
    matchCauseZ<W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
      onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
      onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchLogCauseZ_ from "@principia/base/Z"
     */
    matchLogCauseZ<W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
      onFailure: (ws: Chunk<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
      onSuccess: (ws: Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchLogZ_ from "@principia/base/Z"
     */
    matchLogZ<W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
      onFailure: (ws: Chunk<W>, e: E) => Z<W1, S1, S3, R1, E1, B>,
      onSuccess: (ws: Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchZ_ from "@principia/base/Z"
     */
    matchZ<W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
      onFailure: (e: E) => Z<W1, S1, S3, R1, E1, B>,
      onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
    ): Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite orElse_ from "@principia/base/Z"
     */
    orElse<S3, S4, R1, E1>(onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>): Z<W, S1 & S3, S4 | S2, R & R1, E1, A>
    /**
     * @rewrite orElseEither_ from "@principia/base/Z"
     */
    orElseEither<S3, S4, R1, E1, A1>(that: Z<W, S3, S4, R1, E1, A1>): Z<W, S1 & S3, S4 | S2, R & R1, E1, Either<A, A1>>
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
    runWriter<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): readonly [Chunk<W>, A]
    /**
     * @rewrite subsumeEither from "@principia/base/Z"
     */
    subsumeEither<W, S1, S2, R, E, E1, A>(this: Z<W, S1, S2, R, E, Either<E1, A>>): Z<W, S1, S2, R, E | E1, A>
    /**
     * @rewrite tap_ from "@principia/base/Z"
     */
    tap<W1, S3, R1, E1, B>(f: (a: A) => Z<W1, S2, S3, R1, E1, B>): Z<W | W1, S1, S3, R1 & R, E1 | E, A>
    /**
     * @rewrite transform_ from "@principia/base/Z"
     */
    transform<S3, B>(f: (s: S2, a: A) => readonly [B, S3]): Z<W, S1, S3, R, E, B>
    /**
     * @rewrite zip_ from "@principia/base/Z"
     */
    zip<W1, S3, Q, D, B>(fb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]>
    /**
     * @rewrite zipFirst_ from "@principia/base/Z"
     */
    zipFirst<W1, S3, Q, D, B>(fb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, A>
    /**
     * @rewrite zipSecond from "@principia/base/Z"
     */
    zipSecond<W1, S3, Q, D, B>(fb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, B>
    /**
     * @rewrite zipWith_ from "@principia/base/Z"
     */
    zipWith<W1, S3, R1, E1, B, C>(
      fb: Z<W1, S2, S3, R1, E1, B>,
      f: (a: A, b: B) => C
    ): Z<W | W1, S1, S3, R1 & R, E1 | E, C>
  }
}
