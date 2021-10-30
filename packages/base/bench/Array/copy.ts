import * as A from '@principia/base/Array'
import * as b from 'benny'

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

b.suite(
  'copy',
  b.add('for loop', () => copyLoop(testArray)),
  b.add('Array.prototype.slice', () => copySlice(testArray)),
  b.add('Array.from', () => copyFrom(testArray)),
  b.cycle(),
  b.complete()
)
