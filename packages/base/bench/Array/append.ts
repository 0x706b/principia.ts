import type { NonEmptyArray } from 'packages/base/src/NonEmptyArray'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import { Suite } from 'benchmark'

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

new Suite('copy methods')
  .add('array', () => appendArray(10000))
  .add('chunk', () => appendChunk(10000))
  .add('native', () => appendNative(10000))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
