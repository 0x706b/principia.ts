import type { Fiber, SyntheticFiber } from '../core'

import * as C from '../../Cause'
import * as Ex from '../../Exit'
import { crossWithPar_ } from '../../IO/combinators/apply-par'
import * as O from '../../Option'
import * as I from '../internal/io'

export function crossFirst_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function cross_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return crossWith_(fa, fb, (a, b) => [a, b])
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function cross<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, (B | A)[]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function crossWith_<E, E1, A, A1, B>(
  fa: Fiber<E, A>,
  fb: Fiber<E1, A1>,
  f: (a: A, b: A1) => B
): SyntheticFiber<E | E1, B> {
  return {
    _tag: 'SyntheticFiber',
    getRef: (ref) => I.crossWith_(fa.getRef(ref), fb.getRef(ref), (a, b) => ref.join(a, b)),
    inheritRefs: I.chain_(fa.inheritRefs, () => fb.inheritRefs),
    interruptAs: (id) =>
      I.crossWith_(fa.interruptAs(id), fb.interruptAs(id), (ea, eb) => Ex.crossWithCause_(ea, eb, f, C.both)),
    poll: I.crossWith_(fa.poll, fb.poll, (fa, fb) =>
      O.chain_(fa, (ea) => O.map_(fb, (eb) => Ex.crossWithCause_(ea, eb, f, C.both)))
    ),
    await: I.result(crossWithPar_(I.chain_(fa.await, I.done), I.chain_(fb.await, I.done), f))
  }
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function crossWith<A, D, B, C>(
  fb: Fiber<D, B>,
  f: (a: A, b: B) => C
): <E>(fa: Fiber<E, A>) => SyntheticFiber<D | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}
