import type { TestResult } from './Render'
import type { Cause } from '@principia/base/Cause'

import * as C from '@principia/base/Cause'

export class AssertionFailure {
  readonly _tag = 'AssertionFailure'
  constructor(readonly result: TestResult) {}
}

export class RuntimeFailure<E> {
  readonly _tag = 'RuntimeFailure'
  constructor(readonly cause: Cause<E>) {}
}

export type TestFailure<E> = AssertionFailure | RuntimeFailure<E>

export function assertion(result: TestResult): TestFailure<never> {
  return new AssertionFailure(result)
}

export function die(error: Error): TestFailure<never> {
  return new RuntimeFailure(C.die(error))
}

export function fail<E>(e: E): TestFailure<E> {
  return new RuntimeFailure(C.fail(e))
}

export function halt<E>(cause: Cause<E>): TestFailure<E> {
  return new RuntimeFailure(cause)
}
