// tracing: off

import type { Cause } from '../Cause/core'
import type { Either } from '../Either'
import type { Exit } from '../Exit'
import type { Fiber, FiberContext, FiberDescriptor, InterruptStatus, Platform } from '../Fiber'
import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/trace'
import type { FiberRef } from '../FiberRef'
import type * as HKT from '../HKT'
import type { IOAspect } from '../IOAspect'
import type { Option } from '../Option'
import type { Scope } from '../Scope'
import type { Supervisor } from '../Supervisor'

import { accessCallTrace, traceAs, traceFrom } from '@principia/compile/util'

import { Die } from '../Cause/core'
import * as C from '../Cause/core'
import * as E from '../Either'
import { flow } from '../function'
import { IOURI } from '../Modules'
import { isObject } from '../prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const _R = '_R'
export const _E = '_E'
export const _A = '_A'
export const _I = '_I'
export const _U = '_U'

export const IOTag = {
  Succeed: 'Succeed',
  Chain: 'Chain',
  EffectPartial: 'EffectPartial',
  EffectTotal: 'EffectTotal',
  Async: 'Async',
  Match: 'Match',
  Fork: 'Fork',
  Fail: 'Fail',
  Yield: 'Yield',
  Read: 'Read',
  Give: 'Give',
  DeferTotalWith: 'DeferTotalWith',
  Race: 'Race',
  SetInterrupt: 'SetInterrupt',
  GetInterrupt: 'GetInterrupt',
  CheckDescriptor: 'CheckDescriptor',
  Supervise: 'Supervise',
  DeferPartialWith: 'DeferPartialWith',
  DeferMaybeWith: 'DeferMaybeWith',
  NewFiberRef: 'NewFiberRef',
  ModifyFiberRef: 'ModifyFiberRef',
  GetForkScope: 'GetForkScope',
  OverrideForkScope: 'OverrideForkScope',
  FFI: 'FFI',
  GetTrace: 'GetTrace',
  SetTracingStatus: 'SetTracingStatus',
  GetTracingStatus: 'GetTracingStatus',
  GetPlatform: 'GetPlatform'
} as const

abstract class IOSyntax<R, E, A> {
  readonly [_R]: (_: R) => void;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  /**
   * A symbolic alias for `bind`
   *
   * @trace 0
   */
  ['>>=']<R1, E1, B>(this: IO<R, E, A>, f: (a: A) => IO<R1, E1, B>): IO<R & R1, E | E1, B> {
    return new Chain(this, f)
  }
  /**
   * A symbolic alias for `map`
   *
   * @trace 0
   */
  ['<$>']<B>(this: IO<R, E, A>, f: (a: A) => B): IO<R, E, B> {
    return this['>>='](traceAs(f, (a) => new Succeed(f(a))))
  }
  /**
   * A symbolic alias for `as`
   *
   * @trace 0
   */
  ['$>']<B>(this: IO<R, E, A>, b: B): IO<R, E, B> {
    return this['<$>'](() => b)
  }
  /**
   * @trace call
   */
  ['*>']<R1, E1, B>(this: IO<R, E, A>, mb: IO<R1, E1, B>): IO<R & R1, E | E1, B> {
    const trace = accessCallTrace()
    return this['>>='](traceFrom(trace, () => mb))
  }
  /**
   * @trace call
   */
  ['<*']<R1, E1, B>(this: IO<R, E, A>, mb: IO<R1, E1, B>): IO<R & R1, E | E1, A> {
    const trace = accessCallTrace()
    return this['>>='](traceFrom(trace, (a) => mb['$>'](a)))
  }
  /**
   * @trace call
   */
  ['<*>']<R1, E1, B>(this: IO<R, E, A>, mb: IO<R1, E1, B>): IO<R & R1, E | E1, readonly [A, B]> {
    const trace = accessCallTrace()
    return this['>>='](traceFrom(trace, (a) => mb['<$>']((b) => [a, b])))
  }
  ['@@']<R, E extends EC, A extends A1, R1, E1, A1, EC>(
    this: IO<R, E, A>,
    aspect: IOAspect<R1, E1, A1, EC>
  ): IO<R & R1, E | E1, A> {
    return aspect.apply(this)
  }
}

