import type { AssertionValue } from '../Assertion'
import type { FreeBooleanAlgebra } from '../FreeBooleanAlgebra'
import type { GenFailureDetails } from '../GenFailureDetails'
import type { NonEmptyArray } from '@principia/base/collection/immutable/NonEmptyArray'
import type { Maybe } from '@principia/base/Maybe'

import * as M from '@principia/base/Maybe'

export type TestResult = FreeBooleanAlgebra<FailureDetails>

export interface FailureDetails {
  readonly assertion: NonEmptyArray<AssertionValue<any>>
  readonly gen: Maybe<GenFailureDetails>
}

export function FailureDetails(
  assertion: NonEmptyArray<AssertionValue<any>>,
  gen: Maybe<GenFailureDetails> = M.nothing()
): FailureDetails {
  return {
    assertion,
    gen
  }
}
