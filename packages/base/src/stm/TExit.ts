import type { FiberId } from '../Fiber'

import * as St from '../Structural'
import { isObject } from '../util/predicates'

export type TExit<E, A> = Fail<E> | Succeed<A> | Retry | Halt | Interrupt

export const FailTypeId = Symbol.for('@principia/base/stm/TExit/Fail')
export type FailTypeId = typeof FailTypeId

const _failHash = St.hashString('@principia/base/stm/TExit/Fail')

export class Fail<E> {
  readonly _tag: FailTypeId = FailTypeId
  constructor(readonly value: E) {}

  get [St.$hash](): number {
    return St.combineHash(_failHash, St.hash(this.value))
  }

  [St.$equals](that: unknown): boolean {
    return isFail(that) && St.equals(this.value, that.value)
  }
}

export function isFail(u: unknown): u is Fail<unknown> {
  return isObject(u) && u['_tag'] === FailTypeId
}

export const SucceedTypeId = Symbol.for('@principia/base/stm/TExit/Succeed')
export type SucceedTypeId = typeof SucceedTypeId

const _succeedHash = St.hashString('@principia/base/stm/TExit/Succeed')

export class Succeed<A> {
  readonly _tag: SucceedTypeId = SucceedTypeId
  constructor(readonly value: A) {}

  get [St.$hash](): number {
    return St.combineHash(_succeedHash, St.hash(this.value))
  }

  [St.$equals](that: unknown): boolean {
    return isSucceed(that) && St.equals(this.value, that.value)
  }
}

export function isSucceed(u: unknown): u is Succeed<unknown> {
  return isObject(u) && u['_tag'] === SucceedTypeId
}

export const HaltTypeId = Symbol.for('@principia/base/stm/TExit/Halt')
export type HaltTypeId = typeof HaltTypeId

const _haltHash = St.hashString('@principia/base/stm/TExit/Halt')

export class Halt {
  readonly _tag: HaltTypeId = HaltTypeId
  constructor(readonly value: unknown) {}

  get [St.$hash](): number {
    return St.combineHash(_haltHash, St.hash(this.value))
  }

  [St.$equals](that: unknown): boolean {
    return isHalt(that) && St.equals(this.value, that.value)
  }
}

export function isHalt(u: unknown): u is Halt {
  return isObject(u) && u['_tag'] === HaltTypeId
}

export const InterruptTypeId = Symbol.for('@principia/base/stm/TExit/Interrupt')
export type InterruptTypeId = typeof InterruptTypeId

const _interruptHash = St.hashString('@principia/base/stm/TExit/Interrupt')

export class Interrupt {
  readonly _tag: InterruptTypeId = InterruptTypeId
  constructor(readonly fiberId: FiberId) {}

  get [St.$hash](): number {
    return St.combineHash(_interruptHash, St.hash(this.fiberId))
  }

  [St.$equals](that: unknown): boolean {
    return isInterrupt(that) && St.equals(this.fiberId, that.fiberId)
  }
}

export function isInterrupt(u: unknown): u is Interrupt {
  return isObject(u) && u['_tag'] === InterruptTypeId
}

const _retryHash = St.hashString('@principia/base/IO/stm/TExit/Retry')

export const RetryTypeId = Symbol.for('@principia/base/IO/stm/TExit/Retry')
export type RetryTypeId = typeof RetryTypeId

export class Retry {
  readonly _tag: RetryTypeId = RetryTypeId
  get [St.$hash](): number {
    return _retryHash
  }
  [St.$equals](that: unknown): boolean {
    return isRetry(that)
  }
}

export function isRetry(u: unknown): u is Retry {
  return isObject(u) && u['_tag'] === RetryTypeId
}

export function unit(): TExit<never, void> {
  return new Succeed(undefined)
}

export function succeed<E = never, A = never>(a: A): TExit<E, A> {
  return new Succeed(a)
}

export function fail<E = never, A = never>(e: E): TExit<E, A> {
  return new Fail(e)
}

export function halt(e: unknown): TExit<never, never> {
  return new Halt(e)
}

export function retry(): TExit<never, never> {
  return new Retry()
}

export function interrupt(fiberId: FiberId): TExit<never, never> {
  return new Interrupt(fiberId)
}
