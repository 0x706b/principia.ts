import type { Cache } from './Cache'
import type { DataSource } from './DataSource'
import type { DataSourceAspect } from './DataSourceAspect'
import type { Result } from './internal/Result'
import type { AnyRequest } from './Request'
import type { Has, Tag } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { _A, _E } from '@principia/base/prelude'
import type * as P from '@principia/base/prelude'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import * as Ex from '@principia/base/Exit'
import * as FR from '@principia/base/FiberRef'
import { flow, identity, pipe } from '@principia/base/function'
import { mergeEnvironments } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as Ca from '@principia/base/IO/Cause'
import * as It from '@principia/base/Iterable'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import { tuple } from '@principia/base/tuple'
import { matchTag } from '@principia/base/util/match'
import { isObject } from '@principia/base/util/predicates'

import { empty } from './Cache'
import { Described } from './Described'
import * as BlockedRequest from './internal/BlockedRequest'
import * as BRS from './internal/BlockedRequests'
import * as Cont from './internal/Continue'
import { QueryContext } from './internal/QueryContext'
import * as Res from './internal/Result'
import { QueryFailure } from './QueryFailure'

export const QueryTypeId = Symbol('@principia/query/Query')
export type QueryTypeId = typeof QueryTypeId

/**
 * A `Query<R, E, A>` is a purely functional description of an effectual query
 * that may contain requests from one or more data sources, requires an
 * environment `R`, and may fail with an `E` or succeed with an `A`.
 *
 * Requests that can be performed in parallel, as expressed by `map2Par` and
 * combinators derived from it, will automatically be batched. Requests that
 * must be performed sequentially, as expressed by `map2` and combinators
 * derived from it, will automatically be pipelined. This allows for aggressive
 * data source specific optimizations. Requests can also be deduplicated and
 * cached.
 *
 * This allows for writing queries in a high level, compositional style, with
 * confidence that they will automatically be optimized.
 */
export class Query<R, E, A> {
  readonly [QueryTypeId]: QueryTypeId = QueryTypeId
  constructor(readonly step: IO<readonly [R, QueryContext], never, Result<R, E, A>>) {}
}

export function isQuery(u: unknown): u is Query<unknown, unknown, unknown> {
  return isObject(u) && QueryTypeId in u
}

/*
 * -------------------------------------------
 * Run
 * -------------------------------------------
 */

/**
 * Returns an effect that models executing this query with the specified
 * context.
 */
export function runContext_<R, E, A>(ma: Query<R, E, A>, queryContext: QueryContext): I.IO<R, E, A> {
  return pipe(
    ma.step,
    I.gives((r: R) => [r, queryContext] as const),
    I.chain(
      matchTag({
        Blocked: ({ blockedRequests, cont }) =>
          I.crossSecond_(BRS.run_(blockedRequests, queryContext.cache), Cont.runContext_(cont, queryContext)),
        Done: ({ value }) => I.succeed(value),
        Fail: ({ cause }) => I.failCause(cause)
      })
    )
  )
}

/**
 * Returns an effect that models executing this query with the specified
 * context.
 */
export function runContext(queryContext: QueryContext): <R, E, A>(ma: Query<R, E, A>) => I.IO<R, E, A> {
  return (ma) => runContext_(ma, queryContext)
}

/**
 * Returns an effect that models executing this query with the specified
 * cache.
 */
export function runCache_<R, E, A>(ma: Query<R, E, A>, cache: Cache): I.IO<R, E, A> {
  return I.gen(function* (_) {
    const ref = yield* _(FR.make(true))
    return yield* _(runContext_(ma, new QueryContext(cache, ref)))
  })
}

/**
 * Returns an effect that models executing this query with the specified
 * cache.
 */
export function runCache(cache: Cache): <R, E, A>(ma: Query<R, E, A>) => I.IO<R, E, A> {
  return (ma) => runCache_(ma, cache)
}

/**
 * Returns an effect that models executing this query, returning the query
 * result along with the cache.
 */
