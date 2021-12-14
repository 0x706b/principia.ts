import type * as As from '@principia/base/Async'
import type { Either } from '@principia/base/Either'
import type { Has, Tag } from '@principia/base/Has'
import type { Erase } from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Async: AsyncStaticOps
  export interface Async<R, E, A> extends As.Async<R, E, A> {}
  export interface UAsync<A> extends As.Async<unknown, never, A> {}
  export interface FAsync<E, A> extends As.Async<unknown, E, A> {}
  export interface RAsync<R, A> extends As.Async<R, never, A> {}
}

export interface AsyncStaticOps {
  /**
   * @rewriteStatic Applicative from "@principia/base/Async"
   */
  Applicative: typeof As.Applicative
  /**
   * @rewriteStatic ApplicativePar from "@principia/base/Async"
   */
  ApplicativePar: typeof As.ApplicativePar
  /**
   * @rewriteStatic Apply from "@principia/base/Async"
   */
  Apply: typeof As.Apply
  /**
   * @rewriteStatic ApplyPar from "@principia/base/Async"
   */
  ApplyPar: typeof As.ApplyPar
  /**
   * @rewriteStatic Functor from "@principia/base/Async"
   */
  Functor: typeof As.Functor
  /**
   * @rewriteStatic Monad from "@principia/base/Async"
   */
  Monad: typeof As.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Async"
   */
  MonoidalFunctor: typeof As.MonoidalFunctor
  /**
   * @rewriteStatic MonoidalFunctorPar from "@principia/base/Async"
   */
  MonoidalFunctorPar: typeof As.MonoidalFunctorPar
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Async"
   */
  SemimonoidalFunctor: typeof As.SemimonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctorPar from "@principia/base/Async"
   */
  SemimonoidalFunctorPar: typeof As.SemimonoidalFunctorPar
  /**
   * @rewriteStatic ask from "@principia/base/Async"
   */
  ask: typeof As.ask
  /**
   * @rewriteStatic asks from "@principia/base/Async"
   */
  asks: typeof As.asks
  /**
   * @rewriteStatic asksAsync from "@principia/base/Async"
   */
  asksAsync: typeof As.asksAsync
  /**
   * @rewriteStatic async from "@principia/base/Async"
   */
  async: typeof As.async
  /**
   * @rewriteStatic defer from "@principia/base/Async"
   */
  defer: typeof As.defer
  /**
   * @rewriteStatic done from "@principia/base/Async"
   */
  done: typeof As.done
  /**
   * @rewriteStatic doneLazy from "@principia/base/Async"
   */
  doneLazy: typeof As.doneLazy
  /**
   * @rewriteStatic fail from "@principia/base/Async"
   */
  fail: typeof As.fail
  /**
   * @rewriteStatic failLazy from "@principia/base/Async"
   */
  failLazy: typeof As.failLazy
  /**
   * @rewriteStatic gen from "@principia/base/Async"
   */
  gen: typeof As.gen
  /**
   * @rewriteStatic halt from "@principia/base/Async"
   */
  halt: typeof As.halt
  /**
   * @rewriteStatic haltLazy from "@principia/base/Async"
   */
  haltLazy: typeof As.haltLazy
  /**
   * @rewriteStatic interrupt from "@principia/base/Async"
   */
  interrupt: typeof As.interrupt
  /**
   * @rewriteStatic promise from "@principia/base/Async"
   */
  promise: typeof As.promise
  /**
   * @rewriteStatic succeed from "@principia/base/Async"
   */
  succeed: typeof As.succeed
  /**
   * @rewriteStatic succeedLazy from "@principia/base/Async"
   */
  succeedLazy: typeof As.succeedLazy
  /**
   * @rewriteStatic tryCatch from "@principia/base/Async"
   */
  tryCatch: typeof As.tryCatch
  /**
   * @rewriteStatic unit from "@principia/base/Async"
   */
  unit: typeof As.unit
}

