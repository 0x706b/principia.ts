import type { Cause } from '../../Cause'
import type { Chunk } from '../../Chunk'
import type { Exit } from '../../Exit'
import type { IO, URIO } from '../../IO'
import type { Predicate } from '../../Predicate'
import type { Channel } from './core'
import type { ChannelState } from './internal/ChannelState'
import type { AsyncInputConsumer, AsyncInputProducer } from './internal/producer'

import * as AR from '../../Array'
import * as Ca from '../../Cause'
import * as A from '../../Chunk'
import * as E from '../../Either'
import * as Ev from '../../Eval'
import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as F from '../../Fiber'
import { flow, identity, pipe } from '../../function'
import * as H from '../../Hub'
import * as I from '../../IO'
import * as M from '../../Managed'
import * as RM from '../../Managed/ReleaseMap'
import * as O from '../../Option'
import * as PR from '../../Promise'
import * as Q from '../../Queue'
import * as Ref from '../../Ref'
import * as Sem from '../../Semaphore'
import { tuple } from '../../tuple'
import {
  BracketOut,
  Bridge,
  chain,
  chain_,
  ConcatAll,
  ContinuationK,
  Effect,
  EffectSuspendTotal,
  EffectTotal,
  Emit,
  end,
  Ensuring,
  Fold,
  Give,
  Halt,
  halt,
  map_,
  PipeTo,
  Read,
  succeed,
  zipr,
  zipr_
} from './core'
import { ChannelExecutor } from './internal/ChannelExecutor'
import * as State from './internal/ChannelState'
import * as MD from './internal/MergeDecision'
import * as MS from './internal/MergeState'
import { makeSingleProducerAsyncInput } from './internal/SingleProducerAsyncInput'

export function succeedLazy<OutDone>(
  effect: () => OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new EffectTotal(effect)
}

export function deferTotal<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  effect: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new EffectSuspendTotal(effect)
}

/**
 * Pipe the output of a channel into the input of another
 */
export function pipeTo_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, OutErr1, OutElem1, OutDone1>(
  left: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  right: Channel<Env1, OutErr, OutElem, OutDone, OutErr1, OutElem1, OutDone1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1> {
  return new PipeTo<Env & Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutElem1, OutDone, OutDone1>(
    () => left,
    () => right
  )
}

/**
 * Pipe the output of a channel into the input of another
 *
 * @dataFirst pipeTo_
 */
export function pipeTo<OutErr, OutElem, OutDone, Env1, OutErr1, OutElem1, OutDone1>(
  right: Channel<Env1, OutErr, OutElem, OutDone, OutErr1, OutElem1, OutDone1>
): <Env, InErr, InElem, InDone>(
  left: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env & Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1> {
  return (left) => pipeTo_(left, right)
}

/**
 * Reads an input and continue exposing both full error cause and completion
 */
export function readWithCause<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  halt: (e: Cause<InErr>) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return new Read<
    Env & Env1 & Env2,
    InErr,
    InElem,
    InDone,
    InErr,
    OutErr | OutErr1 | OutErr2,
    OutElem | OutElem1 | OutElem2,
    InDone,
    OutDone | OutDone1 | OutDone2
  >(
    inp,
    new ContinuationK<
      Env & Env1 & Env2,
      InErr,
      InElem,
      InDone,
      InErr,
      OutErr | OutErr1 | OutErr2,
      OutElem | OutElem1 | OutElem2,
      InDone,
      OutDone | OutDone1 | OutDone2
    >(done, halt)
  )
}

/**
 * Reads an input and continue exposing both error and completion
 */
export function readWith<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: (e: InErr) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return readWithCause(inp, (c) => E.match_(Ca.failureOrCause(c), error, halt), done)
}

/**
 * Halt a channel with the specified error
 */
export function failLazy<E>(error: () => E): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Ca.fail(error()))
}

/**
 * Halt a channel with the specified error
 */
export function fail<E>(error: E): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Ca.fail(error))
}

/**
 * Halt a channel with the specified exception
 */
export function die(defect: unknown): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Ca.die(defect))
}

/**
 * Halt a channel with the specified exception
 */
export function dieLazy(defect: () => unknown): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Ca.die(defect()))
}

/**
 * Writes an output to the channel
 */
export function writeLazy<OutElem>(
  out: () => OutElem
): Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}

/**
 * Writes an output to the channel
 */
export function write<OutElem>(out: OutElem): Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(() => out)
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 */
export function ensuringWith_<Env, Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit<OutErr, OutDone>) => IO<Env2, never, unknown>
): Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Ensuring<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(channel, finalizer)
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 *
 * @dataFirst ensuringWith_
 */
