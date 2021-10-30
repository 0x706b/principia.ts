import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as b from 'benny'

const testArray = pipe(A.range(0, 1000), A.map(E.right))

console.log(testArray)

b.suite(
  'sequenceArray',
  b.add('A.sequence(E.Applicative)', () => A.sequence(E.Applicative)(testArray)),
  b.add('E.sequenceArray', () => E.sequenceArray(testArray)),
  b.cycle(),
  b.complete()
)
