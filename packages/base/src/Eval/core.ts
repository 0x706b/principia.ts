/*
 * -------------------------------------------------------------------------------------------------
 * `Eval` is a port of the Eval monad from typelevel's `cats` library
 * -------------------------------------------------------------------------------------------------
 */

import type { Stack } from '../util/support/Stack'

import { identity } from '../function'
import * as E from '../internal/Either'
import * as O from '../internal/Option'
import { tuple } from '../internal/tuple'
import { AtomicReference } from '../util/support/AtomicReference'
import { makeStack } from '../util/support/Stack'

export const EvalTypeId = Symbol()
export type EvalTypeId = typeof EvalTypeId

export const EvalTag = {
  Now: 'Now',
  Later: 'Later',
  Always: 'Always',
  Defer: 'Defer',
  Bind: 'Chain',
  Memoize: 'Memoize'
} as const

/**
 * `Eval<A>` is a monad that controls evaluation, providing a way to perform
 * stack-safe recursion through an internal trampoline.
 *
 * NOTE: `Eval` is for pure computation _only_. Side-effects should not be
 * performed within `Eval`. If you must perform side-effects,
 * use `Sync`, `Async`, or `IO` from the `io` package
 */
export abstract class Eval<A> {
  readonly _A!: () => A

  abstract get value(): A
  abstract get memoize(): Eval<A>
}

class Now<A> extends Eval<A> {
  readonly _evalTag = EvalTag.Now
  constructor(readonly a: A) {
    super()
  }
  get value() {
    return this.a
  }
  get memoize() {
    return this
  }
}

class Later<A> extends Eval<A> {
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  readonly _evalTag                 = EvalTag.Later
  private thunk                     = new AtomicReference<null | (() => A)>(null)
  private result: A | null          = null
  constructor(f: () => A) {
    super()
    this.thunk.set(f)
  }
  get value() {
    if (!this.thunk.get) {
      return this.result!
    } else {
      const result = this.thunk.get()
      this.thunk.set(null)
      this.result = result
      return result
    }
  }
  get memoize() {
    return this
  }
}

class Always<A> extends Eval<A> {
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  readonly _evalTag                 = EvalTag.Always
  constructor(readonly thunk: () => A) {
    super()
  }
  get value() {
    return this.thunk()
  }
  get memoize() {
    return new Later(this.thunk)
  }
}

class Defer<A> extends Eval<A> {
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  readonly _evalTag                 = EvalTag.Defer
  constructor(readonly thunk: () => Eval<A>) {
    super()
  }
  get value() {
    return evaluate(this.thunk())
  }
  get memoize(): Eval<A> {
    return new Memoize(this)
  }
}

class Chain<A, B> extends Eval<B> {
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  readonly _evalTag                 = EvalTag.Bind
  constructor(readonly ma: Eval<A>, readonly f: (a: A) => Eval<B>) {
    super()
  }
  get value(): B {
    return evaluate(this)
  }
  get memoize(): Eval<B> {
    return new Memoize(this)
  }
}

class Memoize<A> extends Eval<A> {
  readonly [EvalTypeId]: EvalTypeId = EvalTypeId
  readonly _evalTag                 = EvalTag.Memoize
  constructor(readonly ma: Eval<A>) {
    super()
  }
  public result: O.Option<A> = O.none<A>()

  get memoize() {
    return this
  }

