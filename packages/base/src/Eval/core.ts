import type { Stack } from '../internal/Stack'
import type { _A } from '../prelude'

import { identity } from '../function'
import { makeStack } from '../internal/Stack'
import { tuple } from '../internal/tuple'

export const EvalTypeId = Symbol.for('@principia/base/Eval')
export type EvalTypeId = typeof EvalTypeId

export interface Eval<A> {
  readonly [EvalTypeId]: EvalTypeId
  readonly _A: () => A
}

export class Value<A> implements Eval<A> {
  readonly _tag = 0
  readonly _A!: () => A;
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  constructor(readonly value: A) {}
}

export class Defer<A> implements Eval<A> {
  readonly _tag = 1
  readonly _A!: () => A;
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  constructor(readonly make: () => Eval<A>) {}
}

export class Chain<A, B> implements Eval<B> {
  readonly _tag = 2
  readonly _A!: () => B;
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  constructor(readonly ma: Eval<A>, readonly f: (a: A) => Eval<B>) {}
}

type Concrete = Value<any> | Defer<any> | Chain<any, any>

/**
 * @optimize remove
 */
function concrete(_: Eval<any>): asserts _ is Concrete {
  //
}

export function run<A>(computation: Eval<A>): A {
  let frames: Stack<(a: any) => Eval<any>> | undefined = undefined
  let out = undefined
  let cur = computation
  while (cur != null) {
    concrete(cur)
    switch (cur._tag) {
      case 2:
        concrete(cur.ma)
        switch (cur.ma._tag) {
          case 0:
            cur = cur.f(cur.ma.value)
            break
          default:
            frames = makeStack(cur.f, frames)
            cur    = cur.ma
            break
        }
        break
      case 1:
        cur = cur.make()
        break
      case 0:
        out = cur.value
        if (frames) {
          cur    = frames.value(out)
          frames = frames.previous
        } else {
          cur = null!
        }
        break
    }
  }
  return out
}

export function now<A>(a: A): Eval<A> {
  return new Value(a)
}

export function defer<A>(make: () => Eval<A>): Eval<A> {
  return new Defer(make)
}

export function always<A>(make: () => A): Eval<A> {
  return defer(() => now(make()))
}

const UNSET = Symbol.for('@principia/base/Eval/UNSET')

export function later<A>(make: () => A): Eval<A> {
  let v: A | typeof UNSET = UNSET
  // eslint-disable-next-line no-param-reassign
  return always(() => (v === UNSET ? (((v = make()), (make = null!)), v) : v))
}

export function chain_<A, B>(ma: Eval<A>, f: (a: A) => Eval<B>): Eval<B> {
  return new Chain(ma, f)
}

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Eval<B>): (ma: Eval<A>) => Eval<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: Eval<Eval<A>>): Eval<A> {
  return chain_(mma, identity)
}

export function map_<A, B>(fa: Eval<A>, f: (a: A) => B): Eval<B> {
  return chain_(fa, (a) => now(f(a)))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Eval<A>) => Eval<B> {
  return (fa) => map_(fa, f)
}

export function crossWith_<A, B, C>(fa: Eval<A>, fb: Eval<B>, f: (a: A, b: B) => C): Eval<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Eval<B>, f: (a: A, b: B) => C): (fa: Eval<A>) => Eval<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(ma: Eval<A>, mb: Eval<B>): Eval<readonly [A, B]> {
  return crossWith_(ma, mb, tuple)
}

/**
 * @dataFirst cross_
 */
export function cross<B>(mb: Eval<B>): <A>(ma: Eval<A>) => Eval<readonly [A, B]> {
  return (ma) => cross_(ma, mb)
}

export function ap_<A, B>(mab: Eval<(a: A) => B>, ma: Eval<A>): Eval<B> {
  return crossWith_(mab, ma, (f, a) => f(a))
}

/**
 * @dataFirst ap_
 */
export function ap<A>(ma: Eval<A>): <B>(mab: Eval<(a: A) => B>) => Eval<B> {
  return (mab) => ap_(mab, ma)
}

export function unit(): Eval<void> {
  return now(undefined)
}

export function pure<A>(a: A): Eval<A> {
  return now(a)
}

export function sequenceT<A extends ReadonlyArray<Eval<any>>>(...computations: A): Eval<{ [K in keyof A]: _A<A[K]> }> {
  return defer(() => now(computations.map((e) => run(e)))) as Eval<any>
}

interface GenEval<A> {
  readonly _A: () => A
  computation: Eval<A>
  [Symbol.iterator](): Generator<GenEval<A>, A, any>
}

function mkGenEval<A>(computation: Eval<A>): GenEval<A> {
  return {
    computation,
    *[Symbol.iterator]() {
      return yield this
    }
  } as GenEval<A>
}

const __adapter = mkGenEval

function runGen<T extends GenEval<A>, A>(
  state: IteratorYieldResult<T> | IteratorReturnResult<A>,
  iterator: Generator<T, A, any>
): Eval<A> {
  if (state.done) {
    return now(state.value)
  }
  return chain_(state.value.computation, (a) => {
    const next = iterator.next(a)
    return runGen(next, iterator)
  })
}

export function gen<T extends GenEval<any>, A>(
  f: (i: { <A>(_: Eval<A>): GenEval<A> }) => Generator<T, A, any>
): Eval<A> {
  return defer(() => {
    const iterator = f(__adapter)
    const state    = iterator.next()
    return runGen(state, iterator)
  })
}
