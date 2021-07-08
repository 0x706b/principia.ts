import * as A from '@principia/base/Array'
import { Suite } from 'benchmark'

const copyLoop = <A>(xs: ReadonlyArray<A>): ReadonlyArray<A> => {
  const mut_out = Array(xs.length)
  for (let i = 0; i < xs.length; i++) {
    mut_out[i] = xs[i]
  }
  return mut_out
}

const copySlice = <A>(xs: ReadonlyArray<A>): ReadonlyArray<A> => {
  return xs.slice()
}

const copyFrom = <A>(xs: ReadonlyArray<A>): ReadonlyArray<A> => {
  return Array.from(xs)
}

const testArray = A.range(0, 1000)

new Suite('copy methods')
  .add('for loop', () => copyLoop(testArray))
  .add('Array.prototype.slice', () => copySlice(testArray))
  .add('Array.from', () => copyFrom(testArray))
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
