import * as St from '../Structural'
import { isObject } from '../util/predicates'

export type TExit<E, A> = Fail<E> | Succeed<A> | Retry | Die

export const FailTypeId = Symbol('@principia/base/stm/TExit/Fail')
export type FailTypeId = typeof FailTypeId

export class Fail<E> {
  readonly _tag: FailTypeId = FailTypeId
  constructor(readonly value: E) {}

  get [St.$hash](): number {
    return St.hash(this.value)
  }

  [St.$equals](that: unknown): boolean {
    return isFail(that) && St.equals(this.value, that.value)
  }
}

export function isFail(u: unknown): u is Fail<unknown> {
  return isObject(u) && u['_tag'] === FailTypeId
}

export const SucceedTypeId = Symbol('@principia/base/stm/TExit/Succeed')
export type SucceedTypeId = typeof SucceedTypeId

export class Succeed<A> {
  readonly _tag: SucceedTypeId = SucceedTypeId
  constructor(readonly value: A) {}

  get [St.$hash](): number {
    return St.hash(this.value)
  }

  [St.$equals](that: unknown): boolean {
    return isSucceed(that) && St.equals(this.value, that.value)
  }
}

export function isSucceed(u: unknown): u is Succeed<unknown> {
  return isObject(u) && u['_tag'] === SucceedTypeId
}

export const DieTypeId = Symbol('@principia/base/stm/TExit/Die')
export type DieTypeId = typeof DieTypeId

export class Die {
  readonly _tag: DieTypeId = DieTypeId
  constructor(readonly value: unknown) {}

  get [St.$hash](): number {
    return St.hash(this.value)
  }

  [St.$equals](that: unknown): boolean {
    return isDie(that) && St.equals(this.value, that.value)
  }
}

export function isDie(u: unknown): u is Die {
  return isObject(u) && u['_tag'] === DieTypeId
}

const _retryHash = St.hashString('@principia/base/stm/TExit/Retry')

export const RetryTypeId = Symbol('@principia/base/stm/TExit/Retry')
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

export function die(e: unknown): TExit<never, never> {
  return new Die(e)
}

export function retry(): TExit<never, never> {
  return new Retry()
}
