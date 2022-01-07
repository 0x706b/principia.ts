import type { TestAnnotation } from './Annotation'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Clock } from '@principia/base/Clock'
import type { ExecutionStrategy } from '@principia/base/ExecutionStrategy'
import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { Schedule } from '@principia/base/Schedule'

import * as A from '@principia/base/collection/immutable/Array'
import * as C from '@principia/base/collection/immutable/Conc'
import { Console } from '@principia/base/Console'
import * as Ex from '@principia/base/Exit'
import * as Fi from '@principia/base/Fiber'
import { identity, pipe } from '@principia/base/function'
import * as Set from '@principia/base/HashSet'
import * as I from '@principia/base/IO'
import * as Ma from '@principia/base/Managed'
import * as Sc from '@principia/base/Schedule'
import * as Str from '@principia/base/string'
import { hashString } from '@principia/base/Structural'
import { matchTag, matchTag_ } from '@principia/base/util/match'

import { Annotations } from './Annotation'
import * as Annotation from './Annotation'
import { Live, withLive_ } from './environment/Live'
import * as S from './Spec'
import { TestConfig } from './TestConfig'
import * as TF from './TestFailure'
import { RuntimeFailure } from './TestFailure'

export class TestAspect<R, E> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E

  constructor(readonly some: <R1, E1>(spec: S.Spec<R1, E1>) => S.Spec<R & R1, E | E1>) {}

  all<R1, E1>(spec: S.Spec<R1, E1>): S.Spec<R & R1, E | E1> {
    return this.some(spec)
  }

  ['>>>']<R1 extends R, E1 extends E>(
    this: TestAspect<R | R1, E | E1>,
    that: TestAspect<R1, E1>
  ): TestAspect<R & R1, E | E1> {
    return new TestAspect((spec) => that.some(this.some(spec)))
  }
}

export class ConstrainedTestAspect<R0, R, E0, E> {
  constructor(readonly some: (spec: S.Spec<R0, E0>) => S.Spec<R0 & R, E0 | E>) {}

  all(spec: S.Spec<R0, E0>): S.Spec<R0 & R, E0 | E> {
    return this.some(spec)
  }
}

export class PerTest<R, E> extends TestAspect<R, E> {
  constructor(
    readonly perTest: <R1, E1>(
      test: IO<R1, TestFailure<E1>, TestSuccess>
    ) => IO<R & R1, TestFailure<E | E1>, TestSuccess>
  ) {
    super((spec) =>
      S.transform_(
        spec,
        matchTag(
          {
            Test: ({ test, annotations }) => new S.TestCase(this.perTest(test), annotations)
          },
          identity
        )
      )
    )
  }
}

export class ConstrainedPerTest<R0, R, E0, E> extends ConstrainedTestAspect<R0, R, E0, E> {
  constructor(
    readonly perTest: (test: IO<R0, TestFailure<E0>, TestSuccess>) => IO<R0 & R, TestFailure<E0 | E>, TestSuccess>
  ) {
    super((spec) =>
      S.transform_(
        spec,
        matchTag(
          {
            Test: ({ test, annotations }) => new S.TestCase(this.perTest(test), annotations)
          },
          identity
        )
      )
    )
  }
}

export type TestAspectAtLeastR<R> = TestAspect<R, never>

export type TestAspectPoly = TestAspect<unknown, never>

export const id: TestAspectPoly = new TestAspect((spec) => spec)

export const ignore: TestAspectAtLeastR<Has<Annotations>> = new TestAspect((spec) => S.when_(spec, false))

export function after<R, E>(effect: IO<R, E, any>): TestAspect<R, E> {
  return new PerTest((test) =>
    pipe(
      test,
      I.result,
      I.crossWith(I.result(I.catchAllCause_(effect, (cause) => I.fail(new RuntimeFailure(cause)))), Ex.apFirst_),
      I.chain(I.fromExit)
    )
  )
}

export function around<R, E, A, R1>(
  before: I.IO<R, E, A>,
  after: (a: A) => I.IO<R1, never, any>
): TestAspect<R & R1, E> {
  return new PerTest((test) =>
    pipe(
      before,
      I.catchAllCause((c) => I.fail(new RuntimeFailure(c))),
      I.bracket(() => test, after)
    )
  )
}

export function aroundAll<R, E, A, R1>(
  before: I.IO<R, E, A>,
  after: (a: A) => I.IO<R1, never, any>
): TestAspect<R & R1, E> {
  return new TestAspect(<R0, E0>(spec: S.Spec<R0, E0>) =>
    S.managed<R & R1 & R0, TestFailure<E | E0>, TestSuccess>(
      pipe(before, Ma.bracket(after), Ma.mapError(TF.fail), Ma.as(spec))
    )
  )
}

