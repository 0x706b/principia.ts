import * as Iter from '@principia/base/Iterable'
import * as b from 'benny'

const ia = Iter.range(0, 100)
const ib = (n: number) => Iter.range(n, n + 5)

const ic = Iter.chain_(ia, ib)

const f = () => {}

b.suite(
  'Iterable',
  b.add('chain', () => {
    for (const a of ic) {
      //
    }
  }),
  b.cycle(),
  b.complete()
)
