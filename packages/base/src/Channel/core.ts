import type { IO, URIO } from '../IO'
import type { Cause } from '../IO/Cause'
import type { Exit } from '../IO/Exit'
import type { ChildExecutorDecision } from './internal/ChildExecutorDecision'
import type { AsyncInputProducer } from './internal/producer'
import type { UpstreamPullRequest } from './internal/UpstreamPullRequest'
import type { UpstreamPullStrategy } from './internal/UpstreamPullStrategy'

import * as Ex from '../Exit'
import { tuple } from '../tuple/core'

export const ChannelTag = {
  PipeTo: 'PipeTo',
  ContinuationK: 'ContinuationK',
  ContinuationFinalizer: 'ContinuationFinalizer',
  Fold: 'Fold',
  Bridge: 'Bridge',
  Read: 'Read',
  Done: 'Done',
  Halt: 'Halt',
  FromIO: 'FromIO',
  Emit: 'Emit',
  Defer: 'Defer',
  Ensuring: 'Ensuring',
  ConcatAll: 'ConcatAll',
  BracketOut: 'BracketOut',
  Give: 'Give'
} as const

export abstract class Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _Env!: (_: Env) => void
  readonly _InErr!: (_: InErr) => void
  readonly _InElem!: (_: InElem) => void
  readonly _InDone!: (_: InDone) => void
  readonly _OutErr!: () => OutErr
  readonly _OutElem!: () => OutElem
  readonly _OutDone!: () => OutDone
}

export abstract class Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> {
  readonly _Env!: (_: Env) => void
  readonly _InErr!: (_: InErr) => void
  readonly _InElem!: (_: InElem) => void
  readonly _InDone!: (_: InDone) => void
  readonly _OutErr!: (_: OutErr) => OutErr
  readonly _OutErr2!: () => OutErr2
  readonly _OutElem!: () => OutElem
  readonly _OutDone!: (_: OutDone) => OutDone
  readonly _OutDone2!: () => OutDone2
}

export class ContinuationK<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> extends Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> {
  readonly _tag = ChannelTag.ContinuationK
  constructor(
    readonly onSuccess: (_: OutDone) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly onHalt: (_: Cause<OutErr>) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  ) {
    super()
  }

  onExit(exit: Exit<OutErr, OutDone>): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
    return Ex.match_(exit, this.onHalt, this.onSuccess)
  }
}

export class ContinuationFinalizer<Env, OutErr, OutDone> extends Continuation<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never,
  OutDone,
  never
> {
  readonly _tag = ChannelTag.ContinuationFinalizer
  constructor(readonly finalizer: (_: Exit<OutErr, OutDone>) => URIO<Env, any>) {
    super()
  }
}

/**
 * @optimize remove
 */
export function concreteContinuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>(
  _: Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
): asserts _ is
  | ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  | ContinuationFinalizer<Env, OutErr, OutDone> {
  //
}

export class PipeTo<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutElem2, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem2,
  OutDone2
> {
  readonly _tag = ChannelTag.PipeTo
  constructor(
    readonly left: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly right: () => Channel<Env, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) {
    super()
  }
}