export function ensuringWith<Env2, OutErr, OutDone>(
  finalizer: (e: Exit<OutErr, OutDone>) => IO<Env2, never, unknown>
): <Env, InErr, InElem, InDone, OutElem>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (channel) => ensuringWith_(channel, finalizer)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 */
export function concatMapWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, OutDone3> {
  return new ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3
  >(g, h, self, f)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 *
 * @dataFirst concatMapWith_
 */
export function concatMapWith<OutDone, OutElem, Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2, OutDone3>(
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): <Env, InErr, InElem, InDone, OutErr>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, OutDone3> {
  return (self) => concatMapWith_(self, f, g, h)
}

/**
 * Concat sequentially a channel of channels
 */
export function concatAllWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >,
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem, OutDone3> {
  return new ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutElem,
    OutDone,
    OutDone2,
    OutDone3
  >(f, g, channels, identity)
}

/**
 * Concat sequentially a channel of channels
 *
 * @dataFirst concatAllWith_
 */
export function concatAllWith<OutDone, OutDone2, OutDone3>(
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): <Env, InErr, InElem, InDone, OutErr, OutElem, Env2, InErr2, InElem2, InDone2, OutErr2>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem, OutDone3> {
  return (channels) => concatAllWith_(channels, f, g)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 */
export function concatMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, unknown> {
  return concatMapWith_(
    self,
    f,
    () => void 0,
    () => void 0
  )
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 *
 * @dataFirst concatMap_
 */
export function concatMap<OutElem, OutElem2, OutDone, Env2, InErr2, InElem2, InDone2, OutErr2>(
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): <Env, InErr, InElem, InDone, OutErr, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, unknown> {
  return (self) => concatMap_(self, f)
}

/**
 * Fold the channel exposing success and full error cause
 */
export function matchCauseIO_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onError: (c: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSuccess: (o: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return new Fold<
    Env & Env1 & Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr,
    OutErr2 | OutErr3,
    OutElem | OutElem1 | OutElem2,
    OutDone,
    OutDone2 | OutDone3
  >(
    channel,
    new ContinuationK<
      Env & Env1 & Env2,
      InErr & InErr1 & InErr2,
      InElem & InElem1 & InElem2,
      InDone & InDone1 & InDone2,
      OutErr,
      OutErr2 | OutErr3,
      OutElem | OutElem1 | OutElem2,
      OutDone,
      OutDone2 | OutDone3
    >(onSuccess, onError)
  )
}

/**
 * Fold the channel exposing success and full error cause
 *
 * @dataFirst matchCauseIO_
 */
export function matchCauseIO<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  onErr: (c: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (o: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): <Env, InErr, InElem, InDone, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return (self) => matchCauseIO_(self, onErr, onSucc)
}

/**
 * Embed inputs from continuos pulling of a producer
 */
export function embedInput_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
  input: AsyncInputProducer<InErr, InElem, InDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Bridge(input, self)
}

/**
 * Embed inputs from continuos pulling of a producer
 *
 * @dataFirst embedInput_
 */
export function embedInput<InErr, InElem, InDone>(
  input: AsyncInputProducer<InErr, InElem, InDone>
): <Env, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => embedInput_(self, input)
}

/**
 * Construct a resource Channel with Acquire / Release
 */
export function bracketOutExit_<R, R2, E, Z>(
  self: IO<R, E, Z>,
  release: (z: Z, e: Exit<unknown, unknown>) => URIO<R2, unknown>
): Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return new BracketOut<R & R2, E, Z, void>(self, release)
}

/**
 * Construct a resource Channel with Acquire / Release
 *
 * @dataFirst bracketOutExit_
 */
export function bracketOutExit<R2, Z>(
  release: (z: Z, e: Exit<unknown, unknown>) => URIO<R2, unknown>
): <R, E>(self: IO<R, E, Z>) => Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return (self) => bracketOutExit_(self, release)
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 */
export function giveAll_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: Env
): Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Give(env, self)
}

export function ask<Env>(): Channel<Env, unknown, unknown, unknown, never, never, Env> {
  return fromIO(I.ask<Env>())
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 *
 * @dataFirst giveAll_
 */
export function giveAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  env: Env
): (
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => giveAll_(self, env)
}

export function gives_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (env0: Env0) => Env
): Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return ask<Env0>()['>>=']((env0) => giveAll_(self, f(env0)))
}

export function gives<Env0, Env>(
  f: (env0: Env0) => Env
): <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => gives_(self, f)
}

/**
 * Returns a new channel which reads all the elements from upstream's output channel
 * and ignores them, then terminates with the upstream result value.
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> = readWithCause(
    (_) => drainer,
    halt,
    end
  )
  return channel['>>>'](drainer)
}

/**
 * Use an effect to end a channel
 */
export function fromIO<R, E, A>(io: IO<R, E, A>): Channel<R, unknown, unknown, unknown, E, never, A> {
  return new Effect(io)
}

/**
 * Use a managed to emit an output element
 */
export function managedOut<R, E, A>(managed: M.Managed<R, E, A>): Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return concatMap_(
    bracketOutExit_(RM.make, (rm, ex) => M.releaseAll_(rm, ex, sequential)),
    (rm) =>
      pipe(
        managed.io,
        I.gives((r: R) => tuple(r, rm)),
        I.map(([, a]) => a),
        fromIO,
        chain(write)
      )
  )
}

/**
 * Returns a new channel, which flattens the terminal value of this channel. This function may
 * only be called if the terminal value of this channel is another channel of compatible types.
 */
export function flatten<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  >
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return chain_(self, identity)
}

/**
 * Makes a channel from an effect that returns a channel in case of success
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: IO<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return flatten(fromIO(self))
}

/**
 * Makes a channel from a managed that returns a channel in case of success
 */
export function unwrapManaged<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: M.Managed<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return concatAllWith_(managedOut(self), identity, identity)
}

/**
 * Unit channel
 */