export function runLog<R, E, A>(ma: Query<R, E, A>): I.IO<R, E, readonly [Cache, A]> {
  return I.gen(function* (_) {
    const cache = yield* _(empty)
    const a     = yield* _(runCache_(ma, cache))
    return [cache, a]
  })
}

export function run<R, E, A>(ma: Query<R, E, A>): I.IO<R, E, A> {
  return pipe(
    ma,
    runLog,
    I.map(([, a]) => a)
  )
}

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  h: (cause: Ca.Cause<E>) => Query<R1, E1, B>
): Query<R & R1, E1, A | B> {
  return matchCauseQuery_(ma, h, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause<E, R1, E1, B>(
  h: (cause: Ca.Cause<E>) => Query<R1, E1, B>
): <R, A>(ma: Query<R, E, A>) => Query<R & R1, E1, A | B> {
  return <R, A>(ma: Query<R, E, A>) => catchAllCause_(ma, h)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  h: (e: E) => Query<R1, E1, B>
): Query<R & R1, E1, A | B> {
  return matchQuery_(ma, h, succeed)
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R1, E1, B>(
  h: (e: E) => Query<R1, E1, B>
): <R, A>(ma: Query<R, E, A>) => Query<R & R1, E1, A | B> {
  return <R, A>(ma: Query<R, E, A>) => catchAll_(ma, h)
}

/**
 * A more powerful version of `matchM` that allows recovering from any type
 * of failure except interruptions.
 */
export function matchCauseQuery_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Query<R, E, A>,
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R2, E2, C>
): Query<R & R1 & R2, E1 | E2, B | C> {
  return new Query(
    I.matchCauseIO_(
      ma.step,
      (_) => onFailure(_).step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) =>
          I.succeed(Res.blocked(blockedRequests, Cont.matchCauseQuery_(cont, onFailure, onSuccess))) as Query<
            R & R1 & R2,
            E1 | E2,
            B | C
          >['step'],
        Done: ({ value }) => onSuccess(value).step,
        Fail: ({ cause }) => onFailure(cause).step
      })
    )
  )
}

/**
 * A more powerful version of `matchM` that allows recovering from any type
 * of failure except interruptions.
 */
export function matchCauseQuery<E, A, R1, E1, B, C>(
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, C>
): <R>(ma: Query<R, E, A>) => Query<R & R1, E1, B | C> {
  return (ma) => matchCauseQuery_(ma, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 */
export function matchQuery_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Query<R, E, A>,
  onFailure: (error: E) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R2, E2, C>
): Query<R & R1 & R2, E1 | E2, B | C> {
  return matchCauseQuery_(ma, flow(Ca.failureOrCause, E.match(onFailure, failCause)), onSuccess)
}

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 */
export function matchQuery<E, A, R1, E1, B, C>(
  onFailure: (error: E) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, C>
): <R>(ma: Query<R, E, A>) => Query<R & R1, E1, B | C> {
  return (ma) => matchQuery_(ma, onFailure, onSuccess)
}

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 */
export function match_<R, E, A, B, C>(
  ma: Query<R, E, A>,
  onFailure: (error: E) => B,
  onSuccess: (a: A) => C
): Query<R, never, B | C> {
  return matchQuery_(
    ma,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  )
}

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 */
export function match<E, A, B, C>(
  onFailure: (error: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Query<R, E, A>) => Query<R, never, B | C> {
  return (ma) => match_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Sequential Apply
 * -------------------------------------------
 */

export function ap_<R, E, A, R1, E1, B>(fab: Query<R, E, (a: A) => B>, fa: Query<R1, E1, A>): Query<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => crossSecond_(fa, fb)
}

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query<R & R1, E | E1, C>(
    I.chain_(
      fa.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => {
          if (cont._tag === 'Effect') {
            return I.succeed(Res.blocked(blockedRequests, Cont.effect(crossWith_(cont.query, fb, f))))
          } else {
            return I.map_(
              fb.step,
              matchTag({
                Blocked: (br) =>
                  Res.blocked(BRS.then(blockedRequests, br.blockedRequests), Cont.crossWith_(cont, br.cont, f)),
                Done: ({ value }) =>
                  Res.blocked(
                    blockedRequests,
                    Cont.map_(cont, (a) => f(a, value))
                  ),
                Fail: ({ cause }) => Res.failCause(cause)
              })
            )
          }
        },
        Done: (a) =>
          I.map_(
            fb.step,
            matchTag({
              Blocked: ({ blockedRequests, cont }) =>
                Res.blocked(
                  blockedRequests,
                  Cont.map_(cont, (b) => f(a.value, b))
                ),
              Done: (b) => Res.done(f(a.value, b.value)),
              Fail: (e) => Res.failCause(e.cause)
            })
          ),
        Fail: ({ cause }) => I.succeed(Res.failCause(cause))
      })
    )
  )
}

