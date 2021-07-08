import type { TestAnnotationMap } from './Annotation/TestAnnotationMap'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Either } from '@principia/base/Either'
import type { USync } from '@principia/base/Sync'

import * as A from '@principia/base/Array'
import { identity, pipe } from '@principia/base/function'
import * as Sy from '@principia/base/Sync'
import { matchTag, matchTag_ } from '@principia/base/util/match'

class TestCase<E> {
  readonly _tag = 'Test'
  constructor(
    readonly label: string,
    readonly test: Either<TestFailure<E>, TestSuccess>,
    readonly annotations: TestAnnotationMap
  ) {}
}

class SuiteCase<A> {
  readonly _tag = 'Suite'
  constructor(readonly label: string, readonly specs: ReadonlyArray<A>) {}
}

type SpecCase<E, A> = TestCase<E> | SuiteCase<A>

export type ExecutedSpec<E> = TestCase<E> | SuiteCase<ExecutedSpec<E>>

export function map_<E, A, B>(es: SpecCase<E, A>, f: (a: A) => B): SpecCase<E, B> {
  return matchTag_(es, {
    Suite: ({ label, specs }) => new SuiteCase(label, A.map_(specs, f)),
    Test: (t) => t
  })
}

export function suite<E>(label: string, specs: ReadonlyArray<ExecutedSpec<E>>): ExecutedSpec<E> {
  return new SuiteCase(label, specs)
}

export function test<E>(
  label: string,
  test: Either<TestFailure<E>, TestSuccess>,
  annotations: TestAnnotationMap
): ExecutedSpec<E> {
  return new TestCase(label, test, annotations)
}

export function foldSafe<E, Z>(es: ExecutedSpec<E>, f: (_: USync<SpecCase<E, Z>>) => USync<Z>): USync<Z> {
  return matchTag_(es, {
    Suite: ({ label, specs }) => {
      const inner = specs.map((s) => foldSafe(s, f))
      return pipe(
        Sy.collectAllArray(inner),
        Sy.map((zs) => new SuiteCase(label, zs)),
        f
      )
    },
    Test: (t) => f(Sy.succeed(t))
  })
}

export function fold_<E, Z>(es: ExecutedSpec<E>, f: (_: SpecCase<E, Z>) => Z): Z {
  return Sy.run(foldSafe(es, (_: USync<SpecCase<E, Z>>) => Sy.map_(_, f)))
}

export function fold<E, Z>(f: (_: SpecCase<E, Z>) => Z): (es: ExecutedSpec<E>) => Z {
  return (es) => fold_(es, f)
}

export function transformSafe<E, E1>(
  es: ExecutedSpec<E>,
  f: (_: USync<SpecCase<E, ExecutedSpec<E1>>>) => USync<SpecCase<E1, ExecutedSpec<E1>>>
): USync<ExecutedSpec<E1>> {
  return matchTag_(es, {
    Suite: ({ label, specs }) => {
      const inner = A.map_(specs, (s) => Sy.defer(() => transformSafe(s, f)))
      return pipe(
        Sy.collectAllArray(inner),
        Sy.map((specs) => new SuiteCase(label, specs)),
        f
      )
    },
    Test: (t) => f(Sy.succeed(t))
  })
}

export function transform_<E, E1>(
  es: ExecutedSpec<E>,
  f: (_: SpecCase<E, ExecutedSpec<E1>>) => SpecCase<E1, ExecutedSpec<E1>>
): ExecutedSpec<E1> {
  return Sy.run(transformSafe(es, Sy.map(f)))
}

export function exists_<E>(es: ExecutedSpec<E>, f: (_: SpecCase<E, boolean>) => boolean): boolean {
  return fold_(
    es,
    matchTag({
      Suite: (s) => A.filter_(s.specs, identity).length !== 0 || f(s),
      Test: f
    })
  )
}

export function size<E>(es: ExecutedSpec<E>): number {
  return fold_(
    es,
    matchTag({
      Suite: ({ specs }) => A.sum(specs),
      Test: (_) => 1
    })
  )
}
