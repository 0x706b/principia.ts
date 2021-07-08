import type { AssertionIO } from '../Assertion/AssertionM'
import type * as S from '@principia/base/Show'

import { isObject } from '@principia/base/prelude'
import * as Sh from '@principia/base/Structural/Showable'

import { isAssertionIO } from '../Assertion/AssertionM'

export const RenderAssertionMTypeId = Symbol()
export type RenderAssertionMTypeId = typeof RenderAssertionMTypeId

export class RenderAssertionM {
  readonly [RenderAssertionMTypeId]: RenderAssertionMTypeId = RenderAssertionMTypeId

  constructor(readonly assertion: AssertionIO<any>) {}

  get rendered(): string {
    return this.assertion.rendered
  }
}

export function isRenderAssertionM(u: unknown): u is RenderAssertionM {
  return isObject(u) && RenderAssertionMTypeId in u
}

export const RenderValueTypeId = Symbol('@principia/test/Render/RenderValue')
export type RenderValueTypeId = typeof RenderValueTypeId

export class RenderValue<A> {
  readonly [RenderValueTypeId]: RenderValueTypeId = RenderValueTypeId

  constructor(readonly value: A, readonly show?: S.Show<A>) {}

  get rendered(): string {
    return this.show ? this.show.show(this.value) : Sh.show(this.value)
  }
}

export type RenderParam = RenderAssertionM | RenderValue<any>

export function param<A>(assertion: AssertionIO<A>): RenderParam
export function param<A>(value: A, show?: S.Show<A>): RenderParam
export function param(value: any, show?: S.Show<any>): RenderParam {
  if (isAssertionIO(value)) {
    return new RenderAssertionM(value)
  } else {
    return new RenderValue(value, show)
  }
}

export function field(name: string): string {
  return `_.${name}`
}

export function quoted(name: string): string {
  return `"${name}"`
}
