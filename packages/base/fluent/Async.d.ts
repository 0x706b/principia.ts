import type * as As from '@principia/base/Async'
import type { Either } from '@principia/base/Either'
import type { Has, Tag } from '@principia/base/Has'
import type { Erase } from '@principia/base/prelude'

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
     * @rewrite matchCauseAsync_ from "@principia/base/Async"
     */
    matchCauseAsync<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: As.Async<R, E, A>,
      onFailure: (cause: As.Cause<E>) => As.Async<R1, E1, A1>,
      onSuccess: (a: A) => As.Async<R2, E2, A2>
    ): As.Async<R & R1 & R2, E1 | E2, A1 | A2>

    /**
     * @rewrite matchAsync_ from "@principia/base/Async"
     */
    matchAsync<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: As.Async<R, E, A>,
      onFailure: (e: E) => As.Async<R1, E1, A1>,
      onSuccess: (a: A) => As.Async<R2, E2, A2>
    ): As.Async<R & R1 & R2, E1 | E2, A1 | A2>

    /**
     * @rewrite match_ from "@principia/base/Async"
     */
    match<R, E, A, B, C>(
      this: As.Async<R, E, A>,
      onFailure: (e: E) => B,
      onSuccess: (a: A) => C
    ): As.Async<R, never, B | C>

    /**
     * @rewrite catchAllCause_ from "@principia/base/Async"
     */
    catchAllCause<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      f: (cause: As.Cause<E>) => As.Async<R1, E1, A1>
    ): As.Async<R & R1, E1, A | A1>

    /**
     * @rewrite catchAll_ from "@principia/base/Async"
     */
    catchAll<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      f: (e: E) => As.Async<R1, E1, A1>
    ): As.Async<R & R1, E1, A | A1>

    /**
     * @rewrite crossPar_ from "@principia/base/Async"
     */
    crossPar<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, readonly [A, A1]>

    /**
     * @rewrite crossWithPar_ from "@principia/base/Async"
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>,
      f: (a: A, b: B) => C
    ): As.Async<R & R1, E | E1, C>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/Async"
     */
    crossFirstPar<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/Async"
     */
    crossSecondPar<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, A1>

    /**
     * @rewrite cross_ from "@principia/base/Async"
     */
    cross<R, E, A, R1, E1, A1>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, A1>
    ): As.Async<R & R1, E | E1, readonly [A, A1]>

    /**
     * @rewrite crossWith_ from "@principia/base/Async"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: As.Async<R, E, A>,
      that: As.Async<R1, E1, B>,
      f: (a: A, b: B) => C
    ): As.Async<R & R1, E | E1, C>

    /**
     * @rewrite crossFirst_ from "@principia/base/Async"
     */
    crossFirst<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite crossSecond_ from "@principia/base/Async"
     */
    crossSecond<R, E, A, R1, E1, A1>(this: As.Async<R, E, A>, that: As.Async<R1, E1, A1>): As.Async<R & R1, E | E1, A1>

    /**
     * @rewrite mapError_ from "@principia/base/Async"
     */
    mapError<R, E, A, E1>(this: As.Async<R, E, A>, f: (e: E) => E1): As.Async<R, E1, A>

    /**
     * @rewrite bimap_ from "@principia/base/Async"
     */
    bimap<R, E, A, E1, B>(this: As.Async<R, E, A>, f: (e: E) => E1, g: (a: A) => B): As.Async<R, E1, B>

    /**
     * @rewrite subsumeEither from "@principia/base/Async"
     */
    subsumeEither<R, E, E1, A>(this: As.Async<R, E, Either<E1, A>>): As.Async<R, E | E1, A>

    /**
     * @rewrite either from "@principia/base/Async"
     */
    either<R, E, A>(this: As.Async<R, E, A>): As.Async<R, never, Either<E, A>>

    /**
     * @rewrite map_ from "@principia/base/Async"
     */
    map<R, E, A, B>(this: As.Async<R, E, A>, f: (a: A) => B): As.Async<R, E, B>

    /**
     * @rewrite chain_ from "@principia/base/Async"
     */
    chain<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (a: A) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, B>

    /**
     * @rewrite flatten from "@principia/base/Async"
     */
    flatten<R, E, R1, E1, A>(this: As.Async<R, E, As.Async<R1, E1, A>>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite tap_ from "@principia/base/Async"
     */
    tap<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (a: A) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite tapError_ from "@principia/base/Async"
     */
    tapError<R, E, A, R1, E1, B>(this: As.Async<R, E, A>, f: (e: E) => As.Async<R1, E1, B>): As.Async<R & R1, E | E1, A>

    /**
     * @rewrite giveAll_ from "@principia/base/Async"
     */
    giveAll<R, E, A>(this: As.Async<R, E, A>, env: R): As.Async<unknown, E, A>

    /**
     * @rewrite give_ from "@principia/base/Async"
     * @trace call
     */
    give<R0, E, A, R>(this: As.Async<R0, E, A>, r: R): As.Async<Erase<R0, R>, E, A>

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
     * @rewrite bracket_ from "@principia/base/Async"
     */
    bracket<R, E, A, R1, E1, A1, R2, E2>(
      this: As.Async<R, E, A>,
      use: (a: A) => As.Async<R1, E1, A1>,
      release: (a: A, exit: As.Exit<E1, A1>) => As.Async<R2, E2, any>
    ): As.Async<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite ensuring_ from "@principia/base/Async"
     */
    ensuring<R, E, A, R1>(this: As.Async<R, E, A>, finalizer: As.Async<R1, never, void>): As.Async<R & R1, E, A>

    /**
     * @rewrite result from "@principia/base/Async"
     */
    result<R, E, A>(this: As.Async<R, E, A>): As.Async<R, never, As.Exit<E, A>>

    /**
     * @rewrite runPromiseExitEnv_ from "@principia/base/Async"
     */
    runPromiseExitEnv<R, E, A>(this: As.Async<R, E, A>, env: R): Promise<As.Exit<E, A>>

    /**
     * @rewrite runPromiseExit from "@principia/base/Async"
     */
    runPromiseExit<E, A>(this: As.Async<unknown, E, A>): [Promise<As.Exit<E, A>>, () => void]

    /**
     * @rewrite runAsync from "@principia/base/Async"
     */
    runAsync<E, A>(this: As.Async<unknown, E, A>, onExit?: (exit: As.Exit<E, A>) => void): () => void

    /**
     * @rewrite runAsyncEnv from "@principia/base/Async"
     */
    runAsyncEnv<R, E, A>(this: As.Async<R, E, A>, env: R, onExit?: (exit: As.Exit<E, A>) => void): () => void
  }
}
