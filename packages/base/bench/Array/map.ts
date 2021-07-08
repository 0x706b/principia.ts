import * as A from '@principia/base/Array'
import { Suite } from 'benchmark'

const testArray = A.range(0, 1000)
const addOne    = (x: number) => x + 1

new Suite('Array map')
  .add('native', () => testArray.map(addOne))
  .add('principia', () => A.map_(testArray, addOne))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
