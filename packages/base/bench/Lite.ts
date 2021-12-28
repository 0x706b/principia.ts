import * as Ev from '@principia/base/Eval'
import * as Li from '@principia/base/Lite'
import * as b from 'benny'

function facLite(n: bigint): Li.Eval<bigint> {
  return Li.defer(() => {
    if (n === BigInt(0)) {
      return Li.now(BigInt(1))
    } else {
      return Li.map_(facLite(n - BigInt(1)), (x) => n * x)
    }
  })
}

function facEval(n: bigint): Ev.Eval<bigint> {
  return Ev.defer(() => {
    if (n === BigInt(0)) {
      return Ev.now(BigInt(1))
    } else {
      return Ev.map_(facEval(n - BigInt(1)), (x) => n * x)
    }
  })
}

b.suite(
  'Lite',
  b.add('Lite', () => {
    Li.run(facLite(BigInt(100)))
  }),
  b.add('Eval', () => {
    Ev.evaluate(facEval(BigInt(100)))
  }),
  b.add('Lite.sequenceT', () => {
    Li.run(Li.map_(Li.sequenceT(Li.now(1), Li.now(2), Li.now(3)), ([a, b, c]) => a + b + c))
  }),
  b.add('Eval.sequenceT', () => {
    Ev.evaluate(Ev.map_(Ev.sequenceT(Ev.now(1), Ev.now(2), Ev.now(3)), ([a, b, c]) => a + b + c))
  }),
  b.add('Lite.later', () => {
    const comp = Li.later(() => {
      for (let i = 0; i < 10000; i++) {
        //
      }
      return 0
    })
    Li.run(comp)
    Li.run(comp)
  }),
  b.add('Eval.later', () => {
    const comp = Ev.later(() => {
      for (let i = 0; i < 10000; i++) {
        //
      }
      return 0
    })
    Ev.evaluate(comp)
    Ev.evaluate(comp)
  }),
  b.cycle(),
  b.complete()
)
