import type { XSpec } from './Spec'
import type * as TA from './TestArgs'
import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type { URIO } from '@principia/base/IO'

import * as E from '@principia/base/Either'
import * as I from '@principia/base/IO'
import { matchTag } from '@principia/base/util/match'

import { AbstractRunnableSpec } from './AbstractRunnableSpec'
import * as ExSp from './ExecutedSpec'
import * as S from './Spec'
import { buildSummary } from './SummaryBuilder'
import { TestLogger } from './TestLogger'

export abstract class RunnableSpec<R, E> extends AbstractRunnableSpec<R, E> {
  readonly _tag = 'RunnableSpec'
  private run(spec: XSpec<R, E>): URIO<Has<TestLogger> & Has<Clock>, number> {
    const self = this
    return I.gen(function* (_) {
      const results     = yield* _(self.runSpec(spec))
      const hasFailures = ExSp.exists_(
        results,
        matchTag(
          {
            Test: ({ test }) => E.isLeft(test)
          },
          () => false
        )
      )
      const summary     = buildSummary(results)
      yield* _(TestLogger.logLine(summary.summary))
      return hasFailures ? 1 : 0
    })
  }
  main(args: TA.TestArgs): void {
    const filteredSpec = S.filterByArgs_(this.spec, args)
    I.run_(I.giveLayer_(this.run(filteredSpec), this.runner.bootstrap))
  }
}

export function isRunnableSpec(u: unknown): u is RunnableSpec<any, any> {
  return typeof u === 'object' && u != null && '_tag' in u && u['_tag'] === 'RunnableSpec'
}