export function crossWith<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------
 * Parallel Apply
 * -------------------------------------------
 */

export function apPar_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return crossWithPar_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function crossFirstPar_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return crossWithPar_(fa, fb, (a, _) => a)
}

export function crossFirstPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => crossFirstPar_(fa, fb)
}

export function crossSecondPar_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return crossWithPar_(fa, fb, (_, b) => b)
}

export function crossSecondPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => crossSecondPar_(fa, fb)
}

export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query<R & R1, E | E1, C>(
    I.crossWithPar_(fa.step, fb.step, (ra, rb) => {
      return ra._tag === 'Blocked'
        ? rb._tag === 'Blocked'
          ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.crossWithPar_(ra.cont, rb.cont, f))
          : rb._tag === 'Done'
          ? Res.blocked(
              ra.blockedRequests,
              Cont.map_(ra.cont, (a) => f(a, rb.value))
            )
          : Res.failCause(rb.cause)
        : ra._tag === 'Done'
        ? rb._tag === 'Blocked'
          ? Res.blocked(
              rb.blockedRequests,
              Cont.map_(rb.cont, (b) => f(ra.value, b))
            )
          : rb._tag === 'Done'
          ? Res.done(f(ra.value, rb.value))
          : Res.failCause(rb.cause)
        : rb._tag === 'Fail'
        ? Res.failCause(Ca.both(ra.cause, rb.cause))
        : Res.failCause(ra.cause)
    })
  )
}

export function crossWithPar<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function crossPar_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

export function crossPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

/*
 * -------------------------------------------
 * Batched Apply
 * -------------------------------------------
 */

export function apBatched_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return crossWithBatched_(fab, fa, (f, a) => f(a))
}

export function apBatched<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apBatched_(fab, fa)
}

export function crossFirstBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, A> {
  return crossWithBatched_(fa, fb, (a, _) => a)
}

export function crossFirstBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => crossFirstBatched_(fa, fb)
}

export function crossSecondBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return crossWithBatched_(fa, fb, (_, b) => b)
}

export function crossSecondBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => crossSecondBatched_(fa, fb)
}

export function crossWithBatched_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query<R & R1, E | E1, C>(
    I.crossWith_(fa.step, fb.step, (ra, rb) => {
      return ra._tag === 'Blocked'
        ? rb._tag === 'Blocked'
          ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.crossWithBatched_(ra.cont, rb.cont, f))
          : rb._tag === 'Done'
          ? Res.blocked(
              ra.blockedRequests,
              Cont.map_(ra.cont, (a) => f(a, rb.value))
            )
          : Res.failCause(rb.cause)
        : ra._tag === 'Done'
        ? rb._tag === 'Blocked'
          ? Res.blocked(
              rb.blockedRequests,
              Cont.map_(rb.cont, (b) => f(ra.value, b))
            )
          : rb._tag === 'Done'
          ? Res.done(f(ra.value, rb.value))
          : Res.failCause(rb.cause)
        : rb._tag === 'Fail'
        ? Res.failCause(Ca.both(ra.cause, rb.cause))
        : Res.failCause(ra.cause)
    })
  )
}