  get value(): A {
    return O.getOrElse_(this.result, () => {
      const a     = evaluate(this)
      this.result = O.some(a)
      return a
    })
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Construct a lazy Eval<A> instance.
 *
 * This type can be used for "lazy" values. In some sense it is
 * equivalent to using a thunked value.
 *
 * This type will evaluate the computation every time the value is
 * required. It should be avoided except when laziness is required and
 * caching must be avoided. Generally, prefer `later`.
 */
export function always<A>(thunk: () => A): Eval<A> {
  return new Always(thunk)
}

/**
 * Defer is a type of Eval that is used to defer computations
 * which produce Eval.
 */
export function defer<A>(thunk: () => Eval<A>): Eval<A> {
  return new Defer(thunk)
}

/**
 * Construct a lazy Eval instance.
 *
 * This type should be used for most "lazy" values. In some sense it
 * is equivalent to using a thunked value, but is cached for speed
 * after the initial computation.
 *
 * When caching is not required or desired (e.g. if the value produced
 * may be large) prefer `always`. When there is no computation
 * necessary, prefer `now`.
 *
 * Once `later` has been evaluated, the closure (and any values captured
 * by the closure) will not be retained, and will be available for
 * garbage collection.
 */
export function later<A>(f: () => A): Eval<A> {
  return new Later(f)
}

/**
 * Construct an eager Eval instance.
 *
 * In some sense it is equivalent to using a `const` in a typical computation.
 *
 * This type should be used when an A value is already in hand, or
 * when the computation to produce an A value is pure and very fast.
 */
export function now<A>(a: A): Eval<A> {
  return new Now(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Eval<A> {
  return now(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<A, B, C>(ma: Eval<A>, mb: Eval<B>, f: (a: A, b: B) => C): Eval<C> {
  return chain_(ma, (a) => map_(mb, (b) => f(a, b)))
}

export function crossWith<A, B, C>(mb: Eval<B>, f: (a: A, b: B) => C): (ma: Eval<A>) => Eval<C> {
  return (ma) => crossWith_(ma, mb, f)
}

export function cross_<A, B>(ma: Eval<A>, mb: Eval<B>): Eval<readonly [A, B]> {
  return crossWith_(ma, mb, tuple)
}

export function cross<B>(mb: Eval<B>): <A>(ma: Eval<A>) => Eval<readonly [A, B]> {
  return (ma) => cross_(ma, mb)
}

export function ap_<A, B>(mab: Eval<(a: A) => B>, ma: Eval<A>): Eval<B> {
  return crossWith_(mab, ma, (f, a) => f(a))
}

export function ap<A>(ma: Eval<A>): <B>(mab: Eval<(a: A) => B>) => Eval<B> {
  return (mab) => ap_(mab, ma)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Eval<A>, f: (a: A) => B): Eval<B> {
  return chain_(fa, (a) => now(f(a)))
}

export function map<A, B>(f: (a: A) => B): (fa: Eval<A>) => Eval<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Eval<A>, f: (a: A) => Eval<B>): Eval<B> {
  return new Chain(ma, f)
}

export function chain<A, B>(f: (a: A) => Eval<B>): (ma: Eval<A>) => Eval<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: Eval<Eval<A>>): Eval<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Eval<void> {
  return now(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Runtime
 * -------------------------------------------------------------------------------------------------
 */

type Concrete = Now<any> | Later<any> | Always<any> | Defer<any> | Chain<any, any> | Memoize<any>

export function evaluate<A>(e: Eval<A>): A {
  const addToMemo =
    <A1>(m: Memoize<A1>) =>
    (a: A1): Eval<A1> => {
      m.result = O.some(a)
      return new Now(a)
    }

  let frames  = undefined as Stack<(_: any) => Eval<any>> | undefined
  let current = e as Eval<any> | undefined
  let result  = null

  function pushContinuation(cont: (_: any) => Eval<any>) {
    frames = makeStack(cont, frames)
  }

  function popContinuation() {
    const current = frames?.value
    frames        = frames?.previous
    return current
  }

  while (current != null) {
    const I = current as Concrete
    switch (I._evalTag) {
      case EvalTag.Bind: {
        current = I.ma
        pushContinuation(I.f)
        break
      }
      case EvalTag.Now: {
        result             = I.a
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(result)
        } else {
          current = undefined
        }
        break
      }
      case EvalTag.Later: {
        result             = I.value
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(result)
        } else {
          current = undefined
        }
        break
      }
      case EvalTag.Always: {
        result             = I.thunk()
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(result)
        } else {
          current = undefined
        }
        break
      }
      case EvalTag.Defer: {
        current = I.thunk()
        break
      }
      case EvalTag.Memoize: {
        if (I.result._tag === 'Some') {
          result             = I.result.value
          const continuation = popContinuation()
          if (continuation) {
            current = continuation(result)
            break
          } else {
            current = undefined
            break
          }
        } else {
          pushContinuation(addToMemo(I))
          current = I.ma
          break
        }
      }
    }
  }
  return result
}
