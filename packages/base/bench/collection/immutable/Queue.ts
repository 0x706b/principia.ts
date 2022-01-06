import * as Q from '@principia/base/collection/immutable/Queue'
import { ImmutableQueue } from '@principia/base/internal/ImmutableQueue'
import * as M from '@principia/base/Maybe'
import * as b from 'benny'

b.suite(
  'Queue',
  b.add('Queue.enqueue', () => {
    let q: Q.Queue<number> = Q.empty()
    for (let i = 0; i < 1000; i++) {
      q = Q.enqueue_(q, i)
    }
  }),
  b.add('ImmutableQueue.enqueue', () => {
    let q = ImmutableQueue.empty<number>()
    for (let i = 0; i < 1000; i++) {
      q = q.enqueue(i)
    }
  }),
  b.add('Queue.dequeue', () => {
    let q: Q.Queue<number> = Q.empty()
    for (let i = 0; i < 1000; i++) {
      q = Q.enqueue_(q, i)
    }
    return () => {
      for (let i = 0; i < 1000; i++) {
        q = M.getOrElse_(
          M.map_(Q.dequeue(q), (x) => x[1]),
          () => Q.empty()
        )
      }
    }
  }),
  b.add('ImmutableQueue.dequeue', () => {
    let q = ImmutableQueue.empty<number>()
    for (let i = 0; i < 1000; i++) {
      q = q.enqueue(i)
    }
    return () => {
      for (let i = 0; i < 1000; i++) {
        q = M.getOrElse_(
          M.map_(q.dequeue(), (x) => x[1]),
          () => ImmutableQueue.empty()
        )
      }
    }
  }),
  b.add('Queue.exists', () => {
    let q: Q.Queue<number> = Q.empty()
    for (let i = 0; i < 1000; i++) {
      q = Q.enqueue_(q, i)
    }
    return () => {
      Q.exists_(q, (n) => n === 900)
    }
  }),
  b.add('ImmutableQueue.exists', () => {
    let q = ImmutableQueue.empty<number>()
    for (let i = 0; i < 1000; i++) {
      q = q.enqueue(i)
    }
    return () => {
      q.exists((n) => n === 900)
    }
  }),
  b.cycle(),
  b.complete()
)
