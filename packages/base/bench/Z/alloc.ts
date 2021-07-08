import { Suite } from 'benchmark'

import * as A from '../../src/Array'
import { pipe } from '../../src/function'
import { tuple } from '../../src/tuple'
import * as Z from '../../src/Z'

export function iforeachArrayAlloc_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z.Z<W, S, S, R, E, B>
): Z.Z<W, S, S, R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    A.ifoldl(Z.succeed([0, Array(as.length)]) as Z.Z<W, S, S, R, E, readonly [number, Array<B>]>, (b, i, a) =>
      Z.crossWith_(
        b,
        Z.defer(() => f(i, a)),
        ([prev, mut_acc], a) => {
          mut_acc[prev] = a
          return tuple(i, mut_acc)
        }
      )
    ),
    Z.map(([, bs]) => bs)
  )
}

export function iforeachArrayPush_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z.Z<W, S, S, R, E, B>
): Z.Z<W, S, S, R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    A.ifoldl(Z.succeed([]) as Z.Z<W, S, S, R, E, Array<B>>, (b, i, a) =>
      Z.crossWith_(
        b,
        Z.defer(() => f(i, a)),
        (acc, a) => {
          acc.push(a)
          return acc
        }
      )
    )
  )
}

const test = A.range(1, 100)

new Suite('name')
  .add('alloc', () => {
    Z.runResult(iforeachArrayAlloc_(test, (i, n) => Z.succeed(i + n)))
  })
  .add('push', () => {
    Z.runResult(iforeachArrayPush_(test, (i, n) => Z.succeed(i + n)))
  })
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
