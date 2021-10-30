import * as A from '@principia/base/Array'
import * as b from 'benny'

const testArray = A.range(0, 1000)
const addOne    = (x: number) => x + 1

b.suite(
  'Array map',
  b.add('native', () => testArray.map(addOne)),
  b.add('principia', () => A.map_(testArray, addOne)),
  b.cycle(),
  b.complete()
)
