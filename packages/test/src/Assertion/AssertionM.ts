import type { Render } from '../Render'
import type { AssertionValue } from './AssertionValue'

import { isObject } from '@principia/base/prelude'

import * as BA from '../FreeBooleanAlgebra'
import { infix, param, quoted } from '../Render'

export type AssertResultM<A> = BA.FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>

export const AssertionMTypeId = Symbol('@principia/test/AssertionM')
export type AssertionMTypeId = typeof AssertionMTypeId

export class AssertionIO<A> {
  readonly [AssertionMTypeId]: AssertionMTypeId = AssertionMTypeId

  constructor(readonly render: Render, readonly runIO: (actual: A) => AssertResultM<A>) {}

  ['&&'](this: AssertionIO<A>, that: AssertionIO<A>): AssertionIO<A> {
    return new AssertionIO(infix(param(this), '&&', param(that)), (actual) =>
      BA.andM_(this.runIO(actual), that.runIO(actual))
    )
  }
  [':'](string: string): AssertionIO<A> {
    return new AssertionIO(infix(param(this), ':', param(quoted(string))), this.runIO)
  }
  ['||'](this: AssertionIO<A>, that: AssertionIO<A>): AssertionIO<A> {
    return new AssertionIO(infix(param(this), '||', param(that)), (actual) =>
      BA.orM_(this.runIO(actual), that.runIO(actual))
    )
  }

  get rendered() {
    return this.render.rendered
  }
}

export function isAssertionIO(u: unknown): u is AssertionIO<unknown> {
  return isObject(u) && AssertionMTypeId in u
}

export function label_<A>(am: AssertionIO<A>, string: string): AssertionIO<A> {
  return am[':'](string)
}

export function label(string: string): <A>(am: AssertionIO<A>) => AssertionIO<A> {
  return (am) => am[':'](string)
}
