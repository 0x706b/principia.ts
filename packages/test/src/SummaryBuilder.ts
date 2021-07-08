import type { ExecutedSpec } from './ExecutedSpec'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Either } from '@principia/base/Either'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as F from '@principia/base/function'
import * as L from '@principia/base/List'
import { matchTag } from '@principia/base/util/match'

import * as ExSpec from './ExecutedSpec'
import { render, silent } from './Render'

export class Summary {
  constructor(readonly success: number, readonly fail: number, readonly ignore: number, readonly summary: string) {}
  total = this.success + this.fail + this.ignore
}

export function buildSummary<E>(executedSpec: ExecutedSpec<E>): Summary {
  const success  = countTestResults(
    executedSpec,
    E.match(
      () => false,
      (_) => _._tag === 'Succeeded'
    )
  )
  const fail     = countTestResults(executedSpec, E.isLeft)
  const ignore   = countTestResults(
    executedSpec,
    E.match(
      () => false,
      (_) => _._tag === 'Ignored'
    )
  )
  const failures = extractFailures(executedSpec)
  const rendered = pipe(
    failures,
    L.from,
    L.chain((spec) => render(spec, silent)),
    L.chain((_) => _.rendered),
    L.join('\n')
  )
  return new Summary(success, fail, ignore, rendered)
}

function countTestResults<E>(
  executedSpec: ExecutedSpec<E>,
  predicate: (r: Either<TestFailure<E>, TestSuccess>) => boolean
): number {
  return ExSpec.fold_(
    executedSpec,
    matchTag({
      Test: ({ test }) => (predicate(test) ? 1 : 0),
      Suite: ({ specs }) => A.sum(specs)
    })
  )
}

function extractFailures<E>(executedSpec: ExecutedSpec<E>): ReadonlyArray<ExecutedSpec<E>> {
  return ExSpec.fold_(
    executedSpec,
    matchTag({
      Test: (c) => (E.isLeft(c.test) ? [c] : A.empty<ExecutedSpec<E>>()),
      Suite: ({ label, specs }) =>
        pipe(
          specs,
          A.flatten,
          F.if(
            A.isNonEmpty,
            (newSpecs) => [ExSpec.suite(label, newSpecs)],
            () => A.empty<ExecutedSpec<E>>()
          )
        )
    })
  )
}