export function crossWithBatched<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWithBatched_(fa, fb, f)
}

export function crossBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWithBatched_(fa, fb, tuple)
}

export function crossBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossBatched_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, E1, B>(pab: Query<R, E, A>, f: (e: E) => E1, g: (a: A) => B): Query<R, E1, B> {
  return matchQuery_(pab, flow(f, fail), flow(g, succeed))
}

export function bimap<E, A, E1, B>(f: (e: E) => E1, g: (a: A) => B): <R>(pab: Query<R, E, A>) => Query<R, E1, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<R, E, A, E1>(pab: Query<R, E, A>, f: (e: E) => E1): Query<R, E1, A> {
  return bimap_(pab, f, identity)
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(pab: Query<R, E, A>) => Query<R, E1, A> {
  return (pab) => mapError_(pab, f)
}

export function mapErrorCause_<R, E, A, E1>(
  pab: Query<R, E, A>,
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): Query<R, E1, A> {
  return matchCauseQuery_(pab, flow(h, failCause), succeed)
}

export function mapErrorCause<E, E1>(
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): <R, A>(pab: Query<R, E, A>) => Query<R, E1, A> {
  return (pab) => mapErrorCause_(pab, h)
}

/*
 * -------------------------------------------
 * MonadExcept
 * -------------------------------------------
 */

export function subsumeEither<R, E, E1, A>(v: Query<R, E, E.Either<E1, A>>): Query<R, E | E1, A> {
  return chain_(v, fromEither)
}

export function either<R, E, A>(ma: Query<R, E, A>): Query<R, never, E.Either<E, A>> {
  return match_(ma, E.left, E.right)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function as_<R, E, A, B>(fa: Query<R, E, A>, b: B): Query<R, E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <R, E, A>(fa: Query<R, E, A>) => Query<R, E, B> {
  return (fa) => as_(fa, b)
}

export function map_<R, E, A, B>(fa: Query<R, E, A>, f: (a: A) => B): Query<R, E, B> {
  return new Query(I.map_(fa.step, Res.map(f)))
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Query<R, E, A>) => Query<R, E, B> {
  return (fa) => map_(fa, f)
}

export function mapDataSources_<R, E, A, R1>(fa: Query<R, E, A>, f: DataSourceAspect<R1>): Query<R & R1, E, A> {
  return new Query(I.map_(fa.step, Res.mapDataSources(f)))
}

export function mapDataSources<R1>(f: DataSourceAspect<R1>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E, A> {
  return (fa) => mapDataSources_(fa, f)
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function defer<R, E, A>(query: () => Query<R, E, A>): Query<R, E, A> {
  return flatten(fromIO(I.succeedLazy(query)))
}

export function halt(error: unknown): Query<unknown, never, never> {
  return new Query(I.halt(error))
}

export function fail<E>(error: E): Query<unknown, E, never> {
  return failCause(Ca.fail(error))
}

export function fromIO<R, E, A>(effect: IO<R, E, A>): Query<R, E, A> {
  return new Query(
    pipe(
      effect,
      I.matchCause(Res.failCause, Res.done),
      I.gives(([r, _]) => r)
    )
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): Query<unknown, E, A> {
  return pipe(succeed(either), chain(E.match(fail, succeed)))
}

export function fromOption<A>(option: M.Maybe<A>): Query<unknown, M.Maybe<never>, A> {
  return pipe(succeed(option), chain(M.match(() => fail(M.nothing()), succeed)))
}

export function fromRequest<R, A extends AnyRequest>(request: A, dataSource: DataSource<R, A>): Query<R, _E<A>, _A<A>> {
  return new Query(
    pipe(
      I.ask<readonly [R, QueryContext]>(),
      I.chain(([, queryContext]) =>
        I.chain_(FR.get(queryContext.cachingEnabled), (cachingEnabled) => {
          if (cachingEnabled) {
            return I.chain_(
              queryContext.cache.lookup(request),
              E.match(
                (ref) =>
                  I.succeed(
                    Res.blocked(
                      BRS.single(dataSource, BlockedRequest.make(request, ref)),
                      Cont.make(request, dataSource, ref)
                    )
                  ),
                (ref) =>
                  I.map_(
                    ref.get,
                    M.match(() => Res.blocked(BRS.empty, Cont.make(request, dataSource, ref)), Res.fromEither)
                  )
              )
            )
          } else {
            return I.map_(Ref.make<M.Maybe<E.Either<_E<A>, _A<A>>>>(M.nothing()), (ref) =>
              Res.blocked(
                BRS.single(dataSource, BlockedRequest.make(request, ref)),
                Cont.make(request, dataSource, ref)
              )
            )
          }
        })
      )
    )
  )
}

export function fromRequestUncached<R, A extends AnyRequest>(
  request: A,
  dataSource: DataSource<R, A>
): Query<R, _E<A>, _A<A>> {
  return new Query(
    pipe(
      Ref.make(M.nothing<E.Either<_E<A>, _A<A>>>()),
      I.map((ref) =>
        Res.blocked(BRS.single(dataSource, BlockedRequest.make(request, ref)), Cont.make(request, dataSource, ref))
      )
    )
  )
}

export function failCause<E>(cause: Ca.Cause<E>): Query<unknown, E, never> {
  return new Query(I.succeed(Res.failCause(cause)))
}

export const never: Query<unknown, never, never> = fromIO(I.never)

export function nothing<A = never>(): Query<unknown, never, M.Maybe<A>> {
  return succeed(M.nothing())
}

export function succeed<A>(value: A): Query<unknown, never, A> {
  return new Query(I.succeed(Res.done(value)))
}

export function just<A>(a: A): Query<unknown, never, M.Maybe<A>> {
  return succeed(M.just(a))
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function chain_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return new Query<R & R1, E | E1, B>(
    I.chain_(
      ma.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => I.succeed(Res.blocked(blockedRequests, Cont.mapQuery_(cont, f))),
        Done: ({ value }) => f(value).step,
        Fail: ({ cause }) => I.succeed(Res.failCause(cause))
      })
    )
  )
}

export function chain<A, R1, E1, B>(
  f: (a: A) => Query<R1, E1, B>
): <R, E>(ma: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Query<R, E, Query<R1, E1, A>>): Query<R & R1, E | E1, A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Query<R, never, R> {
  return fromIO(I.ask())
}

export function asks<R, A>(f: (_: R) => A): Query<R, never, A> {
  return pipe(ask<R>(), map(f))
}

export function asksQuery<R0, R, E, A>(f: (_: R0) => Query<R, E, A>): Query<R0 & R, E, A> {
  return pipe(ask<R0>(), chain(f))
}

export function gives_<R, E, A, R0>(ra: Query<R, E, A>, f: Described<(r0: R0) => R>): Query<R0, E, A> {
  return new Query(
    pipe(
      ra.step,
      I.map((r) => Res.gives_(r, f)),
      I.gives(([r0, qc]) => [f.value(r0), qc] as const)
    )
  )
}

export function gives<R, R0>(f: Described<(r0: R0) => R>): <E, A>(ra: Query<R, E, A>) => Query<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function giveAll_<R, E, A>(ra: Query<R, E, A>, r: Described<R>): Query<unknown, E, A> {
  return gives_(
    ra,
    Described(() => r.value, `() => ${r.description}`)
  )
}

export function giveAll<R>(r: Described<R>): <E, A>(ra: Query<R, E, A>) => Query<unknown, E, A> {
  return (ra) => giveAll_(ra, r)
}

export function give_<E, A, R = unknown, R0 = unknown>(ra: Query<R & R0, E, A>, r: Described<R>): Query<R0, E, A> {
  return gives_(
    ra,
    Described((r0: R0) => ({ ...r0, ...r.value }), r.description)
  )
}

export function give<R>(r: Described<R>): <E, A, R0 = unknown>(ra: Query<R & R0, E, A>) => Query<R0, E, A> {
  return (ra) => give_(ra, r)
}

export function giveLayer_<R, E, A, R1, E1, A1>(
  ra: Query<R & A1, E, A>,
  layer: Described<L.Layer<R1, E1, A1>>
): Query<R & R1, E | E1, A> {
  return new Query(
    pipe(
      L.build(layer.value),
      Ma.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
      Ma.result,
      Ma.use(
        Ex.matchIO(
          (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(Res.failCause(c)),
          (r) =>
            gives_(
              ra,
              Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
            ).step
        )
      )
    )
  )
}

export function giveLayer<R1, E1, A1>(
  layer: Described<L.Layer<R1, E1, A1>>
): <R, E, A>(ra: Query<R & A1, E, A>) => Query<R & R1, E | E1, A> {
  return <R, E, A>(ra: Query<R & A1, E, A>) =>
    new Query(
      pipe(
        L.build(layer.value),
        Ma.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
        Ma.result,
        Ma.use(
          Ex.matchIO(
            (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(Res.failCause(c)),
            (r) =>
              gives_(
                ra,
                Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
              ).step
          )
        )
      )
    )
}

export function giveServiceIO_<T>(
  _: Tag<T>
): <R, E, A, R1, E1>(ma: Query<R & Has<T>, E, A>, f: Described<IO<R1, E1, T>>) => Query<R & R1, E | E1, A> {
  return <R, E, A, R1, E1>(ma: Query<R & Has<T>, E, A>, f: Described<IO<R1, E1, T>>): Query<R & R1, E | E1, A> =>
    asksQuery((r: R & R1) =>
      chain_(fromIO(f.value), (t) => giveAll_(ma, Described(mergeEnvironments(_, r, t), f.description)))
    )
}

export function giveServiceIO<T>(_: Tag<T>) {
  return <R, E>(f: Described<IO<R, E, T>>) =>
    <R1, E1, A1>(ma: Query<R1 & Has<T>, E1, A1>): Query<R & R1, E | E1, A1> =>
      giveServiceIO_(_)(ma, f)
}

export function giveService_<T>(_: Tag<T>): <R, E, A>(ma: Query<R & Has<T>, E, A>, f: Described<T>) => Query<R, E, A> {
  return (ma, f) => giveServiceIO_(_)(ma, Described(I.succeed(f.value), f.description))
}

export function giveService<T>(
  _: Tag<T>
): (f: Described<T>) => <R1, E1, A1>(ma: Query<R1 & Has<T>, E1, A1>) => Query<R1, E1, A1> {
  return (f) => (ma) => giveService_(_)(ma, f)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function partitionQuery_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return pipe(as, foreach(flow(f, either)), map(A.partitionMap(identity)))
}

export function partitionQuery<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitionQuery_(as, f)
}

export function partitonParQuery_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return pipe(as, foreachPar(flow(f, either)), map(A.partitionMap(identity)))
}

export function partitionParQuery<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitonParQuery_(as, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

function queryContext(): Query<unknown, never, QueryContext> {
  return new Query(I.asks(([, queryContext]) => Res.done(queryContext)))
}

export function cached<R, E, A>(ma: Query<R, E, A>): Query<R, E, A> {
  return gen(function* (_) {
    const context        = yield* _(queryContext())
    const cachingEnabled = yield* _(fromIO(FR.getAndSet_(context.cachingEnabled, true)))
    return yield* _(ensuring_(ma, fromIO(FR.set_(context.cachingEnabled, cachingEnabled))))
  })
}

export function ensuring_<R, E, A, R1>(ma: Query<R, E, A>, finalizer: Query<R, never, any>): Query<R & R1, E, A> {
  return matchCauseQuery_(
    ma,
    (cause1) =>
      matchCauseQuery_(
        finalizer,
        (cause2) => failCause(Ca.then(cause1, cause2)),
        (_) => failCause(cause1)
      ),
    (value) =>
      matchCauseQuery_(
        finalizer,
        (cause) => failCause(cause),
        () => succeed(value)
      )
  )
}

export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => crossWith_(b, f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreach<A, R, E, B>(f: (a: A) => Query<R, E, B>): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function foreachPar_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => crossWithPar_(b, f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreachPar<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f)
}

export function foreachBatched_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) =>
      crossWithBatched_(b, f(a), (bs, b) => A.append(b)(bs))
    )
  )
}

