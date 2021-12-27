import { pipe } from '@principia/base/function'
import * as IO from '@principia/base/IO'
import * as S from '@principia/base/Stream'
import * as G from '@principia/test/Gen'
import { Sized } from '@principia/test/Sized'
import * as b from 'benny'

b.suite(
  'Gen',
  b.add('crossWith', () => {
    const effect = pipe(
      G.int(),
      G.crossWith(G.int(), (a, b) => a + b),
      (_) => _.sample,
      S.forever,
      S.take(10),
      S.runDrain
    )
    return async () => {
      await IO.runPromiseExit(effect)
    }
  }),
  b.add('arrayN', () => {
    const arrayNEffect = pipe(
      pipe(G.int(), G.arrayN(1000)).sample,
      S.forever,
      // S.collectJust,
      S.take(1),
      S.runDrain
    )
    return async () => {
      await IO.runPromiseExit(arrayNEffect)
    }
  }),
  b.add('cause', () => {
    const sized       = Sized.live(1000)
    const causeEffect = pipe(
      G.cause(
        G.alphaNumericString(),
        G.alphaNumericString(),
        pipe(
          G.alphaNumericString(),
          G.map((s) => new Error(s))
        )
      ).sample,
      S.forever,
      // S.collectJust,
      S.take(1),
      S.runDrain,
      IO.giveSomeLayer(sized)
    )
    return async () => {
      await IO.runPromiseExit(causeEffect)
    }
  }),
  b.cycle(),
  b.complete()
)
