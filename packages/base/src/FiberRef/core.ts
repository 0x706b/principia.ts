import type { UIO } from '../IO/core'

import { identity, pipe } from '../function'
import { ModifyFiberRef, NewFiberRef } from '../IO/core'
import * as O from '../Option'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

/**
 * `FiberRef` described a mutable reference inside of a `Fiber`.
 * Value is automatically propagated to child on fork and merged back in after joining child.
 */
export class FiberRef<A> {
  constructor(readonly initial: A, readonly fork: (a: A) => A, readonly join: (a: A, a1: A) => A) {}
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function make<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a1: A) => A = (_, a) => a
): UIO<FiberRef<A>> {
  return new NewFiberRef(initial, onFork, onJoin)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function modify_<A, B>(fiberRef: FiberRef<A>, f: (a: A) => [B, A]): UIO<B> {
  return new ModifyFiberRef(fiberRef, f)
}

export function modify<A, B>(f: (a: A) => [B, A]): (fiberRef: FiberRef<A>) => UIO<B> {
  return (fr) => modify_(fr, f)
}

export function update_<A>(fiberRef: FiberRef<A>, f: (a: A) => A): UIO<void> {
  return modify_(fiberRef, (a) => [undefined, f(a)])
}

export function update<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => UIO<void> {
  return (fr) => update_(fr, f)
}

export function set_<A>(fiberRef: FiberRef<A>, a: A): UIO<void> {
  return modify_(fiberRef, () => [undefined, a])
}

export function set<A>(a: A): (fiberRef: FiberRef<A>) => UIO<void> {
  return (fr) => set_(fr, a)
}

export function get<A>(fiberRef: FiberRef<A>): UIO<A> {
  return pipe(
    fiberRef,
    modify((a) => [a, a])
  )
}

export function getAndSet_<A>(fiberRef: FiberRef<A>, a: A): UIO<A> {
  return modify_(fiberRef, (v) => [v, a])
}

export function getAndSet<A>(a: A): (fiberRef: FiberRef<A>) => UIO<A> {
  return (fr) => getAndSet_(fr, a)
}

export function getAndUpdate_<A>(fiberRef: FiberRef<A>, f: (a: A) => A): UIO<A> {
  return modify_(fiberRef, (a) => [a, f(a)])
}

export function getAndUpdate<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => UIO<A> {
  return (fr) => getAndUpdate_(fr, f)
}

export function getAndUpdateSome_<A>(fiberRef: FiberRef<A>, f: (a: A) => O.Option<A>): UIO<A> {
  return modify_(fiberRef, (a) => [a, O.getOrElse_(f(a), () => a)])
}

export function getAndUpdateSome<A>(f: (a: A) => O.Option<A>): (fiberRef: FiberRef<A>) => UIO<A> {
  return (fr) => getAndUpdateSome_(fr, f)
}
