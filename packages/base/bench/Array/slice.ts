import { Suite } from 'benchmark'

import * as A from '../../src/Array'

const arr = A.range(0, 100)

new Suite('copy methods')
  .add('array', () => A.slice_(arr, 50, 75))
  .add('native', () => arr.slice(50, 75))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