export function foreachBatched<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreachBatched_(as, f)
}

export function getError<R, E, A>(ma: Query<R, M.Maybe<E>, A>): Query<R, E, M.Maybe<A>> {
  return matchQuery_(ma, M.match(nothing, fail), just)
}

export function get<R, E, A>(ma: Query<R, E, M.Maybe<A>>): Query<R, M.Maybe<E>, A> {
  return matchQuery_(
    ma,
    flow(M.just, fail),
    M.match(() => fail(M.nothing()), succeed)
  )
}

export function getOrFail_<R, E, A, E1>(ma: Query<R, E, M.Maybe<A>>, e: E1): Query<R, E | E1, A> {
  return chain_(
    ma,
    M.match(() => fail(e), succeed)
  )
}

export function getOrFail<E1>(e: E1): <R, E, A>(ma: Query<R, E, M.Maybe<A>>) => Query<R, E | E1, A> {
  return (ma) => getOrFail_(ma, e)
}

export function left<R, E, A, B>(ma: Query<R, E, E.Either<A, B>>): Query<R, M.Maybe<E>, A> {
  return matchQuery_(
    ma,
    flow(M.just, fail),
    E.match(succeed, () => fail(M.nothing()))
  )
}

export function right<R, E, A, B>(ma: Query<R, E, E.Either<A, B>>): Query<R, M.Maybe<E>, B> {
  return matchQuery_(
    ma,
    flow(M.just, fail),
    E.match(() => fail(M.nothing()), succeed)
  )
}