export function unit(): Channel<unknown, unknown, unknown, unknown, never, never, void> {
  return end(void 0)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 */
export function as_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  z2: OutDone2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return map_(self, (_) => z2)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<OutDone2>(z2: OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => as_(self, z2)
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAll_<
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
  f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return catchAllCause_(self, (cause) =>
    E.match_(
      Ca.failureOrCause(cause),
      (l) => f(l),
      (r) => halt(r)
    )
  )
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @dataFirst catchAll_
 */
export function catchAll<Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
  f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAll_(self, f)
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAllCause_<
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
  f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return new Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1,
    OutDone | OutDone1
  >(self, new ContinuationK((_) => end(_), f))
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @dataFirst catchAllCause_
 */
export function catchAllCause<Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
  f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAllCause_(self, f)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 */
export function collect_<Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => O.Option<OutElem2>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const collector: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = readWith(
    (o) =>
      O.match_(
        f(o),
        () => collector,
        (out2) => zipr_(write(out2), collector)
      ),
    (e) => fail(e),
    (z) => end(z)
  )

  return pipeTo_(self, collector)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 *
 * @dataFirst collect_
 */
export function collect<OutElem, OutElem2>(f: (o: OutElem) => O.Option<OutElem2>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => collect_(self, f)
}

/**
 * Returns a new channel, which is the concatenation of all the channels that are written out by
 * this channel. This method may only be called on channels that output other channels.
 */
export function concatOut<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return concatAll(mapOut_(self, (out) => out))
}

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): Channel<unknown, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(_in), contramapReader(f)),
    (err) => fail(err),
    (done) => end(f(done))
  )
}

export function contramap_<Env, InErr, InElem, InDone0, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapReader(f), self)
}

/**
 * @dataFirst contramap_
 */
export function contramap<InDone, InDone0>(f: (a: InDone0) => InDone) {
  return <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramap_(self, f)
}

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): Channel<unknown, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(f(_in)), contramapInReader(f)),
    (err) => fail(err),
    (done) => end(done)
  )
}

export function contramapIn_<Env, InErr, InElem0, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapInReader(f), self)
}

/**
 * @dataFirst contramapIn_
 */
export function contramapIn<InElem0, InElem>(f: (a: InElem0) => InElem) {
  return <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapIn_(self, f)
}

function contramapIOReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => IO<Env1, InErr, InDone>
): Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(_in), contramapIOReader(f)),
    (err) => fail(err),
    (done0) => fromIO(f(done0))
  )
}

export function contramapIO_<Env, Env1, InErr, InElem, InDone0, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => IO<Env1, InErr, InDone>
): Channel<Env1 & Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapIOReader(f), self)
}

/**
 * @dataFirst contramapIO_
 */
export function contramapIO<Env1, InErr, InDone0, InDone>(f: (i: InDone0) => IO<Env1, InErr, InDone>) {
  return <Env, InElem, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    contramapIO_(self, f)
}

function contramapInIOReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => IO<Env1, InErr, InElem>
): Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return readWith((_in) => fromIO(f(_in))['>>='](write)['*>'](contramapInIOReader(f)), fail, end)
}

export function contramapInIO_<Env, Env1, InErr, InElem0, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => IO<Env1, InErr, InElem>
): Channel<Env1 & Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapInIOReader(f), self)
}

/**
 * @dataFirst contramapInIO_
 */
export function contramapInIO<Env1, InErr, InElem0, InElem>(f: (a: InElem0) => IO<Env1, InErr, InElem>) {
  return <Env, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    contramapInIO_(self, f)
}

function doneCollectReader<Env, OutErr, OutElem, OutDone>(
  builder: A.ChunkBuilder<OutElem>
): Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> {
  return readWith(
    (out) =>
      fromIO(
        I.succeedLazy(() => {
          builder.append(out)
        })
      )['*>'](doneCollectReader(builder)),
    fail,
    end
  )
}

/**
 * Returns a new channel, which is the same as this one, except that all the outputs are
 * collected and bundled into a tuple together with the terminal value of this channel.
 *
 * As the channel returned from this channel collect's all of this channel's output into an in-
 * memory chunk, it is not safe to call this method on channels that output a large or unbounded
 * number of values.
 */