export class Fold<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2
> {
  readonly _tag = ChannelTag.Fold
  constructor(
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly k: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Read<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2
> {
  readonly _tag = ChannelTag.Read
  constructor(
    readonly more: (_: InElem) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly done: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Done<OutDone> extends Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  readonly _tag = ChannelTag.Done
  constructor(readonly terminal: () => OutDone) {
    super()
  }
}

export class Fail<OutErr> extends Channel<unknown, unknown, unknown, unknown, OutErr, never, never> {
  readonly _tag = ChannelTag.Halt
  constructor(readonly cause: () => Cause<OutErr>) {
    super()
  }
}

export class FromIO<Env, OutErr, OutDone> extends Channel<Env, unknown, unknown, unknown, OutErr, never, OutDone> {
  readonly _tag = ChannelTag.FromIO
  constructor(readonly io: IO<Env, OutErr, OutDone>) {
    super()
  }
}

export class Defer<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _tag = ChannelTag.Defer
  constructor(readonly effect: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) {
    super()
  }
}

export class Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _tag = ChannelTag.Ensuring
  constructor(
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly finalizer: (_: Exit<OutErr, OutDone>) => IO<Env, never, any>
  ) {
    super()
  }
}

export class ConcatAll<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone3> {
  readonly _tag = ChannelTag.ConcatAll
  constructor(
    readonly combineInners: (_: OutDone, __: OutDone) => OutDone,
    readonly combineAll: (_: OutDone, __: OutDone2) => OutDone3,
    readonly onPull: (_: UpstreamPullRequest<OutElem>) => UpstreamPullStrategy<OutElem2>,
    readonly onEmit: (_: OutElem2) => ChildExecutorDecision,
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
    readonly k: (_: OutElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
  ) {
    super()
  }
}

export class BracketOut<R, E, Z, OutDone> extends Channel<R, unknown, unknown, unknown, E, Z, OutDone> {
  readonly _tag = ChannelTag.BracketOut
  constructor(readonly acquire: IO<R, E, Z>, readonly finalizer: (_: Z, exit: Exit<any, any>) => URIO<R, any>) {
    super()
  }
}

export class Give<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  unknown,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _tag = ChannelTag.Give
  constructor(
    readonly environment: Env,
    readonly inner: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export class Emit<OutElem, OutDone> extends Channel<unknown, unknown, unknown, unknown, never, OutElem, OutDone> {
  readonly _tag = ChannelTag.Emit
  constructor(readonly out: () => OutElem) {
    super()
  }
}

export class Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _tag = ChannelTag.Bridge
  constructor(
    readonly input: AsyncInputProducer<InErr, InElem, InDone>,
    readonly channel: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export function concrete<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  _: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): asserts _ is
  | PipeTo<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Read<Env, InErr, InElem, InDone, OutErr, any, OutElem, OutDone, any>
  | Done<OutDone>
  | Fail<OutErr>
  | FromIO<Env, OutErr, OutDone>
  | Emit<OutElem, OutDone>
  | ConcatAll<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Fold<Env, InErr, InElem, InDone, OutErr, any, OutElem, OutDone, any>
  | Give<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | BracketOut<Env, OutErr, OutElem, OutDone>
  | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Defer<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  //
}

/**
 * Halt a channel with the specified cause
 */
export function failCauseLazy<E>(result: () => Cause<E>): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(result)
}

/**
 * Halt a channel with the specified cause
 */
export function failCause<E>(result: Cause<E>): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => result)
}

/**
 * End a channel with the specified result
 */
export function endLazy<OutDone>(
  result: () => OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(result)
}

/**
 * End a channel with the specified result
 */
export function end<OutDone>(result: OutDone): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(() => result)
}

export function succeed<Z>(z: Z): Channel<unknown, unknown, unknown, unknown, never, never, Z> {
  return end(z)
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 */
export function map_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (out: OutDone) => OutDone2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return chain_(self, (z) => succeed(f(z)))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 *
 * @dataFirst map_
 */
export function map<OutDone, OutDone2>(f: (out: OutDone) => OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => map_(self, f)
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 */
export function chain_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return new Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone,
    OutDone2
  >(channel, new ContinuationK(f, failCause))
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 *
 * @dataFirst chain_
 */
export function chain<OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
  f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): <Env, InErr, InElem, InDone, OutErr, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return (self) => chain_(self, f)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 */
export function cross_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  readonly [OutDone, OutDone1]
> {
  return chain_(self, (z) => map_(that, (z2) => tuple(z, z2)))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 *
 * @dataFirst cross_
 */
export function cross<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => cross_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 */
export function crossFirst_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return chain_(self, (a) => map_(that, () => a))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 *
 * @dataFirst crossFirst_
 */
export function crossFirst<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => crossFirst_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 */
export function crossSecond_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1 | OutErr,
  OutElem1 | OutElem,
  OutDone1
> {
  return chain_(self, () => that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 *
 * @dataFirst crossSecond_
 */
export function crossSecond<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1 | OutErr,
  OutElem1 | OutElem,
  OutDone1
> {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => crossSecond_(self, that)
}
