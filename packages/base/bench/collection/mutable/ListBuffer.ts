import * as V from '@principia/base/collection/immutable/Vector'
import { ListBuffer } from '@principia/base/collection/mutable/ListBuffer'
import * as b from 'benny'

b.suite(
  'ListBuffer',
  b.add('Vector#push', () => {
    const v = V.emptyPushable<number>()
    for (let i = 0; i < 1000; i++) {
      V.push(i, v)
    }
  }),
  b.add('ListBuffer#append', () => {
    const b = new ListBuffer<number>()
    for (let i = 0; i < 1000; i++) {
      b.append(i)
    }
  }),
  b.cycle(),
  b.complete()
)
