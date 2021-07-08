import type { Assertion } from './Assertion'

import * as Ev from '@principia/base/Eval'

import * as BA from '../FreeBooleanAlgebra'
import { AssertionValue } from './AssertionValue'

export interface AssertionData<A> {
  readonly _tag: 'AssertionData'
  readonly value: A
  readonly assertion: Assertion<A>
}

export function AssertionData<A>(assertion: Assertion<A>, value: A): AssertionData<A> {
  return {
    _tag: 'AssertionData',
    assertion,
    value
  }
}

export function asSuccess<A>(_: AssertionData<A>): BA.FreeBooleanAlgebra<AssertionValue<A>> {
  return BA.success(
    new AssertionValue(
      _.value,
      Ev.later(() => _.assertion),
      Ev.later(() => asSuccess(_))
    )
  )
}

export function asFailure<A>(_: AssertionData<A>): BA.FreeBooleanAlgebra<AssertionValue<A>> {
  return BA.failure(
    new AssertionValue(
      _.value,
      Ev.later(() => _.assertion),
      Ev.later(() => asFailure(_))
    )
  )
}
