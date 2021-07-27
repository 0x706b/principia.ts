import type { Described } from './Described'

import * as I from '@principia/base/IO'

import { batchN_, DataSource } from './DataSource'

export class DataSourceAspect<R> {
  readonly _tag = 'DataSourceAspect'

  constructor(readonly apply: <R1, A>(dataSource: DataSource<R1, A>) => DataSource<R & R1, A>) {}
}

export function around<R, A>(
  before: Described<I.IO<R, never, A>>,
  after: Described<(a: A) => I.IO<R, never, A>>
): DataSourceAspect<R> {
  return new DataSourceAspect<R>(<R1, A>(dataSource: DataSource<R1, A>): DataSource<R & R1, A> => {
    return new DataSource<R & R1, A>(
      `${dataSource.identifier} @@ around(${before.description}, ${after.description})`,
      (requests) => I.bracket_(before.value, (_) => dataSource.runAll(requests), after.value)
    )
  })
}

export function maxBatchSize(n: number): DataSourceAspect<unknown> {
  return new DataSourceAspect<unknown>(<R, A>(dataSource: DataSource<R, A>): DataSource<R, A> => batchN_(dataSource, n))
}

export function compose_<R, R1>(self: DataSourceAspect<R>, that: DataSourceAspect<R1>): DataSourceAspect<R & R1> {
  return new DataSourceAspect<R & R1>((dataSource) => that.apply(self.apply(dataSource)))
}
