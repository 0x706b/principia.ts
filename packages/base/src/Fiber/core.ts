import type * as FR from '../FiberRef/core'
import type * as C from '../IO/Cause'
import type { UIO } from '../IO/core'
import type { Exit } from '../IO/Exit/core'
import type { Maybe } from '../Maybe'
import type { Scope } from '../Scope'
import type { FiberId } from './FiberId'
import type { FiberStatus } from './FiberStatus'

import * as I from '../IO/core'
import * as Ex from '../IO/Exit/core'
import * as M from '../Maybe'
import { matchTag_ } from '../prelude'

/**
 * InterruptStatus tracks interruptability of the current stack region
 */
export class InterruptStatus {
  constructor(readonly isInterruptible: boolean) {}

  get isUninteruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }
}

export const interruptible = new InterruptStatus(true)

export const uninterruptible = new InterruptStatus(false)

export function interruptStatus(b: boolean): InterruptStatus {
  return b ? interruptible : uninterruptible
}

/**
 * A record containing information about a `Fiber`.
 */
export class FiberDescriptor {
  constructor(
    readonly id: FiberId,
    readonly status: FiberStatus,
    readonly interruptors: ReadonlySet<FiberId>,
    readonly interruptStatus: InterruptStatus,
    readonly scope: Scope
  ) {}
}

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 */
export type Fiber<E, A> = RuntimeFiber<E, A> | SyntheticFiber<E, A>

export interface CommonFiber<E, A> {
  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  readonly await: UIO<Exit<E, A>>
  /**
   * Gets the value of the fiber ref for this fiber, or the initial value of
   * the fiber ref, if the fiber is not storing the ref.
   */
  readonly getRef: <A>(fiberRef: FR.Runtime<A>) => UIO<A>
  /**
   * Inherits values from all {@link FiberRef} instances into current fiber.
   * This will resume immediately.
   */
  readonly inheritRefs: UIO<void>
  /**
   * Interrupts the fiber as if interrupted from the specified fiber. If the
   * fiber has already exited, the returned effect will resume immediately.
   * Otherwise, the effect will resume when the fiber exits.
   */
  readonly interruptAs: (fiberId: FiberId) => UIO<Exit<E, A>>
  /**
   * Tentatively observes the fiber, but returns immediately if it is not already done.
   */
  readonly poll: UIO<Maybe<Exit<E, A>>>
}

export interface RuntimeFiber<E, A> extends CommonFiber<E, A> {
  _tag: 'RuntimeFiber'
  /**
   * Evaluates the specified effect on the fiber. If this is not possible,
   * because the fiber has already ended life, then the specified alternate
   * effect will be executed instead.
   */
  readonly evalOn: (effect: UIO<any>, orElse: UIO<any>) => UIO<void>
  /**
   * The identity of the fiber.
   */
  readonly id: FiberId

  readonly scope: Scope
  /**
   * The status of the fiber.
   */
  readonly status: UIO<FiberStatus>
}

export interface SyntheticFiber<E, A> extends CommonFiber<E, A> {
  _tag: 'SyntheticFiber'
}

/**
 * A type helper for building a Synthetic Fiber
 */
export function syntheticFiber<E, A>(_: SyntheticFiber<E, A>): Fiber<E, A> {
  return _
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function done<E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> {
  return {
    _tag: 'SyntheticFiber',
    await: I.pure(exit),
    getRef: (ref) => I.pure(ref.initial),
    inheritRefs: I.unit(),
    interruptAs: () => I.pure(exit),
    poll: I.pure(M.just(exit))
  }
}

export function fail<E>(e: E): SyntheticFiber<E, never> {
  return done(Ex.fail(e))
}

export function halt<E>(cause: C.Cause<E>) {
  return done(Ex.failCause(cause))
}

export function interruptAs(id: FiberId) {
  return done(Ex.interrupt(id))
}

export function succeed<A>(a: A): SyntheticFiber<never, A> {
  return done(Ex.succeed(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Folds over the runtime or synthetic fiber.
 */
export function match_<E, A, B>(
  fiber: Fiber<E, A>,
  onRuntime: (_: RuntimeFiber<E, A>) => B,
  onSynthetic: (_: SyntheticFiber<E, A>) => B
): B {
  switch (fiber._tag) {
    case 'RuntimeFiber': {
      return onRuntime(fiber)
    }
    case 'SyntheticFiber': {
      return onSynthetic(fiber)
    }
  }
}

/**
 * Folds over the runtime or synthetic fiber.
 */
export function match<E, A, B>(
  onRuntime: (_: RuntimeFiber<E, A>) => B,
  onSynthetic: (_: SyntheticFiber<E, A>) => B
): (fiber: Fiber<E, A>) => B {
  return (fiber) => match_(fiber, onRuntime, onSynthetic)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Fiber<never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

function wait<E, A>(fiber: Fiber<E, A>): UIO<Exit<E, A>> {
  return fiber.await
}

export { wait as await }

export function evalOn_<E, A>(fiber: Fiber<E, A>, effect: UIO<any>, orElse: UIO<any>): UIO<void> {
  return matchTag_(fiber, {
    RuntimeFiber: (_) => _.evalOn(effect, orElse),
    SyntheticFiber: () => I.unit()
  })
}

export function evalOn(effect: UIO<any>, orElse: UIO<any>): <E, A>(fiber: Fiber<E, A>) => UIO<void> {
  return (fiber) => evalOn_(fiber, effect, orElse)
}
