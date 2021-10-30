import * as A from '@principia/base/Array'
import * as b from 'benny'

const testArray = A.range(0, 1000)
const sum       = (x: number, y: number) => x + y

b.suite(
  'foldl / reduce',
  b.add('native (reduce)', () => testArray.reduce(sum, 0)),
  b.add('principia (foldl)', () => A.foldl_(testArray, 0, sum)),
  b.cycle(),
  b.complete()
)
