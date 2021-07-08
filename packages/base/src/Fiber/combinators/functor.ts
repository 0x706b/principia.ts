import type { Fiber, SyntheticFiber } from '../core'

import * as Ex from '../../Exit'
import * as O from '../../Option'
import * as I from '../internal/io'

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapIO_<E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => I.FIO<E1, B>): Fiber<E | E1, B> {
  return {
    _tag: 'SyntheticFiber',
    await: I.chain_(fiber.await, Ex.foreachIO(f)),
    getRef: (ref) => fiber.getRef(ref),
    inheritRefs: fiber.inheritRefs,
    interruptAs: (id) => I.chain_(fiber.interruptAs(id), Ex.foreachIO(f)),
    poll: I.chain_(
      fiber.poll,
      O.match(
        () => I.pure(O.none()),
        (a) => I.map_(Ex.foreachIO_(a, f), O.some)
      )
    )
  }
}

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapIO<A, E1, B>(f: (a: A) => I.FIO<E1, B>): <E>(fiber: Fiber<E, A>) => Fiber<E1 | E, B> {
  return (fiber) => mapIO_(fiber, f)
}

/**
 * Maps over the value the fiber computes.
 */
export function map_<E, A, B>(fa: Fiber<E, A>, f: (a: A) => B): Fiber<E, B> {
  return mapIO_(fa, (a) => I.pure(f(a)))
}

/**
 * Maps over the value the fiber computes.
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Fiber<E, A>) => Fiber<E, B> {
  return (fa) => map_(fa, f)
}