export function leftOrFail_<R, E, A, B, E1>(ma: Query<R, E, E.Either<A, B>>, e: E1): Query<R, E | E1, A> {
  return chain_(
    ma,
    E.match(succeed, () => fail(e))
  )
}

export function leftOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, A> {
  return (ma) => leftOrFail_(ma, e)
}

export function leftOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (right: B) => E1
): Query<R, E | E1, A> {
  return chain_(ma, E.match(succeed, flow(f, fail)))
}

export function leftOrFailWith<B, E1>(
  f: (right: B) => E1
): <R, E, A>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, A> {
  return (ma) => leftOrFailWith_(ma, f)
}

export function optional<R, E, A>(ma: Query<R, E, A>): Query<R, E, M.Maybe<A>> {
  return matchCauseQuery_(
    ma,
    flow(
      Ca.filterDefects((_) => !(_ instanceof QueryFailure)),
      M.match(() => nothing(), failCause)
    ),
    just
  )
}

export function orHaltWith_<R, E, A>(ma: Query<R, E, A>, f: (e: E) => unknown): Query<R, never, A> {
  return matchQuery_(ma, flow(f, halt), succeed)
}

export function orHaltWith<E>(f: (e: E) => unknown): <R, A>(ma: Query<R, E, A>) => Query<R, never, A> {
  return (ma) => matchQuery_(ma, flow(f, halt), succeed)
}