export const IOTypeId = Symbol('@principia/base/IO')
export type IOTypeId = typeof IOTypeId

export abstract class IO<R, E, A> extends IOSyntax<R, E, A> {
  readonly [IOTypeId]: IOTypeId = IOTypeId;
  readonly [_U]: IOURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void

  constructor() {
    super()
    this[_U] = IOURI
  }

  get [_I](): Instruction {
    return this as any
  }
}

export function isIO(u: unknown): u is IO<any, any, any> {
  return isObject(u) && IOTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @internal
 */
export class Chain<R, R1, E, E1, A, A1> extends IO<R & R1, E | E1, A1> {
  readonly _tag = IOTag.Chain
  constructor(readonly io: IO<R, E, A>, readonly f: (a: A) => IO<R1, E1, A1>) {
    super()
  }
}

/**
 * @internal
 */
export class Succeed<A> extends IO<unknown, never, A> {
  readonly _tag = IOTag.Succeed
  constructor(readonly value: A, readonly trace?: string) {
    super()
  }
}

export class GetTrace extends IO<unknown, never, Trace> {
  readonly _tag = IOTag.GetTrace
  constructor() {
    super()
  }
}

export class GetTracingStatus<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.SetTracingStatus

  constructor(readonly effect: IO<R, E, A>, readonly flag: boolean) {
    super()
  }
}

export class SetTracingStatus<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.GetTracingStatus

  constructor(readonly f: (tracingStatus: boolean) => IO<R, E, A>) {
    super()
  }
}

/**
 * @internal
 */
export class EffectPartial<E, A> extends IO<unknown, E, A> {
  readonly _tag = IOTag.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

/**
 * @internal
 */
export class EffectTotal<A> extends IO<unknown, never, A> {
  readonly _tag = IOTag.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

/**
 * @internal
 */
export class EffectAsync<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.Async
  constructor(
    readonly register: (f: (_: IO<R, E, A>) => void) => Option<IO<R, E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {
    super()
  }
}

/**
 * @internal
 */
export class Match<R, E, A, R1, E1, B, R2, E2, C> extends IO<R & R1 & R2, E1 | E2, B | C> {
  readonly _tag = IOTag.Match

  constructor(
    readonly io: IO<R, E, A>,
    readonly onFailure: (cause: Cause<E>) => IO<R1, E1, B>,
    readonly apply: (a: A) => IO<R2, E2, C>
  ) {
    super()
  }
}

export type FailureReporter = (e: Cause<unknown>) => void

/**
 * @internal
 */
export class Fork<R, E, A> extends IO<R, never, FiberContext<E, A>> {
  readonly _tag = IOTag.Fork

  constructor(
    readonly io: IO<R, E, A>,
    readonly scope: Option<Scope<Exit<any, any>>>,
    readonly reportFailure: Option<FailureReporter>,
    readonly trace?: string
  ) {
    super()
  }
}

/**
 * @internal
 */
export class Fail<E> extends IO<unknown, E, never> {
  readonly _tag = IOTag.Fail

  constructor(readonly fill: (_: () => Trace) => Cause<E>) {
    super()
  }
}

/**
 * @internal
 */
export class Yield extends IO<unknown, never, void> {
  readonly _tag = IOTag.Yield

  constructor() {
    super()
  }
}

/**
 * @internal
 */
export class Read<R0, R, E, A> extends IO<R & R0, E, A> {
  readonly _tag = IOTag.Read

  constructor(readonly f: (_: R0) => IO<R, E, A>) {
    super()
  }
}

/**
 * @internal
 */
export class Give<R, E, A> extends IO<unknown, E, A> {
  readonly _tag = IOTag.Give

  constructor(readonly io: IO<R, E, A>, readonly env: R, readonly trace?: string) {
    super()
  }
}

/**
 * @internal
 */
export class DeferTotalWith<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.DeferTotalWith

  constructor(readonly io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>) {
    super()
  }
}

export class DeferMaybeWith<R, E, A, E1, A1> extends IO<R, E | E1, A | A1> {
  readonly _tag = IOTag.DeferMaybeWith
  constructor(readonly io: (platform: Platform<unknown>, id: FiberId) => Either<Exit<E, A>, IO<R, E1, A1>>) {
    super()
  }
}

/**
 * @internal
 */
export class Race<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  readonly _tag = 'Race'

