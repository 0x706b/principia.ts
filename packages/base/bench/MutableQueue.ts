import * as MQ from '@principia/base/util/support/MutableQueue'
import * as b from 'benny'

b.suite(
  'MutableQueue',
  b.add('offer/poll', () => {
    const q = MQ.bounded<number>(10)
    for (let i = 0; i < 10; i++) {
      for (let x = 0; x < 10; x++) {
        q.offer(x)
      }
      for (let x = 0; x < 10; x++) {
        q.poll(undefined)
      }
    }
  }),
  b.cycle(),
  b.complete()
)