export function aspect<R0, E0>(
  f: (_: I.IO<R0, TestFailure<E0>, TestSuccess>) => I.IO<R0, TestFailure<E0>, TestSuccess>
): ConstrainedTestAspect<R0, R0, E0, E0> {
  return new ConstrainedPerTest((test) => f(test))
}

export function before<R0>(effect: I.IO<R0, never, any>): TestAspect<R0, never> {
  return new PerTest((test) => I.apSecond_(effect, test))
}

export function beforeAll<R0, E0>(effect: I.IO<R0, E0, any>): TestAspect<R0, E0> {
  return aroundAll(effect, () => I.unit())
}

// TODO: restore environment
export const eventually = new PerTest((test) => I.eventually(test))

export function executionStrategy(exec: ExecutionStrategy): TestAspectPoly {
  return new TestAspect((spec) => S.exec(exec, spec))
}

export function repeat<R0>(
  schedule: Schedule<R0, TestSuccess, any>
): TestAspectAtLeastR<R0 & Has<Annotations> & Has<Clock>> {
  return new PerTest(
    <R1, E1>(
      test: I.IO<R1, TestFailure<E1>, TestSuccess>
    ): I.IO<R0 & R1 & Has<Annotations> & Has<Clock>, TestFailure<E1>, TestSuccess> =>
      I.asksIO((r: R0 & R1 & Has<Annotations> & Has<Clock>) =>
        pipe(
          test,
          I.give(r),
          I.repeat(
            schedule['*>'](
              pipe(
                Sc.identity<TestSuccess>(),
                Sc.tapOutput((_) => Annotations.annotate(Annotation.repeated, 1)),
                Sc.give(r)
              )
            )
          )
        )
      )
  )
}

export const nonFlaky: TestAspectAtLeastR<Has<Annotations> & Has<TestConfig>> = new PerTest((test) =>
  pipe(
    TestConfig.repeats,
    I.chain((n) =>
      I.apSecond_(
        test,
        pipe(
          test,
          I.tap((_) => Annotations.annotate(Annotation.repeated, 1)),
          I.repeatN(n - 1)
        )
      )
    )
  )
)

export function annotate<V>(key: TestAnnotation<V>, value: V): TestAspectPoly {
  return new TestAspect((spec) => S.annotate_(spec, key, value))
}

export function tag(tag: string): TestAspectPoly {
  return annotate(Annotation.tagged, pipe(Set.make({ ...Str.Eq, hash: hashString }), Set.add(tag)))
}

export function timeoutWarning(duration: number): TestAspect<Has<Live>, any> {
  return new TestAspect(<R1, E1>(spec: S.Spec<R1, E1>) => {
    const loop = (labels: ReadonlyArray<string>, spec: S.Spec<R1, E1>): S.Spec<R1 & Has<Live>, E1> =>
      matchTag_(spec.caseValue, {
        Exec: ({ exec, spec }) => S.exec(exec, loop(labels, spec)),
        Labeled: ({ label, spec }) => S.labeled(label, loop(A.append_(labels, label), spec)),
        Managed: ({ managed }) =>
          S.managed(
            pipe(
              managed,
              Ma.map((spec) => loop(labels, spec))
            )
          ),
        Multiple: ({ specs }) =>
          S.multiple(
            pipe(
              specs,
              C.map((spec) => loop(labels, spec))
            )
          ),
        Test: ({ test, annotations }) => S.test(warn(labels, test, duration), annotations)
      })

    return loop(A.empty(), spec)
  })
}

function warn<R, E>(labels: ReadonlyArray<string>, test: I.IO<R, TestFailure<E>, TestSuccess>, duration: number) {
  return I.raceWith_(
    test,
    withLive_(showWarning(labels, duration), I.delay(duration)),
    (result, fiber) => I.apSecond_(Fi.interrupt(fiber), I.fromExit(result)),
    (_, fiber) => Fi.join(fiber)
  )
}

function showWarning(labels: ReadonlyArray<string>, duration: number) {
  return Live.live(Console.putStrLn(renderWarning(labels, duration)))
}

function renderWarning(labels: ReadonlyArray<string>, duration: number) {
  return `Test ${pipe(
    labels,
    A.join(' - ')
  )} has taken more than ${duration} milliseconds to execute. If this is not expected, consider using TestAspect.timeout to timeout runaway tests for faster diagnostics`
}
