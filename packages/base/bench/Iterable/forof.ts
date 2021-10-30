import * as Iter from '@principia/base/Iterable'
import * as b from 'benny'

const x = Iter.range(0, 100)

b.suite(
  'forof vs. plain loop',
  b.add('forof', () => {
    const ns = []
    for (const n of x) {
      ns.push(n)
    }
  }),
  b.add('while', () => {
    const iterator = x[Symbol.iterator]()
    const ns       = []
    let result
    while (!(result = iterator.next()).done) {
      ns.push(result.value)
    }
  }),
  b.cycle(),
  b.complete()
)
