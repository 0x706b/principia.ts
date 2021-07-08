import { inspect } from 'util'

import * as A from '../src/Array'
import * as C from '../src/Chunk'
import * as S from '../src/Structural/Showable'
import * as prand from '../src/util/pure-rand'
import * as Z from '../src/Z'

const rand = new prand.Random(prand.mersenne(Math.random() * 100))

const key = Symbol('a symbol key')

function generateString(length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(rand.nextInt(32, 126))
  }
  return s
}

const largeNumberArray = A.range(0, 1000)

const smallCircularArray: any[] = [6739284, 'a string', true]

const aMap = new Map([
  ['hello', 'world'],
  ['foo', 'bar'],
  ['i', 'know']
])

const chunk = C.map_(C.make(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (n) => n.toString(16))

const buffer = new Uint8Array([234, 23, 12, 48, 37, 10])

const object = {
  a: 'a pretty short string',
  b: generateString(1000),
  c: rand.nextInt(0, 999999999999),
  d: rand.nextBigInt(BigInt(0), BigInt(99999999999999999999999999999999999999999)),
  e: largeNumberArray,
  f: smallCircularArray,
  [key]: generateString(10),
  g: chunk,
  h: aMap,
  i: Z.pure('A'),
  j: [23, 24, 25, , , ,],
  k: buffer
}

// eslint-disable-next-line functional/immutable-data
smallCircularArray[3] = object

// eslint-disable-next-line functional/immutable-data
;(object as any).g = C.append_((object as any).g, object)

console.log(S.show(object))

console.log(inspect(object))
