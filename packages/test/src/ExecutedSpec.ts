import type { TestAnnotationMap } from './Annotation/TestAnnotationMap'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Either } from '@principia/base/Either'

import * as C from '@principia/base/Chunk'
import { identity, pipe } from '@principia/base/function'
import { matchTag, matchTag_ } from '@principia/base/util/match'

export class ExecutedSpec<E> {
  constructor(readonly caseValue: SpecCase<E, ExecutedSpec<E>>) {}
}

class TestCase<E> {
  readonly _tag = 'Test'
  constructor(readonly test: Either<TestFailure<E>, TestSuccess>, readonly annotations: TestAnnotationMap) {}
}

class LabeledCase<A> {
  readonly _tag = 'Labeled'
  constructor(readonly label: string, readonly spec: A) {}
}

class MultipleCase<A> {
  readonly _tag = 'Multiple'
  constructor(readonly specs: C.Chunk<A>) {}
}

type SpecCase<E, A> = TestCase<E> | LabeledCase<A> | MultipleCase<A>

export function map_<E, A, B>(es: SpecCase<E, A>, f: (a: A) => B): SpecCase<E, B> {
  return matchTag_(
    es,
    {
      Labeled: ({ label, spec }) => new LabeledCase(label, f(spec)),
      Multiple: ({ specs }) => new MultipleCase(C.map_(specs, f))
    },
    identity
  )
}

export function test<E>(test: Either<TestFailure<E>, TestSuccess>, annotations: TestAnnotationMap): ExecutedSpec<E> {
  return new ExecutedSpec(new TestCase(test, annotations))
}

export function labeled<E>(label: string, spec: ExecutedSpec<E>): ExecutedSpec<E> {
  return new ExecutedSpec(new LabeledCase(label, spec))
}

export function multiple<E>(specs: C.Chunk<ExecutedSpec<E>>): ExecutedSpec<E> {
  return new ExecutedSpec(new MultipleCase(specs))
}

export function fold_<E, Z>(es: ExecutedSpec<E>, f: (_: SpecCase<E, Z>) => Z): Z {
  return matchTag_(es.caseValue, {
    Labeled: ({ label, spec }) => f(new LabeledCase(label, fold_(spec, f))),
    Multiple: ({ specs }) => f(new MultipleCase(pipe(specs, C.map(fold(f))))),
    Test: f
  })
}

export function fold<E, Z>(f: (_: SpecCase<E, Z>) => Z): (es: ExecutedSpec<E>) => Z {
  return (es) => fold_(es, f)
}

export function transform_<E, E1>(
  es: ExecutedSpec<E>,
  f: (_: SpecCase<E, ExecutedSpec<E1>>) => SpecCase<E1, ExecutedSpec<E1>>
): ExecutedSpec<E1> {
  return matchTag_(es.caseValue, {
    Labeled: ({ label, spec }) => new ExecutedSpec(f(new LabeledCase(label, transform_(spec, f)))),
    Multiple: ({ specs }) =>
      new ExecutedSpec(
        f(
          new MultipleCase(
            pipe(
              specs,
              C.map((spec) => transform_(spec, f))
            )
          )
        )
      ),
    Test: (t) => new ExecutedSpec(f(t))
  })
}

export function exists_<E>(es: ExecutedSpec<E>, f: (_: SpecCase<E, boolean>) => boolean): boolean {
  return fold_(
    es,
    matchTag({
      Labeled: (c) => c.spec || f(c),
      Multiple: (c) => C.exists_(c.specs, identity) || f(c),
      Test: f
    })
  )
}

export function size<E>(es: ExecutedSpec<E>): number {
  return fold_(
    es,
    matchTag({
      Labeled: ({ spec }) => spec,
      Multiple: ({ specs }) => C.foldl_(specs, 0, (b, a) => b + a),
      Test: () => 1
    })
  )
}