export function doneCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, never, readonly [A.Chunk<OutElem>, OutDone]> {
  return unwrap(
    I.succeedLazy(() => {
      const builder = A.builder<OutElem>()

      return mapIO_(pipeTo_(self, doneCollectReader(builder)), (z) => I.succeed(tuple(builder.result(), z)))
    })
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 */
export function interruptWhen_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  io: IO<Env1, OutErr1, OutDone1>
): Channel<Env1 & Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> {
  return mergeWith_(
    self,
    fromIO(io),
    (selfDone) => MD.done(I.done(selfDone)),
    (ioDone) => MD.done(I.done(ioDone))
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 *
 * @dataFirst interruptWhen_
 */
export function interruptWhen<Env1, OutErr1, OutDone1>(io: IO<Env1, OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhen_(self, io)
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 */
export function interruptWhenP_<Env, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  promise: PR.Promise<OutErr1, OutDone1>
): Channel<Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> {
  return interruptWhen_(self, PR.await(promise))
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 *
 * @dataFirst interruptWhenP_
 */
export function interruptWhenP<OutErr1, OutDone1>(promise: PR.Promise<OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhenP_(self, promise)
}

/**
 * Returns a new channel that collects the output and terminal value of this channel, which it
 * then writes as output of the returned channel.
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, readonly [A.Chunk<OutElem>, OutDone], void> {
  return chain_(doneCollect(self), (t) => write(t))
}

export function ensuring_<Env, Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone, Z>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: URIO<Env1, Z>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return ensuringWith_(self, (_) => finalizer)
}

/**
 * @dataFirst ensuring_
 */
export function ensuring<Env1, Z>(finalizer: URIO<Env1, Z>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => ensuring_(self, finalizer)
}

export function matchIO_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onError: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSuccess: (value: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr1,
  OutElem | OutElem2 | OutElem1,
  OutDone2 | OutDone1
> {
  return matchCauseIO_(self, flow(Ca.failureOrCause, E.match(onError, halt)), onSuccess)
}

/**
 * @dataFirst matchIO_
 */
export function matchIO<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  onFailure: (oErr: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSuccess: (oErr: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
): <Env, InErr, InElem, InDone, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr1 | OutErr2,
  OutElem1 | OutElem2 | OutElem,
  OutDone1 | OutDone2
> {
  return (self) => matchIO_(self, onFailure, onSuccess)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 */
export function orElse_<
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
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return catchAll_(self, (_) => that)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 *
 * @dataFirst orElse_
 */
export function orElse<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orElse_(self, that)
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 */
export function mapError_<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (err: OutErr) => OutErr2
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return mapErrorCause_(self, Ca.map(f))
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 *
 * @dataFirst mapError_
 */
export function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapError_(self, f)
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 */
export function mapErrorCause_<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (cause: Cause<OutErr>) => Cause<OutErr2>
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return catchAllCause_(self, flow(f, halt))
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 *
 * @dataFirst mapErrorCause_
 */
export function mapErrorCause<OutErr, OutErr2>(f: (cause: Cause<OutErr>) => Cause<OutErr2>) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapErrorCause_(self, f)
}

function runManagedInterpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): IO<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    State.concrete(channelState)
    switch (channelState._tag) {
      case State.ChannelStateTag.Effect: {
        return I.chain_(channelState.effect, () => runManagedInterpret(exec.run(), exec))
      }
      case State.ChannelStateTag.Emit: {
        // eslint-disable-next-line no-param-reassign
        channelState = exec.run()
        break
      }
      case State.ChannelStateTag.Done: {
        return I.done(exec.getDone())
      }
    }
  }
  throw new Error('Bug')
}

function toPullInterpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): IO<Env, E.Either<OutErr, OutDone>, OutElem> {
  State.concrete(channelState)
  switch (channelState._tag) {
    case State.ChannelStateTag.Effect: {
      return I.chain_(I.mapError_(channelState.effect, E.left), () => toPullInterpret(exec.run(), exec))
    }
    case State.ChannelStateTag.Emit: {
      return I.succeed(exec.getEmit())
    }
    case State.ChannelStateTag.Done: {
      const done = exec.getDone()
      return Ex.matchIO_(done, flow(Ca.map(E.left), I.halt), flow(E.right, I.fail))
    }
  }
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 */
export function mapIO_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutDone) => IO<Env1, OutErr1, OutDone1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone1> {
  return chain_(self, flow(f, fromIO))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 *
 * @dataFirst mapIO_
 */
export function mapIO<Env1, OutErr1, OutDone, OutDone1>(f: (o: OutDone) => IO<Env1, OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapIO_(self, f)
}

export type MergeStrategy = 'BackPressure' | 'BufferSliding'

export function mergeAllWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  n: number,
  f: (x: OutDone, y: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone> {
  return managed_(
    M.withChildren((getChildren) =>
      M.gen(function* (_) {
        yield* _(M.finalizer(I.chain_(getChildren, F.interruptAll)))
        const queue       = yield* _(
          M.bracket_(Q.makeBounded<I.IO<Env, E.Either<OutErr | OutErr1, OutDone>, OutElem>>(bufferSize), Q.shutdown)
        )
        const cancelers   = yield* _(M.bracket_(Q.makeBounded<PR.Promise<never, void>>(n), Q.shutdown))
        const lastDone    = yield* _(Ref.make<O.Option<OutDone>>(O.none()))
        const errorSignal = yield* _(PR.make<never, void>())
        const permits     = yield* _(Sem.make(n))
        const pull        = yield* _(toPull(channels))

        const evaluatePull = (pull: I.IO<Env & Env1, E.Either<OutErr | OutErr1, OutDone>, OutElem>) =>
          pipe(
            pull,
            I.chain((elem) => pipe(I.succeed(elem), (_) => Q.offer_(queue, _))),
            I.forever,
            I.catchAllCause(
              flow(
                Ca.flipCauseEither,
                E.match(
                  (cause) =>
                    I.crossSecond_(
                      Q.offer_(queue, I.halt(Ca.map_(cause, E.left))),
                      I.asUnit(PR.succeed_(errorSignal, undefined))
                    ),
                  (outDone) =>
                    Ref.update_(
                      lastDone,
                      O.match(
                        () => O.some(outDone),
                        (lastDone) => O.some(f(lastDone, outDone))
                      )
                    )
                )
              )
            )
          )

        yield* _(
          pipe(
            pull,
            I.matchCauseIO(
              flow(
                Ca.flipCauseEither,
                E.match(
                  (cause) =>
                    pipe(
                      getChildren,
                      I.chain(F.interruptAll),
                      I.crossSecond(pipe(queue, Q.offer(I.halt(Ca.map_(cause, E.left))), I.as(false)))
                    ),
                  (outDone) =>
                    I.raceWith_(
                      PR.await(errorSignal),
                      Sem.withPermits(permits, n)(I.unit()),
                      (_, permitAcquisition) =>
                        pipe(
                          getChildren,
                          I.chain(F.interruptAll),
                          I.crossSecond(pipe(F.interrupt(permitAcquisition), I.as(false)))
                        ),
                      (_, failureAwait) =>
                        pipe(
                          F.interrupt(failureAwait),
                          I.crossSecond(
                            pipe(
                              Ref.get(lastDone),
                              I.chain(
                                O.match(
                                  () => Q.offer_(queue, I.fail(E.right(outDone))),
                                  (lastDone) => Q.offer_(queue, I.fail(E.right(f(lastDone, outDone))))
                                )
                              ),
                              I.as(false)
                            )
                          )
                        )
                    )
                )
              ),
              (channel) => {
                switch (mergeStrategy) {
                  case 'BackPressure':
                    return I.gen(function* (_) {
                      const latch   = yield* _(PR.make<never, void>())
                      const raceIOs = pipe(toPull(channel), M.use(flow(evaluatePull, I.race(PR.await(errorSignal)))))
                      yield* _(I.fork(Sem.withPermit(permits)(I.crossSecond_(PR.succeed_(latch, undefined), raceIOs))))
                      yield* _(PR.await(latch))
                      return !(yield* _(PR.isDone(errorSignal)))
                    })
                  case 'BufferSliding':
                    return I.gen(function* (_) {
                      const canceler = yield* _(PR.make<never, void>())
                      const latch    = yield* _(PR.make<never, void>())
                      const size     = yield* _(Q.size(cancelers))
                      yield* _(I.when(() => size >= n)(I.chain_(Q.take(cancelers), PR.succeed<void>(undefined))))
                      yield* _(Q.offer_(cancelers, canceler))
                      const raceIOs = pipe(
                        toPull(channel),
                        M.use(flow(evaluatePull, I.race(PR.await(errorSignal)), I.race(PR.await(canceler))))
                      )
                      yield* _(I.fork(Sem.withPermit(permits)(I.crossSecond_(PR.succeed_(latch, undefined), raceIOs))))
                      yield* _(PR.await(latch))
                      return !(yield* _(PR.isDone(errorSignal)))
                    })
                }
              }
            ),
            I.repeatWhile((b) => b === true),
            I.forkManaged
          )
        )
        return queue
      })
    ),
    (queue) => {
      const consumer: Channel<Env & Env1, unknown, unknown, unknown, OutErr | OutErr1, OutElem, OutDone> = unwrap(
        pipe(
          Q.take(queue),
          I.flatten,
          I.matchCause(flow(Ca.flipCauseEither, E.match(halt, end)), (outElem) => write(outElem)['*>'](consumer))
        )
      )
      return consumer
    }
  )
}

export function mergeAllWith<OutDone>(
  n: number,
  f: (x: OutDone, y: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): <Env, InErr, InElem, InDone, OutErr, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >
) => Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone> {
  return (channels) => mergeAllWith_(channels, n, f, bufferSize, mergeStrategy)
}

export function mergeAllUnboundedWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem,
  OutDone
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  f: (x: OutDone, y: OutDone) => OutDone
): Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone> {
  return mergeAllWith_(channels, Number.MAX_SAFE_INTEGER, f)
}

export function mergeAllUnboundedWith<OutDone>(
  f: (x: OutDone, y: OutDone) => OutDone
): <Env, InErr, InElem, InDone, OutErr, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >
) => Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone> {
  return (channels) => mergeAllUnboundedWith_(channels, f)
}

export function mergeAll_<Env, InErr, InElem, InDone, OutErr, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, any>,
    any
  >,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, unknown> {
  return mergeAllWith_(channels, n, () => undefined, bufferSize, mergeStrategy)
}

export function mergeAll(
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): <Env, InErr, InElem, InDone, OutErr, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, any>,
    any
  >
) => Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, unknown> {
  return (channels) => mergeAll_(channels, n, bufferSize, mergeStrategy)
}

export function mergeAllUnbounded<Env, InErr, InElem, InDone, OutErr, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, any>,
    any
  >
): Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, unknown> {
  return mergeAll_(channels, Number.MAX_SAFE_INTEGER)
}

