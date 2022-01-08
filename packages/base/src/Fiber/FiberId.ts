import * as A from '../collection/immutable/Array/core'
import { pipe } from '../function'
import * as HS from '../collection/immutable/HashSet'
import { AtomicNumber } from '../internal/AtomicNumber'
import * as P from '../prelude'
import { isObject } from '../prelude'
import { $equals, $hash, combineHash, equals, hash, hashString } from '../Structural'

/*
 * -------------------------------------------------------------------------------------------------
 * FiberId
 * -------------------------------------------------------------------------------------------------
 */

export const FiberIdTypeId = Symbol.for('@principia/base/Fiber/FiberId')
export type FiberIdTypeId = typeof FiberIdTypeId

const _hashNone = hashString('@principia/base/Fiber/FiberId/None')

export class None {
  readonly [FiberIdTypeId]: FiberIdTypeId = FiberIdTypeId
  readonly _tag = 'None';

  [$equals](that: unknown) {
    return isFiberId(that) && isNone(that)
  }
  get [$hash]() {
    return _hashNone
  }
}

const _hashRuntime = hashString('@principia/base/Fiber/FiberId/Runtime')

export class Runtime {
  readonly [FiberIdTypeId]: FiberIdTypeId = FiberIdTypeId
  readonly _tag = 'Runtime'
  constructor(readonly seqNumber: number, readonly startTime: number) {}
  [$equals](that: unknown) {
    return isFiberId(that) && isRuntime(that) && this.seqNumber === that.seqNumber && this.startTime === that.startTime
  }
  get [$hash]() {
    return combineHash(combineHash(_hashRuntime, this.seqNumber), this.startTime)
  }
}

const _hashComposite = hashString('@principia/base/Fiber/FiberId/Composite')

export class Composite {
  readonly [FiberIdTypeId]: FiberIdTypeId = FiberIdTypeId
  readonly _tag = 'Composite'
  constructor(readonly fiberIds: HS.HashSet<Runtime>) {}
  [$equals](that: unknown) {
    return isFiberId(that) && isComposite(that) && equals(this.fiberIds, that.fiberIds)
  }
  get [$hash]() {
    return combineHash(_hashComposite, hash(this.fiberIds))
  }
}

export type FiberId = None | Runtime | Composite

export function isFiberId(u: unknown): u is FiberId {
  return isObject(u) && FiberIdTypeId in u
}

export function isNone(fiberId: FiberId): fiberId is None {
  return fiberId._tag === 'None'
}

export function isRuntime(fiberId: FiberId): fiberId is Runtime {
  return fiberId._tag === 'Runtime'
}

export function isComposite(fiberId: FiberId): fiberId is Composite {
  return fiberId._tag === 'Composite'
}

export function combine_(id0: FiberId, id1: FiberId): FiberId {
  if (isNone(id0)) {
    return id1
  }
  if (isNone(id1)) {
    return id0
  }
  if (isComposite(id0)) {
    if (isComposite(id1)) {
      return new Composite(HS.union_(id0.fiberIds, id1.fiberIds))
    } else {
      return new Composite(HS.add_(id0.fiberIds, id1))
    }
  }
  if (isComposite(id1)) {
    return new Composite(HS.add_(id1.fiberIds, id0))
  }
  return new Composite(HS.fromDefault(id0, id1))
}

export function fiberIds(id: FiberId): HS.HashSet<Runtime> {
  switch (id._tag) {
    case 'None': {
      return HS.makeDefault()
    }
    case 'Runtime': {
      return HS.fromDefault(id)
    }
    case 'Composite': {
      return id.fiberIds
    }
  }
}

export function ids(id: FiberId): HS.HashSet<number> {
  switch (id._tag) {
    case 'None': {
      return HS.makeDefault()
    }
    case 'Runtime': {
      return HS.fromDefault(id.seqNumber)
    }
    case 'Composite': {
      return HS.map_(HS.Default)(id.fiberIds, (_) => _.seqNumber)
    }
  }
}

export const none = new None()

const _fiberCounter = new AtomicNumber(0)

export function newFiberId(): Runtime {
  return new Runtime(_fiberCounter.getAndIncrement(), new Date().getTime())
}

export const eqFiberId: P.Eq<FiberId> = P.Eq((x, y) => equals(x, y))

export function prettyFiberId(_: FiberId): string {
  return pipe(
    fiberIds(_),
    A.from,
    A.map((r) => `#${r.seqNumber} (started at: ${new Date(r.startTime).toISOString()})`),
    A.join('\n')
  )
}

export const showFiberId = P.Show<FiberId>(prettyFiberId)
