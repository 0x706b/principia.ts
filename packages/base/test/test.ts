import type { Deferred } from 'benchmark'

import { Suite } from 'benchmark'

import * as Eval from '../src/Eval'
import * as IO from '../src/IO'
import * as Z from '../src/Z'

export const fibZ = (n: bigint): Z.Z<never, unknown, never, unknown, never, bigint> =>
  Z.defer(() => {
  if(n < BigInt(2)) {
    return Z.succeed(BigInt(1))
  }
  return Z.chain_(fibZ(n - BigInt(1)), (a) => Z.map_(fibZ(n - BigInt(2)), (b) => a + b))
})

export const fibIO = (n: bigint): IO.UIO<bigint> =>
  IO.defer(() => {
    if (n < BigInt(2)) {
      return IO.succeed(BigInt(1))
    }
    return IO.chain_(fibIO(n - BigInt(1)), (a) => IO.map_(fibIO(n - BigInt(2)), (b) => a + b))
  })

export const fibEval = (n: bigint): Eval.Eval<bigint> =>
  Eval.defer(() => {
    if (n < BigInt(2)) {
      return Eval.now(BigInt(1))
    }
    return Eval.chain_(fibEval(n - BigInt(1)), (a) => Eval.map_(fibEval(n - BigInt(2)), (b) => a + b))
  })

new Suite('')
  .add('Eval', () => {
    Eval.evaluate(fibEval(BigInt(20)))
  })
  .add('Z', () => {
    Z.runResult(fibZ(BigInt(20)))
  })
  .add(
    'IO',
    (cb: Deferred) => {
      IO.run_(fibIO(BigInt(20)), () => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
