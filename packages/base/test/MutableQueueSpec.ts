import * as MQ from '@principia/base/internal/MutableQueue'
import { all, assert_, equalTo, isFalse, isTrue, suite, test } from '@principia/test'
import { DefaultRunnableSpec } from '@principia/test/DefaultRunnableSpec'

class MutableQueueSpec extends DefaultRunnableSpec {
  spec = suite(
    'MutableQueue',
    suite(
      'make a bounded MutableQueue',
      test('of capacity 1 returns a queue of capacity 1', () => {
        const q = MQ.bounded(1)
        return assert_(q.capacity, equalTo(1))
      }),
      test('of capacity 2 returns a queue of capacity 2', () => {
        const q = MQ.bounded(2)
        return assert_(q.capacity, equalTo(2))
      }),
      test('of capacity 3 returns a queue of capacity 3', () => {
        const q = MQ.bounded(3)
        return assert_(q.capacity, equalTo(3))
      })
    ),
    suite(
      'With a RingBuffer of capacity 2',
      test('`offer` of 2 items succeeds, further offers fail', () => {
        const q = MQ.bounded<number>(2)
        return all(
          assert_(q.enqueue(1), isTrue),
          assert_(q.size, equalTo(1)),
          assert_(q.enqueue(2), isTrue),
          assert_(q.size, equalTo(2)),
          assert_(q.enqueue(3), isFalse),
          assert_(q.isFull, isTrue)
        )
      }),
      test('`poll` of 2 items from full queue succeeds, further `poll`s return default value', () => {
        const q = MQ.bounded<number>(2)
        q.enqueue(1)
        q.enqueue(2)
        return all(
          assert_(q.dequeue(-1), equalTo(1)),
          assert_(q.dequeue(-1), equalTo(2)),
          assert_(q.dequeue(-1), equalTo(-1)),
          assert_(q.isEmpty, isTrue)
        )
      })
    )
  )
}

export default new MutableQueueSpec()
