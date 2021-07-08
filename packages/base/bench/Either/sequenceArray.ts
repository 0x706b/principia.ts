import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import { Suite } from 'benchmark'

const testArray = pipe(A.range(0, 1000), A.map(E.right))

console.log(testArray)

new Suite('sequenceArray')
  .add('A.sequence(E.Applicative)', () => A.sequence(E.Applicative)(testArray))
  .add('E.sequenceArray', () => E.sequenceArray(testArray))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
