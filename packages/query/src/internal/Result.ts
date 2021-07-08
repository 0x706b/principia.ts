import type { DataSourceAspect } from '../DataSourceAspect'
import type { Described } from '../Described'
import type { BlockedRequests } from './BlockedRequests'
import type { Continue } from './Continue'
import type { Cause } from '@principia/base/Cause'

import * as Ca from '@principia/base/Cause'
import * as E from '@principia/base/Either'
import { matchTag_ } from '@principia/base/util/match'

import * as BRS from './BlockedRequests'
import * as Cont from './Continue'

export class Blocked<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _tag = 'Blocked'
  constructor(readonly blockedRequests: BlockedRequests<R>, readonly cont: Continue<R, E, A>) {}
}

export class Done<A> {
  readonly _R!: (_: unknown) => void
  readonly _E!: () => never
  readonly _A!: () => A

  readonly _tag = 'Done'
  constructor(readonly value: A) {}
}

export class Fail<E> {
  readonly _R!: (_: unknown) => void
  readonly _E!: () => E
  readonly _A!: () => never

  readonly _tag = 'Fail'
  constructor(readonly cause: Cause<E>) {}
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

export function blocked<R, E, A>(blockedRequests: BlockedRequests<R>, cont: Continue<R, E, A>): Result<R, E, A> {
  return new Blocked(blockedRequests, cont)
}

export function fail<E>(cause: Cause<E>): Result<unknown, E, never> {
  return new Fail(cause)
}

export function done<A>(value: A): Done<A> {
  return new Done(value)
}

export function map_<R, E, A, B>(fa: Result<R, E, A>, f: (a: A) => B): Result<R, E, B> {
  return matchTag_(fa, {
    Blocked: ({ blockedRequests, cont }) => blocked(blockedRequests, Cont.map_(cont, f)),
    Fail: ({ cause }) => fail(cause),
    Done: ({ value }) => done(f(value))
  })
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Result<R, E, A>) => Result<R, E, B> {
  return (fa) => map_(fa, f)
}

export function mapDataSources_<R, E, A, R1>(fa: Result<R, E, A>, f: DataSourceAspect<R1>): Result<R & R1, E, A> {
  return matchTag_(fa, {
    Blocked: ({ blockedRequests, cont }) =>
      blocked(BRS.mapDataSources(blockedRequests, f), Cont.mapDataSources_(cont, f)),
    Done: ({ value }) => done(value),
    Fail: ({ cause }) => fail(cause)
  })
}

export function mapDataSources<R1>(f: DataSourceAspect<R1>): <R, E, A>(fa: Result<R, E, A>) => Result<R & R1, E, A> {
  return (fa) => mapDataSources_(fa, f)
}

export function fromEither<E, A>(either: E.Either<E, A>): Result<unknown, E, A> {
  return E.match_(
    either,
    (e) => fail(Ca.fail(e)),
    (a) => done(a)
  )
}

export function gives_<R, E, A, R0>(ra: Result<R, E, A>, f: Described<(r0: R0) => R>): Result<R0, E, A> {
  return matchTag_(ra, {
    Blocked: ({ blockedRequests, cont }) => blocked(BRS.gives_(blockedRequests, f), Cont.gives_(cont, f)),
    Fail: ({ cause }) => fail(cause),
    Done: ({ value }) => done(value)
  })
}

export function gives<R0, R>(f: Described<(r0: R0) => R>): <E, A>(ra: Result<R, E, A>) => Result<R0, E, A> {
  return (ra) => gives_(ra, f)
}
