import * as Sink from '@principia/base/experimental/Sink'
import * as S from '@principia/base/experimental/Stream'
import * as I from '@principia/base/IO'
import * as It from '@principia/base/Iterable'

import {} from '../src'

const numbers = It.range(0, Infinity)

declare function f<A>(_: Iterable<A>): A

f([1, 2, 3].append(0))

S.fromIterable(numbers)
  .map((n) => n * 2)
  .take(100)
  .run(Sink.foldl(0, (b, a) => b + a))
  .timed.chain((sum) => I.succeedLazy(() => console.log(sum)))
  .run()
