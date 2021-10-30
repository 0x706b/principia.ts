import type { NonEmptyArray } from 'packages/base/src/NonEmptyArray'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as b from 'benny'

const appendArray = (n: number) => {
  let out: NonEmptyArray<number> = [0]
  for (let i = 0; i < n; i++) {
    out = A.append_(out, 0)
  }
  return out
}

const appendChunk = (n: number) => {
  let out: C.Chunk<number> = C.single(0)
  for (let i = 0; i < n; i++) {
    out = C.append_(out, 0)
  }
  return out
}

const appendNative = (n: number) => {
  let out = [0]
  for (let i = 0; i < n; i++) {
    out = out.concat(0)
  }
  return out
}

b.suite(
  'append',
  b.add('array', () => appendArray(10000)),
  b.add('chunk', () => appendChunk(10000)),
  b.add('native', () => appendNative(10000)),
  b.cycle(),
  b.complete()
)
