import { Suite } from 'benchmark'

import * as Iter from '../../src/Iterable'

const x = Iter.range(0, 100)

new Suite('forof vs. plain loop')
  .add('forof', () => {
    const ns = []
    for (const n of x) {
      ns.push(n)
    }
  })
  .add('while', () => {
    const iterator = x[Symbol.iterator]()
    const ns       = []
    let result
    while (!(result = iterator.next()).done) {
      ns.push(result.value)
    }
  })
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