export function orHalt<R, E, A>(ma: Query<R, E, A>): Query<R, never, A> {
  return orHaltWith_(ma, identity)
}

export function refineOrHalt_<R, E, A, E1>(ma: Query<R, E, A>, pf: (e: E) => M.Maybe<E1>): Query<R, E1, A> {
  return refineOrHaltWith_(ma, pf, identity)
}

export function refineOrHalt<E extends Error, E1>(
  pf: (e: E) => M.Maybe<E1>
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => refineOrHalt_(ma, pf)
}

export function refineOrHaltWith_<R, E, A, E1>(
  ma: Query<R, E, A>,
  pf: (e: E) => M.Maybe<E1>,
  f: (e: E) => unknown
): Query<R, E1, A> {
  return catchAll_(ma, (e) =>
    pipe(
      pf(e),
      M.match(() => halt(f(e)), fail)
    )
  )
}

export function refineOrHaltWith<E, E1>(
  pf: (e: E) => M.Maybe<E1>,
  f: (e: E) => unknown
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => refineOrHaltWith_(ma, pf, f)
}

export function rightOrFail_<R, E, A, B, E1>(ma: Query<R, E, E.Either<A, B>>, e: E1): Query<R, E | E1, B> {
  return chain_(
    ma,
    E.match(() => fail(e), succeed)
  )
}

