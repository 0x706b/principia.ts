import type { ExecutedSpec } from './ExecutedSpec'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Either } from '@principia/base/Either'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/collection/immutable/Conc'
import * as V from '@principia/base/collection/immutable/Vector'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as F from '@principia/base/function'
import { matchTag } from '@principia/base/util/match'

import * as ES from './ExecutedSpec'
import { render, silent } from './Render'

export class Summary {
  constructor(readonly success: number, readonly fail: number, readonly ignore: number, readonly summary: string) {}
  total = this.success + this.fail + this.ignore
}

export function buildSummary<E>(executedSpec: ExecutedSpec<E>): Summary {
  const success = countTestResults(
    executedSpec,
    E.match(
      () => false,
      (_) => _._tag === 'Succeeded'
    )
  )
  const fail   = countTestResults(executedSpec, E.isLeft)
  const ignore = countTestResults(
    executedSpec,
    E.match(
      () => false,
      (_) => _._tag === 'Ignored'
    )
  )
  const failures = extractFailures(executedSpec)
  const rendered = pipe(
    failures,
    V.from,
    V.chain((spec) => render(spec, silent)),
    V.chain((_) => _.rendered),
    V.join('\n')
  )
  return new Summary(success, fail, ignore, rendered)
}

function countTestResults<E>(
  executedSpec: ExecutedSpec<E>,
  predicate: (r: Either<TestFailure<E>, TestSuccess>) => boolean
): number {
  return ES.fold_(
    executedSpec,
    matchTag({
      Labeled: ({ spec }) => spec,
      Multiple: ({ specs }) =>
        pipe(
          specs,
          C.foldl(0, (b, a) => b + a)
        ),
      Test: ({ test }) => (predicate(test) ? 1 : 0)
    })
  )
}

function extractFailures<E>(executedSpec: ExecutedSpec<E>): ReadonlyArray<ExecutedSpec<E>> {
  return ES.fold_(
    executedSpec,
    matchTag({
      Labeled: ({ label, spec }) =>
        pipe(
          spec,
          A.map((spec) => ES.labeled(label, spec))
        ),
      Test: (c) => (E.isLeft(c.test) ? [new ES.ExecutedSpec(c)] : A.empty<ExecutedSpec<E>>()),
      Multiple: ({ specs }) =>
        pipe(
          specs,
          C.chain(C.from),
          F.if(
            C.isNonEmpty,
            () => A.empty<ExecutedSpec<E>>(),
            (newSpecs) => [ES.multiple(newSpecs)]
          )
        )
    })
  )
}
