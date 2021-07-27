import type { Cause } from '@principia/base/Cause'
import type { Either } from '@principia/base/Either'
import type { Has, Tag } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type { Option } from '@principia/base/Option'
import type { Erase } from '@principia/base/prelude'
import type { Cache } from '@principia/query/Cache'
import type { DataSourceAspect } from '@principia/query/DataSourceAspect'
import type { Described } from '@principia/query/Described'
import type { QueryContext } from '@principia/query/internal/QueryContext'

/* eslint typescript-sort-keys/interface: "error" */

declare module '@principia/query/Query' {
  interface Query<R, E, A> {
    /**
     * @rewrite as_ from "@principia/query/Query"
     */
    ['$>']<R, E, A, B>(this: Query<R, E, A>, b: B): Query<R, E, B>
    /**
     * @rewrite crossSecondPar_ from "@principia/query/Query"
     */
    ['&>']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite crossPar_ from "@principia/query/Query"
     */
    ['*>']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite map_ from "@principia/query/Query"
     */
    ['<$>']<R, E, A, B>(this: Query<R, E, A>, f: (a: A) => B): Query<R, E, B>
    /**
     * @rewrite crossFirstPar_ from "@principia/query/Query"
     */
    ['<&']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, A>
    /**
     * @rewrite crossPar_ from "@principia/query/Query"
     */
    ['<&>']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossFirst_ from "@principia/query/Query"
     */
    ['<*']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, A>
    /**
     * @rewrite cross_ from "@principia/query/Query"
     */
    ['<*>']<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite chain_ from "@principia/query/Query"
     */
    ['>>=']<R, E, A, R1, E1, B>(this: Query<R, E, A>, f: (a: A) => Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite mapDataSources_ from "@principia/query/Query"
     */
    ['@@']<R, E, A, R1>(this: Query<R, E, A>, f: DataSourceAspect<R1>): Query<R & R1, E, A>
    /**
     * @rewrite as_ from "@principia/query/Query"
     */
    as<R, E, A, B>(this: Query<R, E, A>, b: B): Query<R, E, B>
    /**
     * @rewrite bimap_ from "@principia/query/Query"
     */
    bimap<R, E, A, E1, B>(this: Query<R, E, A>, f: (e: E) => E1, g: (a: A) => B): Query<R, E1, B>
    /**
     * @rewriteGetter cached from "@principia/query/Query"
     */
    cached: Query<R, E, A>
    /**
     * @rewrite catchAll_ from "@principia/query/Query"
     */
    catchAll<R, E, A, R1, E1, B>(this: Query<R, E, A>, h: (e: E) => Query<R1, E1, B>): Query<R & R1, E1, A | B>
    /**
     * @rewrite catchAllCause_ from "@principia/query/Query"
     */
    catchAllCause<R, E, A, R1, E1, B>(
      this: Query<R, E, A>,
      h: (cause: Cause<E>) => Query<R1, E1, B>
    ): Query<R & R1, E1, A | B>
    /**
     * @rewrite chain_ from "@principia/query/Query"
     */
    chain<R, E, A, R1, E1, B>(this: Query<R, E, A>, f: (a: A) => Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite cross_ from "@principia/query/Query"
     */
    cross<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossBatched_ from "@principia/query/Query"
     */
    crossBatched<R, E, A, R1, E1, B>(
      this: Query<R, E, A>,
      that: Query<R1, E1, B>
    ): Query<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossFirst_ from "@principia/query/Query"
     */
    crossFirst<R, E, A, R1, E1, B>(this: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A>
    /**
     * @rewrite crossFirstBatched_ from "@principia/query/Query"
     */
    crossFirstBatched<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, A>
    /**
     * @rewrite crossFirstPar_ from "@principia/query/Query"
     */
    crossFirstPar<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, A>
    /**
     * @rewrite crossPar_ from "@principia/query/Query"
     */
    crossPar<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossSecond_ from "@principia/query/Query"
     */
    crossSecond<R, E, A, R1, E1, B>(this: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite crossSecondBatched_ from "@principia/query/Query"
     */
    crossSecondBatched<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite crossSecondPar_ from "@principia/query/Query"
     */
    crossSecondPar<R, E, A, R1, E1, B>(this: Query<R, E, A>, that: Query<R1, E1, B>): Query<R & R1, E | E1, B>
    /**
     * @rewrite crossWith_ from "@principia/query/Query"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: Query<R, E, A>,
      that: Query<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Query<R & R1, E | E1, C>
    /**
     * @rewrite crossWithBatched_ from "@principia/query/Query"
     */
    crossWithBatched<R, E, A, R1, E1, B, C>(
      this: Query<R, E, A>,
      that: Query<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Query<R & R1, E | E1, C>
    /**
     * @rewrite crossWithPar_ from "@principia/query/Query"
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: Query<R, E, A>,
      that: Query<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Query<R & R1, E | E1, C>
    /**
     * @rewrite either from "@principia/query/Query"
     */
    either<R, E, A>(this: Query<R, E, A>): Query<R, never, Either<E, A>>
    /**
     * @rewrite ensuring_ from "@principia/query/Query"
     */
    ensuring<R, E, A, R1>(this: Query<R, E, A>, finalizer: Query<R, never, any>): Query<R & R1, E, A>
    /**
     * @rewrite flatten from "@principia/query/Query"
     */
    flatten<R, E, R1, E1, A>(this: Query<R, E, Query<R1, E1, A>>): Query<R & R1, E | E1, A>
    /**
     * @rewrite get from "@principia/query/Query"
     */
    get<R, E, A>(this: Query<R, E, Option<A>>): Query<R, Option<E>, A>
    /**
     * @rewrite getError from "@principia/query/Query"
     */
    getError<R, E, A>(this: Query<R, Option<E>, A>): Query<R, E, Option<A>>
    /**
     * @rewrite getOrFail_ from "@principia/query/Query"
     */
    getOrFail<R, E, A, E1>(this: Query<R, E, Option<A>>, e: E1): Query<R, E | E1, A>
    /**
     * @rewrite give_ from "@principia/query/Query"
     */
    give<R0, E, A, R>(this: Query<R0, E, A>, r: Described<R>): Query<Erase<R0, R>, E, A>
    /**
     * @rewrite giveAll_ from "@principia/query/Query"
     */
    giveAll<R, E, A>(this: Query<R, E, A>, r: Described<R>): Query<unknown, E, A>
    /**
     * @rewrite giveLayer_ from "@principia/query/Query"
     */
    giveLayer<R, E, A, R1, E1, A1>(
      this: Query<R, E, A>,
      layer: Described<Layer<R1, E1, A1>>
    ): Query<Erase<R & R1, A1>, E | E1, A>
    /**
     * @rewriteContraint giveService_ from "@principia/query/Query"
     */
    giveService<R, E, A, T>(this: Query<R, E, A>, _: Tag<T>): (f: Described<T>) => Query<Erase<R, Has<T>>, E, A>
    /**
     * @rewriteContraint giveServiceIO_ from "@principia/query/Query"
     */
    giveServiceIO<R, E, A, T>(
      this: Query<R, E, A>,
      _: Tag<T>
    ): <R1, E1>(f: Described<IO<R1, E1, T>>) => Query<Erase<R & R1, Has<T>>, E | E1, A>
    /**
     * @rewrite gives_ from "@principia/query/Query"
     */
    gives<R, E, A, R0>(this: Query<R, E, A>, f: Described<(r0: R0) => R>): Query<R0, E, A>
    /**
     * @rewrite left from "@principia/query/Query"
     */
    left<R, E, A, B>(this: Query<R, E, Either<A, B>>): Query<R, Option<E>, A>
    /**
     * @rewrite leftOrFail_ from "@principia/query/Query"
     */
    leftOrFail<R, E, A, B, E1>(this: Query<R, E, Either<A, B>>, e: E1): Query<R, E | E1, A>
    /**
     * @rewrite leftOrFailWith_ from "@principia/query/Query"
     */
    leftOrFailWith<R, E, A, B, E1>(this: Query<R, E, Either<A, B>>, f: (right: B) => E1): Query<R, E | E1, A>
    /**
     * @rewrite map_ from "@principia/query/Query"
     */
    map<R, E, A, B>(this: Query<R, E, A>, f: (a: A) => B): Query<R, E, B>
    /**
     * @rewrite mapDataSources_ from "@principia/query/Query"
     */
    mapDataSources<R, E, A, R1>(this: Query<R, E, A>, f: DataSourceAspect<R1>): Query<R & R1, E, A>
    /**
     * @rewrite mapError_ from "@principia/query/Query"
     */
    mapError<R, E, A, E1>(this: Query<R, E, A>, f: (e: E) => E1): Query<R, E1, A>
    /**
     * @rewrite mapErrorCause_ from "@principia/query/Query"
     */
    mapErrorCause<R, E, A, E1>(this: Query<R, E, A>, h: (cause: Cause<E>) => Cause<E1>): Query<R, E1, A>
    /**
     * @rewrite match_ from "@principia/query/Query"
     */
    match<R, E, A, B, C>(
      this: Query<R, E, A>,
      onFailure: (error: E) => B,
      onSuccess: (a: A) => C
    ): Query<R, never, B | C>
    /**
     * @rewrite matchCauseQuery_ from "@principia/query/Query"
     */
    matchCauseQuery<R, E, A, R1, E1, B, R2, E2, C>(
      this: Query<R, E, A>,
      onFailure: (cause: Cause<E>) => Query<R1, E1, B>,
      onSuccess: (a: A) => Query<R2, E2, C>
    ): Query<R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewrite matchQuery_ from "@principia/query/Query"
     */
    matchQuery<R, E, A, R1, E1, B, R2, E2, C>(
      this: Query<R, E, A>,
      onFailure: (error: E) => Query<R1, E1, B>,
      onSuccess: (a: A) => Query<R2, E2, C>
    ): Query<R & R1 & R2, E1 | E2, B | C>
    /**
     * @rewriteGetter optional from "@principia/query/Query"
     */
    optional: Query<R, E, Option<A>>
    /**
     * @rewriteGetter orHalt from "@principia/query/Query"
     */
    orHalt: Query<R, never, A>
    /**
     * @rewrite orHaltWith_ from "@principia/query/Query"
     */
    orHaltWith<R, E, A>(this: Query<R, E, A>, f: (e: E) => Error): Query<R, never, A>
    /**
     * @rewrite refineOrHalt_ from "@principia/query/Query"
     */
    refineOrHalt<R, E, A, E1>(this: Query<R, E, A>, pf: (e: E) => Option<E1>): Query<R, E1, A>
    /**
     * @rewrite refineOrHaltWith_ from "@principia/query/Query"
     */
    refineOrHaltWith<R, E, A, E1>(this: Query<R, E, A>, pf: (e: E) => Option<E1>, f: (e: E) => unknown): Query<R, E1, A>
    /**
     * @rewrite right from "@principia/query/Query"
     */
    right<R, E, A, B>(this: Query<R, E, Either<A, B>>): Query<R, Option<E>, B>
    /**
     * @rewrite rightOrFail_ from "@principia/query/Query"
     */
    rightOrFail<R, E, A, B, E1>(this: Query<R, E, Either<A, B>>, e: E1): Query<R, E | E1, B>
    /**
     * @rewrite rightOrFailWith_ from "@principia/query/Query"
     */
    rightOrFailWith<R, E, A, B, E1>(ma: Query<R, E, Either<A, B>>, f: (left: A) => E1): Query<R, E | E1, B>
    /**
     * @rewrite run from "@principia/query/Query"
     */
    run<R, E, A>(this: Query<R, E, A>): IO<R, E, A>
    /**
     * @rewrite runCache_ from "@principia/query/Query"
     */
    runCache<R, E, A>(this: Query<R, E, A>, cache: Cache): IO<R, E, A>
    /**
     * @rewrite runContext_ from "@principia/query/Query"
     */
    runContext<R, E, A>(this: Query<R, E, A>, queryContext: QueryContext): IO<R, E, A>
    /**
     * @rewrite runLog from "@principia/query/Query"
     */
    runLog<R, E, A>(this: Query<R, E, A>): IO<R, E, readonly [Cache, A]>
    /**
     * @rewriteGetter sandbox from "@principia/query/Query"
     */
    sandbox: Query<R, Cause<E>, A>
    /**
     * @rewrite sandboxWith_ from "@principia/query/Query"
     */
    sandboxWith<R, E, A, R1, E1, B>(
      this: Query<R, E, A>,
      f: (query: Query<R, Cause<E>, A>) => Query<R1, Cause<E1>, B>
    ): Query<R & R1, E | E1, B>
    /**
     * @rewrite subsumeEither from "@principia/query/Query"
     */
    subsumeEither<R, E, E1, A>(this: Query<R, E, Either<E1, A>>): Query<R, E | E1, A>
    /**
     * @rewrite summarized_ from "@principia/query/Query"
     */
    summarized<R, E, A, R1, E1, B, C>(
      this: Query<R, E, A>,
      summary: IO<R1, E1, B>,
      f: (start: B, end: B) => C
    ): Query<R & R1, E | E1, readonly [C, A]>
    /**
     * @rewrite unrefine_ from "@principia/query/Query"
     */
    unrefine<R, E, A>(this: Query<R, E, A>, pf: (error: unknown) => Option<E>): Query<R, E, A>
    /**
     * @rewrite unrefineWith_ from "@principia/query/Query"
     */
    unrefineWith<R, E, A, E1>(
      this: Query<R, E, A>,
      pf: (error: unknown) => Option<E1>,
      f: (e: E) => E1
    ): Query<R, E1, A>
    /**
     * @rewrite unsandbox from "@principia/query/Query"
     */
    unsandbox<R, E, A>(this: Query<R, Cause<E>, A>): Query<R, E, A>
  }
}