export function mergeMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
  f: (elem: OutElem) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem1, unknown> {
  return pipe(self, mapOut(f), mergeAll(n, bufferSize, mergeStrategy))
}

export function mergeMap<OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1>(
  f: (elem: OutElem) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = 'BackPressure'
): <Env, InErr, InElem, InDone, OutErr>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>
) => Channel<Env & Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem1, unknown> {
  return (self) => mergeMap_(self, f, n, bufferSize, mergeStrategy)
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 */
export function mergeWith_<
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
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (ex: Ex.Exit<OutErr, OutDone>) => MD.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (ex: Ex.Exit<OutErr1, OutDone1>) => MD.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
): Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem | OutElem1,
  OutDone2 | OutDone3
> {
  return unwrapManaged(
    M.gen(function* (_) {
      const input       = yield* _(makeSingleProducerAsyncInput<InErr & InErr1, InElem & InElem1, InDone & InDone1>())
      const queueReader = fromInput(input)
      const pullL       = yield* _(toPull(queueReader['>>>'](self)))
      const pullR       = yield* _(toPull(queueReader['>>>'](that)))
      type MergeState = MS.MergeState<
        Env & Env1,
        OutErr,
        OutErr1,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone,
        OutDone1,
        OutDone2 | OutDone3
      >
      const handleSide =
        <Err, Done, Err2, Done2>(
          exit: Ex.Exit<E.Either<Err, Done>, OutElem | OutElem1>,
          fiber: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>,
          pull: IO<Env & Env1, E.Either<Err, Done>, OutElem | OutElem1>
        ) =>
        (
          done: (
            ex: Ex.Exit<Err, Done>
          ) => MD.MergeDecision<Env & Env1, Err2, Done2, OutErr2 | OutErr3, OutDone2 | OutDone3>,
          both: (
            f1: F.Fiber<E.Either<Err, Done>, OutElem | OutElem1>,
            f2: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>
          ) => MergeState,
          single: (
            f: (ex: Ex.Exit<Err2, Done2>) => IO<Env & Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
          ) => MergeState
        ): IO<
          Env & Env1,
          never,
          Channel<Env & Env1, unknown, unknown, unknown, OutErr2 | OutErr3, OutElem | OutElem1, OutDone2 | OutDone3>
        > =>
          Ex.match_(
            exit,
            (cause) => {
              const result = pipe(Ca.flipCauseEither(cause), E.match(Ex.halt, Ex.succeed), done)

              MD.concrete(result)

              switch (result._tag) {
                case MD.MergeDecisionTag.Done: {
                  return pipe(F.interrupt(fiber)['*>'](result.io), fromIO, I.succeed)
                }
                case MD.MergeDecisionTag.Await: {
                  return pipe(
                    fiber.await,
                    I.map(
                      Ex.match(
                        flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), result.f, fromIO),
                        flow(write, zipr(go(single(result.f))))
                      )
                    )
                  )
                }
              }
            },
            (elem) => I.fork(pull)['<$>']((leftFiber) => write(elem)['*>'](go(both(leftFiber, fiber))))
          )

      const go = (
        state: MergeState
      ): Channel<Env & Env1, unknown, unknown, unknown, OutErr2 | OutErr3, OutElem | OutElem1, OutDone2 | OutDone3> => {
        switch (state._tag) {
          case MS.MergeStateTag.BothRunning: {
            const lj: IO<Env1, E.Either<OutErr, OutDone>, OutElem | OutElem1>   = F.join(state.left)
            const rj: IO<Env1, E.Either<OutErr1, OutDone1>, OutElem | OutElem1> = F.join(state.right)

            return unwrap(
              I.raceWith_(
                lj,
                rj,
                (leftEx, _) =>
                  handleSide(leftEx, state.right, pullL)(
                    leftDone,
                    (l, r) => new MS.BothRunning(l, r),
                    (_) => new MS.LeftDone(_)
                  ),
                (rightEx, _) =>
                  handleSide(rightEx, state.left, pullR)(
                    rightDone,
                    (l, r) => new MS.BothRunning(r, l),
                    (_) => new MS.RightDone(_)
                  )
              )
            )
          }
          case MS.MergeStateTag.LeftDone: {
            return pipe(
              I.result(pullR),
              I.map(
                Ex.match(
                  flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), state.f, fromIO),
                  flow(write, zipr(go(new MS.LeftDone(state.f))))
                )
              ),
              unwrap
            )
          }
          case MS.MergeStateTag.RightDone: {
            return pipe(
              I.result(pullL),
              I.map(
                Ex.match(
                  flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), state.f, fromIO),
                  flow(write, zipr(go(new MS.RightDone(state.f))))
                )
              ),
              unwrap
            )
          }
        }
      }
      return pipe(
        I.fork(pullL),
        I.crossWith(
          I.fork(pullR),
          (a, b): MergeState =>
            new MS.BothRunning<unknown, OutErr, OutErr1, unknown, OutElem | OutElem1, OutDone, OutDone1, unknown>(a, b)
        ),
        fromIO,
        chain(go),
        embedInput(input)
      )
    })
  )
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 *
 * @dataFirst mergeWith_
 */
