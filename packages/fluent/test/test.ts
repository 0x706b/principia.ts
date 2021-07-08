import * as Sink from '@principia/base/experimental/Sink'
import * as S from '@principia/base/experimental/Stream'
import * as I from '@principia/base/IO'
import * as It from '@principia/base/Iterable'

const numbers = It.range(0, Infinity)

S.fromIterator(numbers[Symbol.iterator])
  .map((n) => n * 2)
  .take(100)
  .run(Sink.foldl(0, (b, a) => b + a))
  .timed.chain((sum) => I.succeedLazy(() => console.log(sum)))
  .run()