  constructor(
    readonly left: IO<R, E, A>,
    readonly right: IO<R1, E1, A1>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
    readonly scope: Option<Scope<Exit<any, any>>>,
    readonly trace?: string
  ) {
    super()
  }
}

/**
 * @internal
 */
export class SetInterrupt<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.SetInterrupt

  constructor(readonly io: IO<R, E, A>, readonly flag: InterruptStatus, readonly trace?: string) {
    super()
  }
}

/**
 * @internal
 */
export class GetInterrupt<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.GetInterrupt

  constructor(readonly f: (_: InterruptStatus) => IO<R, E, A>) {
    super()
  }
}

/**
 * @internal
 */
export class CheckDescriptor<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.CheckDescriptor

  constructor(readonly f: (_: FiberDescriptor) => IO<R, E, A>) {
    super()
  }
}

/**
 * @internal
 */
export class Supervise<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.Supervise

  constructor(readonly io: IO<R, E, A>, readonly supervisor: Supervisor<any>) {
    super()
  }
}

/**
 * @internal
 */
export class DeferPartialWith<R, E, A, E2> extends IO<R, E | E2, A> {
  readonly _tag = IOTag.DeferPartialWith

  constructor(
    readonly io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>,
    readonly onThrow: (u: unknown) => E2
  ) {
    super()
  }
}

/**
 * @internal
 */
export class NewFiberRef<A> extends IO<unknown, never, FiberRef<A>> {
  readonly _tag = IOTag.NewFiberRef

  constructor(readonly initial: A, readonly onFork: (a: A) => A, readonly onJoin: (a: A, a2: A) => A) {
    super()
  }
}

/**
 * @internal
 */
export class ModifyFiberRef<A, B> extends IO<unknown, never, B> {
  readonly _tag = IOTag.ModifyFiberRef

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super()
  }
}

/**
 * @internal
 */
export class GetForkScope<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.GetForkScope

  constructor(readonly f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
    super()
  }
}

/**
 * @internal
 */
export class OverrideForkScope<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.OverrideForkScope

  constructor(readonly io: IO<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>, readonly trace?: string) {
    super()
  }
}

export class GetPlatform<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.GetPlatform

  constructor(readonly f: (_: Platform<unknown>) => IO<R, E, A>) {
    super()
  }
}

export const ffiNotImplemented = new Fail(() => new Die(new Error('Integration not implemented or unsupported')))

export type Instruction =
  | Chain<any, any, any, any, any, any>
  | Succeed<any>
  | EffectPartial<any, any>
  | EffectTotal<any>
  | EffectAsync<any, any, any>
  | Match<any, any, any, any, any, any, any, any, any>
  | Fork<any, any, any>
  | SetInterrupt<any, any, any>
  | GetInterrupt<any, any, any>
  | Fail<any>
  | CheckDescriptor<any, any, any>
  | Yield
  | Read<any, any, any, any>
  | Give<any, any, any>
  | DeferTotalWith<any, any, any>
  | DeferPartialWith<any, any, any, any>
  | DeferMaybeWith<any, any, any, any, any>
  | NewFiberRef<any>
  | ModifyFiberRef<any, any>
  | Race<any, any, any, any, any, any, any, any, any, any, any, any>
  | Supervise<any, any, any>
  | GetForkScope<any, any, any>
  | OverrideForkScope<any, any, any>
  | FFI<any, any, any>
  | GetTrace
  | GetTracingStatus<any, any, any>
  | SetTracingStatus<any, any, any>
  | GetPlatform<any, any, any>

/**
 * @optimize identity
 */
export function concrete(_: IO<any, any, any>): Instruction {
  // @ts-expect-error
  return _
}

export type V = HKT.V<'E', '+'> & HKT.V<'R', '-'>

export type UIO<A> = IO<unknown, never, A>
export type URIO<R, A> = IO<R, never, A>
export type FIO<E, A> = IO<unknown, E, A>

export type Canceler<R> = URIO<R, void>

export abstract class FFI<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOTag.FFI
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly [_U]!: IOURI;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void

  get [_I](): Instruction {
    return ffiNotImplemented
  }
}
