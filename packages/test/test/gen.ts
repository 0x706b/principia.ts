import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as S from '@principia/base/Stream'
import * as Str from '@principia/base/string'

import * as Gen from '../src/Gen'
import { Sized } from '../src/Sized'

pipe(
  Gen.fullUnicodeString().sample,
  S.map((sample) => sample.value),
  S.forever,
  S.take(100),
  S.runCollect,
  I.bind((chunk) => I.effectTotal(() => console.log(C.toArray(chunk)))),
  I.giveLayer(Sized.live(100)),
  I.run()
)
