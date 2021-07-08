import type { Cache } from '../Cache'
import type { DataSource } from '../DataSource'
import type { DataSourceAspect } from '../DataSourceAspect'
import type { Described } from '../Described'
import type { Query } from '../Query'
import type { Request } from '../Request'
import type { QueryContext } from './QueryContext'
import type * as Ca from '@principia/base/Cause'
import type { FIO } from '@principia/base/IO'
import type { URef } from '@principia/base/Ref'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as O from '@principia/base/Option'
import { matchTag_ } from '@principia/base/util/match'

import * as Q from '../Query'

export class Effect<R, E, A> {
  readonly _tag = 'Effect'
  constructor(readonly query: Query<R, E, A>) {}
}

export function effect<R, E, A>(query: Query<R, E, A>): Continue<R, E, A> {
  return new Effect(query)
}

export class Get<E, A> {
  readonly _tag = 'Get'
  constructor(readonly io: FIO<E, A>) {}
}

export function get<E, A>(io: FIO<E, A>): Continue<unknown, E, A> {
  return new Get(io)
}

export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>

export function matchCauseQuery_<R, E, A, R1, E1, B, R2, E2, C>(
  cont: Continue<R, E, A>,
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R2, E2, C>
): Continue<R & R1 & R2, E1 | E2, B | C> {
  return matchTag_(cont, {
    Effect: ({ query }) => new Effect(Q.matchCauseQuery_(query, onFailure, onSuccess)),
    Get: ({ io }) => pipe(Q.fromIO(io), (q) => Q.matchCauseQuery_(q, onFailure, onSuccess), effect)
  })
}

export function matchCauseQuery<E, A, R1, E1, B, R2, E2, C>(
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R2, E2, C>
): <R>(ma: Continue<R, E, A>) => Continue<R & R1 & R2, E1 | E2, B | C> {
  return (ma) => matchCauseQuery_(ma, onFailure, onSuccess)
}

export function mapError_<R, E, A, E1>(fa: Continue<R, E, A>, f: (e: E) => E1): Continue<R, E1, A> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.mapError_(query, f)),
    Get: ({ io }) => pipe(io, I.mapError(f), get)
  })
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(ma: Continue<R, E, A>) => Continue<R, E1, A> {
  return (ma) => mapError_(ma, f)
}

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.crossWith_(fa.query, fb.query, f))
      : effect(Q.crossWith_(fa.query, Q.fromIO(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromIO(fa.io), Q.crossWith(fb.query, f)))
    : get(I.crossWith_(fa.io, fb.io, f))
}

export function crossWith<A, R1, E1, B, C>(
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Continue<R, E, A>) => Continue<R & R1, E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function map_<R, E, A, B>(fa: Continue<R, E, A>, f: (a: A) => B): Continue<R, E, B> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.map_(query, f)),
    Get: ({ io }) => get(I.map_(io, f))
  })
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Continue<R, E, A>) => Continue<R, E, B> {
  return (fa) => map_(fa, f)
}

export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.crossWithPar_(fa.query, fb.query, f))
      : effect(Q.crossWith_(fa.query, Q.fromIO(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromIO(fa.io), Q.crossWith(fb.query, f)))
    : get(I.crossWith_(fa.io, fb.io, f))
}

export function crossWithPar<A, R1, E1, B, C>(
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Continue<R, E, A>) => Continue<R & R1, E | E1, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function crossWithBatched_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.crossWithBatched_(fa.query, fb.query, f))
      : effect(Q.crossWith_(fa.query, Q.fromIO(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromIO(fa.io), Q.crossWith(fb.query, f)))
    : get(I.crossWith_(fa.io, fb.io, f))
}

export function crossWithBatched<A, R1, E1, B, C>(
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Continue<R, E, A>) => Continue<R & R1, E | E1, C> {
  return (fa) => crossWithBatched_(fa, fb, f)
}

export function mapDataSources_<R, E, A, R1>(fa: Continue<R, E, A>, f: DataSourceAspect<R1>): Continue<R & R1, E, A> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.mapDataSources_(query, f)),
    Get: ({ io }) => get(io)
  })
}

export function mapDataSources<R1>(
  f: DataSourceAspect<R1>
): <R, E, A>(fa: Continue<R, E, A>) => Continue<R & R1, E, A> {
  return (fa) => mapDataSources_(fa, f)
}

export function make<R, E, A extends Request<E, B>, B>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: URef<O.Option<E.Either<E, B>>>
): Continue<R, E, B> {
  return get(pipe(ref.get, I.chain(O.match(() => I.dieMessage('TODO: Query Failure'), I.fromEither))))
}

export function mapQuery_<R, E, A, R1, E1, B>(
  fa: Continue<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Continue<R & R1, E | E1, B> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.chain_(query, f)),
    Get: ({ io }) => effect(pipe(Q.fromIO(io), Q.chain(f)))
  })
}

export function mapQuery<A, R1, E1, B>(
  f: (a: A) => Query<R1, E1, B>
): <R, E>(fa: Continue<R, E, A>) => Continue<R & R1, E | E1, B> {
  return (fa) => mapQuery_(fa, f)
}

export function gives_<R, E, A, R0>(ra: Continue<R, E, A>, f: Described<(r0: R0) => R>): Continue<R0, E, A> {
  return matchTag_(ra, {
    Effect: ({ query }) => effect(Q.gives_(query, f)),
    Get: ({ io }) => get(io)
  })
}

export function gives<R0, R>(f: Described<(r0: R0) => R>): <E, A>(ra: Continue<R, E, A>) => Continue<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function runContext_<R, E, A>(ma: Continue<R, E, A>, queryContext: QueryContext): I.IO<R, E, A> {
  return matchTag_(ma, {
    Effect: ({ query }) => Q.runContext_(query, queryContext),
    Get: ({ io }) => io
  })
}

export function runCache_<R, E, A>(ma: Continue<R, E, A>, cache: Cache): I.IO<R, E, A> {
  return matchTag_(ma, {
    Effect: ({ query }) => Q.runCache_(query, cache),
    Get: ({ io }) => io
  })
}

export function runCache(cache: Cache): <R, E, A>(ma: Continue<R, E, A>) => I.IO<R, E, A> {
  return (ma) => runCache_(ma, cache)
}