export function mergeWith<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (ex: Ex.Exit<OutErr, OutDone>) => MD.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (ex: Ex.Exit<OutErr1, OutDone1>) => MD.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
): <Env, InErr, InElem, InDone, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem1 | OutElem,
  OutDone2 | OutDone3
> {
  return (self) => mergeWith_(self, that, leftDone, rightDone)
}

/**
 * Maps the output of this channel using f
 */
export function mapOut_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutElem2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const reader: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = readWithCause(
    flow(
      f,
      write,
      chain(() => reader)
    ),
    halt,
    end
  )

  return self['>>>'](reader)
}

/**
 * Maps the output of this channel using f
 *
 * @dataFirst mapOut_
 */
export function mapOut<OutElem, OutElem2>(
  f: (o: OutElem) => OutElem2
): <Env, InErr, InElem, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  return (self) => mapOut_(self, f)
}

const mapOutIOReader = <Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, OutErr, OutElem, OutDone, OutErr | OutErr1, OutElem1, OutDone> =>
  readWith((out) => fromIO(f(out))['>>='](write)['*>'](mapOutIOReader(f)), fail, end)

export function mapOutIO_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return pipeTo_(self, mapOutIOReader(f))
}

/**
 * @dataFirst mapOutIO_
 */
export function mapOutIO<Env1, OutErr1, OutElem, OutElem1>(f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapOutIO_(self, f)
}