declare module '@principia/base/Async' {
  export interface Async<R, E, A> {
    /**
     * @rewrite as_ from "@principia/base/Async"
     */
    ['$>']<R, E, A, B>(this: As.Async<R, E, A>, b: B): As.Async<R, E, B>
    /**
     * @rewrite crossSecondPar_ from "@principia/base/Async"
     */
    ['&>']<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, that: As.Async<R1, E1, B>): As.Async<R & R1, E | E1, B>
    /**
     * @rewrite crossSecond_ from "@principia/base/Async"
     */
    ['*>']<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, that: As.Async<R1, E1, B>): As.Async<R & R1, E | E1, B>
    /**
     * @rewrite map_ from "@principia/base/Async"
     */
    ['<$>']<R, E, A, B>(this: As.Async<R, E, A>, f: (a: A) => B): As.Async<R, E, B>
    /**
     * @rewrite crossFirstPar_ from "@principia/base/Async"
     */
    ['<&']<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, that: As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>
    /**
     * @rewrite crossPar_ from "@principia/base/Async"
     */
    ['<&>']<R, E, A, R1, E1, B>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>
    ): As.Async<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossFirst_ from "@principia/base/Async"
     */
    ['<*']<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, that: As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>
    /**
     * @rewrite cross_ from "@principia/base/Async"
     */
    ['<*>']<R, E, A, R1, E1, B>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>
    ): As.Async<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite chain_ from "@principia/base/Async"
     */
    ['>>=']<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (a: A) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, B>

    /**
     * @rewrite bimap_ from "@principia/base/Async"
     */
    bimap<R, E, A, E1, B>(this: As.Async<R, E, A>, f: (e: E) => E1, g: (a: A) => B): As.Async<R, E1, B>

    /**
     * @rewrite bracket_ from "@principia/base/Async"
     */
    bracket<R, E, A, R1, E1, A1, R2, E2>(
      this: As.Async<R, E, A>,
      use: (a: A) => As.Async<R1, E1, A1>,
      release: (a: A, exit: As.Exit<E1, A1>) => As.Async<R2, E2, any>
    ): As.Async<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite catchAll_ from "@principia/base/Async"
     */
    catchAll<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      f: (e: E) => As.Async<R1, E1, A1>
    ): As.Async<R & R1, E1, A | A1>

    /**
     * @rewrite catchAllCause_ from "@principia/base/Async"
     */
    catchAllCause<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      f: (cause: As.Cause<E>) => As.Async<R1, E1, A1>
    ): As.Async<R & R1, E1, A | A1>

    /**
     * @rewrite chain_ from "@principia/base/Async"
     */
    chain<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (a: A) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, B>

    /**
     * @rewrite cross_ from "@principia/base/Async"
     */
    cross<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, readonly [A, A1]>

    /**
     * @rewrite crossFirst_ from "@principia/base/Async"
     */
    crossFirst<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/Async"
     */
    crossFirstPar<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite crossPar_ from "@principia/base/Async"
     */
    crossPar<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, readonly [A, A1]>

    /**
     * @rewrite crossSecond_ from "@principia/base/Async"
     */
    crossSecond<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A1>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/Async"
     */
    crossSecondPar<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, A1>

    /**
     * @rewrite crossWith_ from "@principia/base/Async"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>,
      f: (a: A, b: B) => C
    ): As.Async<R & R1, E | E1, C>

    /**
     * @rewrite crossWithPar_ from "@principia/base/Async"
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>,
      f: (a: A, b: B) => C
    ): As.Async<R & R1, E | E1, C>

    /**
     * @rewrite either from "@principia/base/Async"
     */
    either<R, E, A>(this: As.Async<R, E, A>): As.Async<R, never, Either<E, A>>

    /**
     * @rewrite ensuring_ from "@principia/base/Async"
     */
    ensuring<R, E, A, R1>(this: As.Async<R, E, A>, finalizer: As.Async<R1, never, void>): As.Async<R & R1, E, A>

    /**
     * @rewrite flatten from "@principia/base/Async"
     */
    flatten<R, E, R1, E1, A>(this: As.Async<R, E, As.Async<R1, E1, A>>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite give_ from "@principia/base/Async"
     */
    give<R, E, A>(this: As.Async<R, E, A>, env: R): As.Async<unknown, E, A>

    /**
     * @rewrite giveService_ from "@principia/base/Async"
     */
    giveService<R, E, A, T>(this: As.Async<R, E, A>, tag: Tag<T>): (service: T) => As.Async<Erase<R, Has<T>>, E, A>

    /**
     * @rewriteConstraint giveServiceAsync_ from "@principia/base/Async"
     * @trace call
     */
    giveServiceAsync<R, E, A, T>(
      this: As.Async<R, E, A>,
      tag: Tag<T>
    ): <R1, E1>(service: As.Async<R1, E1, T>) => As.Async<Erase<R & R1, Has<T>>, E | E1, A>

    /**
     * @rewrite giveSome_ from "@principia/base/Async"
     * @trace call
     */
    giveSome<R0, E, A, R>(this: As.Async<R0, E, A>, r: R): As.Async<Erase<R0, R>, E, A>

    /**
     * @rewrite map_ from "@principia/base/Async"
     */
    map<R, E, A, B>(this: As.Async<R, E, A>, f: (a: A) => B): As.Async<R, E, B>

    /**
     * @rewrite mapError_ from "@principia/base/Async"
     */
    mapError<R, E, A, E1>(this: As.Async<R, E, A>, f: (e: E) => E1): As.Async<R, E1, A>

    /**
     * @rewrite match_ from "@principia/base/Async"
     */
    match<R, E, A, B, C>(
      this: As.Async<R, E, A>,
      onFailure: (e: E) => B,
      onSuccess: (a: A) => C
    ): As.Async<R, never, B | C>

    /**
     * @rewrite matchAsync_ from "@principia/base/Async"
     */
    matchAsync<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: As.Async<R, E, A>,
      onFailure: (e: E) => As.Async<R1, E1, A1>,
      onSuccess: (a: A) => As.Async<R2, E2, A2>
    ): As.Async<R & R1 & R2, E1 | E2, A1 | A2>

    /**
     * @rewrite matchCauseAsync_ from "@principia/base/Async"
     */
    matchCauseAsync<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: As.Async<R, E, A>,
      onFailure: (cause: As.Cause<E>) => As.Async<R1, E1, A1>,
      onSuccess: (a: A) => As.Async<R2, E2, A2>
    ): As.Async<R & R1 & R2, E1 | E2, A1 | A2>

    /**
     * @rewrite result from "@principia/base/Async"
     */
    result<R, E, A>(this: As.Async<R, E, A>): As.Async<R, never, As.Exit<E, A>>

    /**
     * @rewrite runAsync_ from "@principia/base/Async"
     */
    runAsync<E, A>(this: As.Async<unknown, E, A>, onExit?: (exit: As.Exit<E, A>) => void): () => void

    /**
     * @rewrite runAsyncEnv_ from "@principia/base/Async"
     */
    runAsyncEnv<R, E, A>(this: As.Async<R, E, A>, env: R, onExit?: (exit: As.Exit<E, A>) => void): () => void

    /**
     * @rewrite runPromise from "@principia/base/Async"
     */
    runPromise<A>(this: As.Async<unknown, never, A>): Promise<A>

    /**
     * @rewrite runPromiseExit from "@principia/base/Async"
     */
    runPromiseExit<E, A>(this: As.Async<unknown, E, A>): Promise<As.Exit<E, A>>

    /**
     * @rewrite runPromiseExitEnv_ from "@principia/base/Async"
     */
    runPromiseExitEnv<R, E, A>(this: As.Async<R, E, A>, env: R): Promise<As.Exit<E, A>>

    /**
     * @rewrite runPromiseExitInterrupt from "@principia/base/Async"
     */
    runPromiseExitInterrupt<E, A>(this: As.Async<unknown, E, A>): [Promise<As.Exit<E, A>>, () => void]

    /**
     * @rewrite runPromiseInterrupt from "@principia/base/Async"
     */
    runPromiseInterrupt<A>(this: As.Async<unknown, never, A>): [Promise<A>, () => void]

    /**
     * @rewrite subsumeEither from "@principia/base/Async"
     */
    subsumeEither<R, E, E1, A>(this: As.Async<R, E, Either<E1, A>>): As.Async<R, E | E1, A>

    /**
     * @rewrite tap_ from "@principia/base/Async"
     */
    tap<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (a: A) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite tapError_ from "@principia/base/Async"
     */
    tapError<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (e: E) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>
  }
}
