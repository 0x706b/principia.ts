import * as A from '@principia/base/Array'
import { Suite } from 'benchmark'

const testArray = A.range(0, 1000)
const sum       = (x: number, y: number) => x + y

new Suite('foldl / reduce')
  .add('native (reduce)', () => testArray.reduce(sum, 0))
  .add('principia (foldl)', () => A.foldl_(testArray, 0, sum))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