export function rightOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFail_(ma, e)
}

export function rightOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (left: A) => E1
): Query<R, E | E1, B> {
  return chain_(ma, E.match(flow(f, fail), succeed))
}

export function rightOrFailWith<A, E1>(
  f: (left: A) => E1
): <R, E, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFailWith_(ma, f)
}

export function sandbox<R, E, A>(ma: Query<R, E, A>): Query<R, Ca.Cause<E>, A> {
  return matchCauseQuery_(ma, fail, succeed)
}

export function unsandbox<R, E, A>(v: Query<R, Ca.Cause<E>, A>): Query<R, E, A> {
  return mapErrorCause_(v, Ca.flatten)
}

export function sandboxWith_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  f: (query: Query<R, Ca.Cause<E>, A>) => Query<R1, Ca.Cause<E1>, B>
): Query<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)))
}

export function sandboxWith<R, E, A, R1, E1, B>(
  f: (query: Query<R, Ca.Cause<E>, A>) => Query<R1, Ca.Cause<E1>, B>
): (ma: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (ma) => sandboxWith_(ma, f)
}

export function summarized_<R, E, A, R1, E1, B, C>(
  ma: Query<R, E, A>,
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): Query<R & R1, E | E1, readonly [C, A]> {
  return pipe(
    fromIO(summary),
    cross(ma),
    crossWith(fromIO(summary), ([start, value], end) => [f(start, end), value])
  )
}

export function summarized<R1, E1, B, C>(
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(ma: Query<R, E, A>) => Query<R & R1, E | E1, readonly [C, A]> {
  return (ma) => summarized_(ma, summary, f)
}

export function unrefineWith_<R, E, A, E1>(
  ma: Query<R, E, A>,
  pf: (error: unknown) => M.Maybe<E1>,
  f: (e: E) => E1
): Query<R, E1, A> {
  return catchAllCause_(ma, (cause) =>
    pipe(
      cause,
      Ca.find(pf),
      M.match(() => pipe(cause, Ca.map(f), failCause), fail)
    )
  )
}

export function unrefineWith<E, E1>(
  pf: (error: unknown) => M.Maybe<E1>,
  f: (e: E) => E1
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => unrefineWith_(ma, pf, f)
}

export function unrefine_<R, E, A>(ma: Query<R, E, A>, pf: (error: unknown) => M.Maybe<E>): Query<R, E, A> {
  return unrefineWith_(ma, pf, identity)
}

export function unrefine<E>(pf: (error: unknown) => M.Maybe<E>): <R, A>(ma: Query<R, E, A>) => Query<R, E, A> {
  return (ma) => unrefine_(ma, pf)
}

export class GenQuery<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly Q: Query<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenQuery<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (I.isIO(_)) {
    return new GenQuery(fromIO(_))
  }
  return new GenQuery(_)
}

export function gen<T extends GenQuery<any, any, any>, A>(
  f: (i: {
    <R, E, A>(_: Query<R, E, A>): GenQuery<R, E, A>
    <R, E, A>(_: IO<R, E, A>): GenQuery<R, E, A>
  }) => Generator<T, A, any>
): Query<P._R<T>, P._E<T>, A> {
  return defer(() => {
    const iterator = f(adapter as any)
    const state    = iterator.next()

    function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): Query<any, any, A> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value.Q, (value) => {
        const next = iterator.next(value)
        return run(next)
      })
    }

    return run(state)
  })
}