export function mapOutIOPar_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, OutErr1, OutElem1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (_: OutElem) => I.IO<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return managed_(
    M.withChildren((getChildren) =>
      M.gen(function* (_) {
        yield* _(M.finalizer(pipe(getChildren, I.chain(F.interruptAll))))
        const queue       = yield* _(
          M.bracket_(Q.makeBounded<I.IO<Env1, E.Either<OutErr | OutErr1, OutDone>, OutElem1>>(n), Q.shutdown)
        )
        const errorSignal = yield* _(PR.make<OutErr1, never>())
        const permits     = yield* _(Sem.make(n))
        const pull        = yield* _(toPull(self))
        yield* _(
          pipe(
            pull,
            I.matchCauseIO(
              flow(
                Ca.flipCauseEither,
                E.match(
                  flow(Ca.map(E.left), I.halt, (_) => Q.offer_(queue, _)),
                  (outDone) =>
                    pipe(
                      Sem.withPermits(permits, n)(I.unit()),
                      I.interruptible,
                      I.crossSecond(pipe(E.right(outDone), I.fail, (_) => Q.offer_(queue, _)))
                    )
                )
              ),
              (outElem) =>
                I.gen(function* (_) {
                  const p     = yield* _(PR.make<OutErr1, OutElem1>())
                  const latch = yield* _(PR.make<never, void>())
                  yield* _(Q.offer_(queue, pipe(PR.await(p), I.mapError(E.left))))
                  yield* _(
                    I.fork(
                      Sem.withPermit(permits)(
                        I.crossSecond_(
                          PR.succeed_(latch, undefined),
                          pipe(
                            PR.await(errorSignal),
                            I.raceFirst(f(outElem)),
                            I.tapCause((cause) => PR.halt_(p, cause)),
                            I.fulfill(p)
                          )
                        )
                      )
                    )
                  )

                  yield* _(PR.await(latch))
                })
            ),
            I.forever,
            I.interruptible,
            I.forkManaged
          )
        )
        return queue
      })
    ),
    (queue) => {
      const consumer: Channel<Env & Env1, unknown, unknown, unknown, OutErr | OutErr1, OutElem1, OutDone> = unwrap(
        pipe(
          Q.take(queue),
          I.flatten,
          I.matchCause(flow(Ca.flipCauseEither, E.match(halt, end)), (outElem) => zipr_(write(outElem), consumer))
        )
      )
      return consumer
    }
  )
}

export function mapOutIOPar<OutElem, Env1, OutErr1, OutElem1>(
  n: number,
  f: (_: OutElem) => I.IO<Env1, OutErr1, OutElem1>
): <Env, InErr, InElem, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return (self) => mapOutIOPar_(self, n, f)
}

export const never: Channel<unknown, unknown, unknown, unknown, never, never, never> = fromIO(I.never)

export function orDie_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  err: E
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return orDieWith_(self, (_) => err)
}

/**
 * @dataFirst orDie_
 */
export function orDie<E>(err: E) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDie_(self, err)
}

export function orDieWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => E
) {
  return catchAll_(self, (e) => die(f(e)))
}

/**
 * @dataFirst orDieWith_
 */
export function orDieWith<OutErr, E>(f: (e: OutErr) => E) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDieWith_(self, f)
}

/**
 * Repeats this channel forever
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return chain_(self, () => repeated(self))
}

/**
 * Runs a channel until the end is received
 */
export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): M.Managed<Env, OutErr, OutDone> {
  return M.mapIO_(
    M.bracketExit_(
      I.succeedLazy(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || I.unit()
    ),
    (exec) => I.defer(() => runManagedInterpret(exec.run(), exec))
  )
}

/**
 * Runs a channel until the end is received
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): IO<Env, OutErr, OutDone> {
  return M.useNow(runManaged(self))
}

export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): IO<Env, OutErr, readonly [A.Chunk<OutElem>, OutDone]> {
  return run(doneCollect(self))
}

/**
 * Runs a channel until the end is received
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): IO<Env, OutErr, OutDone> {
  return run(drain(self))
}

export function asUnit<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return as_(self, undefined)
}

/**
 * Interpret a channel to a managed Pull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): M.Managed<Env, never, IO<Env, E.Either<OutErr, OutDone>, OutElem>> {
  return M.map_(
    M.bracketExit_(
      I.succeedLazy(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || I.unit()
    ),
    (exec) => I.defer(() => toPullInterpret(exec.run(), exec))
  )
}

export function zipPar_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  readonly [OutDone, OutDone1]
> {
  return mergeWith_(
    self,
    that,
    (exit1) => MD.await((exit2) => I.done(Ex.cross_(exit1, exit2))),
    (exit2) => MD.await((exit1) => I.done(Ex.cross_(exit1, exit2)))
  )
}

/**
 * @dataFirst zipPar_
 */
export function zipPar<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipPar_(self, that)
}

export function zipParLeft_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return map_(zipPar_(self, that), ([d]) => d)
}

/**
 * @dataFirst zipParLeft_
 */
export function zipParLeft<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParLeft_(self, that)
}

export function zipParRight_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone1
> {
  return map_(zipPar_(self, that), ([, d1]) => d1)
}

/**
 * @dataFirst zipParRight_
 */
export function zipParRight<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParRight_(self, that)
}

export function bracketOut_<Env, OutErr, Acquired, Z>(
  acquire: IO<Env, OutErr, Acquired>,
  release: (a: Acquired) => URIO<Env, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return bracketOutExit_(acquire, (z, _) => release(z))
}

/**
 * @dataFirst bracketOut_
 */
export function bracketOut<Env, Acquired, Z>(release: (a: Acquired) => URIO<Env, Z>) {
  return <OutErr>(acquire: IO<Env, OutErr, Acquired>) => bracketOut_(acquire, release)
}

export function bracket_<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  acquire: IO<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => URIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return bracketExit_(acquire, use, (a, _) => release(a))
}

/**
 * @dataFirst bracket_
 */
export function bracket<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => URIO<Env, any>
) {
  return (acquire: IO<Env, OutErr, Acquired>) => bracket_(acquire, use, release)
}

export function bracketExit_<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  acquire: IO<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return pipe(
    fromIO(Ref.make<(exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>>((_) => I.unit())),
    chain((ref) =>
      pipe(
        fromIO(I.uninterruptible(I.tap_(acquire, (a) => ref.set((_) => release(a, _))))),
        chain(use),
        ensuringWith((ex) => I.chain_(ref.get, (_) => _(ex)))
      )
    )
  )
}

