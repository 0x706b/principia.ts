import { pipe } from '@principia/base/function.js'
import * as IO from '@principia/base/IO/index.js'
import * as Iter from '@principia/base/Iterable/index.js'
import * as S from '@principia/base/Stream/index.js'
import * as O from '@principia/observable/Observable/index.js'
import * as b from 'benny'

const xs = Iter.range(0, 1000)

b.suite(
  'Stream vs. Observable',
  b.add('Stream', () => {
    const stream = pipe(S.fromIterable(xs, 1000), S.take(1000), S.runDrain)
    return async () => {
      await new Promise<void>((resolve) => {
        IO.run_(stream, () => {
          resolve()
        })
      })
    }
  }),
  b.add('Observable', () => {
    const observable = pipe(O.fromIterable(xs), O.take(1000))
    return async () => {
      await new Promise<void>((resolve) => {
        observable.subscribe({
          complete: () => resolve()
        })
      })
    }
  }),
  b.cycle(),
  b.complete()
)
