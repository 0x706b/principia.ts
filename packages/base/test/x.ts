import * as A from '../src/Array'
import * as E from '../src/Either'
import { getMapAccumM_ } from '../src/Traversable'

const mapAccumM_ = getMapAccumM_(A.Traversable)

const a = A.range(0, 1000)

console.time('A')

const x = mapAccumM_(E.Monad)(a, '', (s, n) => E.right([n + 1, s + n.toString(10)]))

console.log(x)

console.timeEnd('A')
