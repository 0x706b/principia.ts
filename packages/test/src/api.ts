import type { Assertion, AssertionIO, AssertResult } from './Assertion'
import type { TestEnvironment } from './environment/TestEnvironment'
import type { ExecutedSpec } from './ExecutedSpec'
import type { Gen } from './Gen/core'
import type { TestResult } from './Render'
import type { Sample } from './Sample'
import type { TestLogger } from './TestLogger'
import type { WidenLiteral } from './util'
import type { Either } from '@principia/base/Either'
import type { Has } from '@principia/base/Has'
import type { IO, URIO } from '@principia/base/IO'
import type { Show } from '@principia/base/Show'
import type { Stream } from '@principia/base/Stream'
import type { UnionToIntersection } from '@principia/base/util/types'

import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import * as Ev from '@principia/base/Eval'
import { flow, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Managed'
import * as NA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import * as S from '@principia/base/Stream'

import { TestAnnotationMap } from './Annotation'
import { anything, AssertionValue, isTrue } from './Assertion'
import { testEnvironment } from './environment/TestEnvironment'
import * as BA from './FreeBooleanAlgebra'
import { GenFailureDetails } from './GenFailureDetails'
import { FailureDetails } from './Render'
import * as Sa from './Sample'
import * as Spec from './Spec'
import { TestConfig } from './TestConfig'
import { defaultTestExecutor } from './TestExecutor'
import * as TF from './TestFailure'
import { TestRunner } from './TestRunner'
import * as TS from './TestSuccess'

export type TestReporter<E> = (duration: number, spec: ExecutedSpec<E>) => URIO<Has<TestLogger>, void>

function traverseResultLoop<A>(whole: AssertionValue<A>, failureDetails: FailureDetails): TestResult {
  if (whole.isSameAssertionAs(NA.head(failureDetails.assertion))) {
    return BA.success(failureDetails)
  } else {
    const fragment = whole.result
    const result   = BA.isTrue(fragment.value) ? fragment.value : BA.not(fragment.value)
    return BA.chain_(result, (fragment) =>
      traverseResultLoop(fragment, FailureDetails([whole, ...failureDetails.assertion], failureDetails.gen))
    )
  }
}

export function traverseResult<A>(
  value: A,
  assertResult: AssertResult<A>,
  assertion: AssertionIO<A>,
  showA?: Show<A>
): TestResult {
  return BA.chain_(assertResult, (fragment) =>
    traverseResultLoop(
      fragment,
      FailureDetails([new AssertionValue(value, Ev.now(assertion), Ev.now(assertResult), showA)])
    )
  )
}

export function assert<A>(
  value: WidenLiteral<A>,
  assertion: Assertion<WidenLiteral<A>>,
  showA?: Show<WidenLiteral<A>>
): TestResult {
  return traverseResult(value, assertion.run(value), assertion, showA)
}

export const assertCompletes = assert(true, isTrue)

export function assertM<R, E, A>(io: IO<R, E, A>, assertion: AssertionIO<A>, showA?: Show<A>): IO<R, E, TestResult> {
  return I.gen(function* (_) {
    const value        = yield* _(io)
    const assertResult = yield* _(assertion.runIO(value))
    return traverseResult(value, assertResult, assertion, showA)
  })
}

type MergeR<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = UnionToIntersection<
  {
    [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<infer R, any>] ? (unknown extends R ? never : R) : never
  }[number]
>

type MergeE<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = {
  [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<any, infer E>] ? E : never
}[number]

export function suite<Specs extends ReadonlyArray<Spec.XSpec<any, any>>>(
  label: string,
  ...specs: Specs
): Spec.XSpec<MergeR<Specs>, MergeE<Specs>> {
  return Spec.suite(label, M.succeed(specs), O.none())
}

export function testM<R, E>(label: string, assertion: () => IO<R, E, TestResult>): Spec.XSpec<R, E> {
  return Spec.test(
    label,
    I.matchCauseIO_(
      I.defer(assertion),
      flow(TF.halt, I.fail),
      flow(
        BA.failures,
        O.match(
          () => I.succeed(new TS.Succeeded(BA.success(undefined))),
          (failures) => I.fail(TF.assertion(failures))
        )
      )
    ),
    TestAnnotationMap.empty
  )
}

export function test(label: string, assertion: () => TestResult): Spec.XSpec<unknown, never> {
  return testM(label, () => I.succeedLazy(assertion))
}

export function check<R, A>(rv: Gen<R, A>, test: (a: A) => TestResult): URIO<R & Has<TestConfig>, TestResult> {
  return checkM(rv, flow(test, I.succeed))
}

export function checkM<R, A, R1, E>(
  rv: Gen<R, A>,
  test: (a: A) => IO<R1, E, TestResult>
): IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return pipe(
    TestConfig.samples,
    I.chain((n) => checkStream(pipe(rv.sample, S.forever, S.take(n)), test))
  )
}

export const defaultTestRunner: TestRunner<TestEnvironment, any> = new TestRunner(defaultTestExecutor(testEnvironment))

function checkStream<R, A, R1, E>(
  stream: Stream<R, never, Sample<R, A>>,
  test: (a: A) => IO<R1, E, TestResult>
): IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return pipe(
    TestConfig.shrinks,
    I.chain(
      shrinkStream(
        pipe(
          stream,
          S.zipWithIndex,
          S.mapIO(([initial, index]) =>
            pipe(
              initial,
              Sa.foreach((input) =>
                pipe(
                  test(input),
                  I.map(
                    BA.map((fd) => FailureDetails(fd.assertion, O.some(GenFailureDetails(initial.value, input, index))))
                  ),
                  I.either
                )
              )
            )
          )
        )
      )
    )
  )
}

function shrinkStream<R, R1, E, A>(
  stream: Stream<R1, never, Sample<R1, Either<E, BA.FreeBooleanAlgebra<FailureDetails>>>>
): (maxShrinks: number) => IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return (maxShrinks) =>
    pipe(
      stream,
      S.dropWhile((_) => !E.match_(_.value, (_) => true, BA.isFalse)),
      S.take(1),
      S.chain(flow(Sa.shrinkSearch(E.match(() => true, BA.isFalse)), S.take(maxShrinks + 1))),
      S.runCollect,
      I.chain(
        flow(
          C.filter(E.match(() => true, BA.isFalse)),
          C.last,
          O.match(
            () =>
              I.succeed(
                BA.success(
                  FailureDetails([new AssertionValue(undefined, Ev.now(anything), Ev.now(anything.run(undefined)))])
                )
              ),
            I.fromEither
          )
        )
      )
    )
}
