import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import { tuple } from '@principia/base/tuple'
import * as Z from '@principia/base/Z'
import * as b from 'benny'

export function iforeachArrayAlloc_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z.Z<W, S, S, R, E, B>
): Z.Z<W, S, S, R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    A.foldl(Z.succeed([0, Array(as.length)]) as Z.Z<W, S, S, R, E, readonly [number, Array<B>]>, (b, a, i) =>
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
    A.foldl(Z.succeed([]) as Z.Z<W, S, S, R, E, Array<B>>, (b, a, i) =>
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

b.suite(
  'name',
  b.add('alloc', () => {
    Z.runResult(iforeachArrayAlloc_(test, (i, n) => Z.succeed(i + n)))
  }),
  b.add('push', () => {
    Z.runResult(iforeachArrayPush_(test, (i, n) => Z.succeed(i + n)))
  }),
  b.cycle(),
  b.complete()
)
