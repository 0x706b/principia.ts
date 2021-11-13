import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function.js'
import * as IO from '@principia/base/IO/index.js'
import * as Iter from '@principia/base/Iterable/index.js'
import * as Si from '@principia/base/Sink/index.js'
import * as S from '@principia/base/Stream/index.js'
import * as O from '@principia/observable/Observable/index.js'
import * as b from 'benny'

const xs = Iter.range(0, Infinity)

b.suite(
  'Stream vs. Observable',
  b.add('Stream', () => {
    const stream = pipe(
      S.fromIterable(xs),
      S.map((x) => x + 1),
      S.filter((x) => x % 2 === 0),
      S.map((x) => x + 1),
      S.map((x) => x + 1),
      S.take(1000),
      S.run(Si.foldl(0, (x, y) => x + y))
    )
    return async () => {
      await new Promise<void>((resolve) => {
        IO.run_(stream, () => {
          resolve()
        })
      })
    }
  }),
  b.add('Observable', () => {
    const observable = pipe(
      O.fromIterable(xs),
      O.map((x) => x + 1),
      O.filter((x) => x % 2 === 0),
      O.map((x) => x + 1),
      O.map((x) => x + 1),
      O.take(1000),
      O.foldl(0, (x, y) => x + y)
    )
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