/**
 * @dataFirst bracketExit_
 */
export function bracketExit<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>
) {
  return (acquire: IO<Env, OutErr, Acquired>) => bracketExit_(acquire, use, release)
}

/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel will simply
 * passthrough its input as output. However, when the buffer is non-empty, the value inside
 * the buffer will be passed along as output.
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref.URef<InElem>
): Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return unwrap(
    Ref.modify_(ref, (v) => {
      if (isEmpty(v)) {
        return tuple(
          readWith(
            (_in) => zipr_(write(_in), buffer(empty, isEmpty, ref)),
            (err) => fail(err),
            (done) => end(done)
          ),
          v
        )
      } else {
        return tuple(zipr_(write(v), buffer(empty, isEmpty, ref)), empty)
      }
    })
  )
}

export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref.URef<A.Chunk<InElem>>
): Channel<unknown, InErr, A.Chunk<InElem>, InDone, InErr, A.Chunk<InElem>, InDone> {
  return buffer<A.Chunk<InElem>, InErr, InDone>(A.empty<InElem>(), (_) => A.isEmpty(_), ref)
}

export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return concatAllWith_(
    channels,
    (_, __) => void 0,
    (_, __) => void 0
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return E.match_(either, fail, succeed)
}

export function fromOption<A>(option: O.Option<A>): Channel<unknown, unknown, unknown, unknown, O.None, never, A> {
  return O.match_(
    option,
    () => fail(O.none() as O.None),
    (_) => succeed(_)
  )
}

export function id<Err, Elem, Done>(): Channel<unknown, Err, Elem, Done, Err, Elem, Done> {
  return readWith(
    (_in) => zipr_(write(_in), id<Err, Elem, Done>()),
    (err) => fail(err),
    (done) => end(done)
  )
}

export function interrupt(fiberId: F.FiberId): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return halt(Ca.interrupt(fiberId))
}

export function managed_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, A>(
  m: M.Managed<Env, OutErr, A>,
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return bracket_(
    RM.make,
    (releaseMap) => {
      return pipe(
        fromIO<Env, OutErr, A>(
          pipe(
            m.io,
            I.gives((_: Env) => tuple(_, releaseMap)),
            I.map(([, a]) => a)
          )
        ),
        chain(use)
      )
    },
    (_) =>
      M.releaseAll_(
        _,
        Ex.unit(), // FIXME: BracketOut should be BracketOutExit (From ZIO)
        sequential
      )
  )
}

/**
 * @dataFirst managed_
 */
export function managed<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, A>(
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
) {
  return (m: M.Managed<Env, OutErr, A>) => managed_(m, use)
}

export function readOrFail<In, E>(e: E): Channel<unknown, unknown, In, unknown, E, never, In> {
  return new Read<unknown, unknown, In, unknown, never, E, never, never, In>(
    (in_) => end(in_),
    new ContinuationK(
      (_) => fail(e),
      (_) => fail(e)
    )
  )
}

export function read<In>(): Channel<unknown, unknown, In, unknown, O.None, never, In> {
  return readOrFail(O.none() as O.None)
}

export function fromHub<Err, Done, Elem>(hub: H.UHub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return managed_(H.subscribe(hub), fromQueue)
}

export function fromInput<Err, Elem, Done>(
  input: AsyncInputConsumer<Err, Elem, Done>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return unwrap(
    input.takeWith(
      (_) => halt(_),
      (_) => zipr_(write(_), fromInput(input)),
      (_) => end(_)
    )
  )
}

export function fromQueue<Err, Elem, Done>(
  queue: Q.Dequeue<Ex.Exit<E.Either<Err, Done>, Elem>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return chain_(
    fromIO(Q.take(queue)),
    Ex.match(
      (cause) =>
        E.match_(
          Ca.flipCauseEither(cause),
          (cause) => halt(cause),
          (done) => end(done)
        ),
      (elem) => zipr_(write(elem), fromQueue(queue))
    )
  )
}

export function toHub<Err, Done, Elem>(hub: H.UHub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return toQueue(H.toQueue(hub))
}

export function toQueue<Err, Done, Elem>(
  queue: Q.Enqueue<Ex.Exit<E.Either<Err, Done>, Elem>>
): Channel<unknown, Err, Elem, Done, never, never, any> {
  return readWithCause(
    (in_: Elem) => zipr_(fromIO(Q.offer_(queue, Ex.succeed(in_))), toQueue(queue)),
    (cause: Ca.Cause<Err>) => fromIO(Q.offer_(queue, Ex.halt(Ca.map_(cause, (_) => E.left(_))))),
    (done: Done) => fromIO(Q.offer_(queue, Ex.fail(E.right(done))))
  )
}

export function writeAll<Out>(
  ...outs: ReadonlyArray<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return AR.foldr_(
    outs,
    Ev.now(end(undefined)) as Ev.Eval<Channel<unknown, unknown, unknown, unknown, never, Out, void>>,
    (out, conduit) => Ev.map_(conduit, (conduit) => zipr_(write(out), conduit))
  ).value
}

function writeChunkWriter<Out>(
  outs: Chunk<Out>,
  idx: number,
  len: number
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  if (idx === len) return unit()
  return write(A.unsafeGet_(outs, idx))['*>'](writeChunkWriter(outs, idx + 1, len))
}

export function writeChunk<Out>(outs: Chunk<Out>): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return writeChunkWriter(outs, 0, outs.length)
}
