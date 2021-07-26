import type { Deferred } from 'benchmark'

import * as Effect from '@effect-ts/core/Effect'
import { Suite } from 'benchmark'

import { pipe } from '../src/function'
import * as IO from '../src/IO'

export const fibEffect = (n: bigint): Effect.UIO<bigint> =>
  Effect.suspend(() => {
    if (n < BigInt(2)) {
      return Effect.succeed(BigInt(1))
    }
    return Effect.chain_(fibEffect(n - BigInt(1)), (a) => Effect.map_(fibEffect(n - BigInt(2)), (b) => a + b))
  })

export const fibIO = (n: bigint): IO.UIO<bigint> =>
  IO.defer(() => {
    if (n < BigInt(2)) {
      return IO.succeed(BigInt(1))
    }
    return IO.chain_(fibIO(n - BigInt(1)), (a) => IO.map_(fibIO(n - BigInt(2)), (b) => a + b))
  })

new Suite('')
  .add(
    'Effect',
    async (cb: Deferred) => {
      await Effect.runPromise(fibEffect(BigInt(20)))
      cb.resolve()
    },
    { defer: true }
  )
  .add(
    'IO',
    async (cb: Deferred) => {
      await IO.runPromise(fibIO(BigInt(20)))
      cb.resolve()
    },
    { defer: true }
  )
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({ async: true })
