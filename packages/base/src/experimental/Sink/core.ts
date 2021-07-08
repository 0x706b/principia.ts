import type { Has } from '../../Has'
import type * as M from '../../Managed'

import * as C from '../../Chunk'
import { Clock } from '../../Clock'
import { flow, pipe } from '../../function'
import * as I from '../../IO'
import * as O from '../../Option'
import { tuple } from '../../prelude'
import { AtomicReference } from '../../util/support/AtomicReference'
import * as Ch from '../Channel'

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> {
  constructor(readonly channel: Ch.Channel<R, InErr, C.Chunk<In>, unknown, OutErr, C.Chunk<L>, Z>) {}
  ['*>']<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
    this: Sink<R, InErr, In, OutErr, L, Z>,
    that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
  ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1> {
    return apr_(this, that)
  }
  ['>>=']<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
    this: Sink<R, InErr, In, OutErr, L, Z>,
    f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
  ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1> {
    return chain_(this, f)
  }
}

export function succeedLazy<A>(a: () => A): Sink<unknown, unknown, unknown, never, never, A> {
  return new Sink(Ch.succeedLazy(a))
}

export function fromIO<R, E, Z>(io: I.IO<R, E, Z>): Sink<R, unknown, unknown, E, never, Z> {
  return new Sink(Ch.fromIO(io))
}

export function fail<E>(e: E): Sink<unknown, unknown, unknown, E, never, never> {
  return new Sink(Ch.fail(e))
}

export function failLazy<E>(e: () => E): Sink<unknown, unknown, unknown, E, never, never> {
  return new Sink(Ch.failLazy(e))
}

export function managed_<R, E, A, Env, InErr, In, OutErr, L, Z>(
  resource: M.Managed<R, E, A>,
  use: (a: A) => Sink<Env, InErr, In, OutErr, L, Z>
): Sink<R & Env, InErr, In, E | OutErr, L, Z> {
  return new Sink(Ch.managed_(resource, (a) => use(a).channel))
}

export function managed<A, Env, InErr, In, OutErr, L, Z>(
  use: (a: A) => Sink<Env, InErr, In, OutErr, L, Z>
): <R, E>(resource: M.Managed<R, E, A>) => Sink<R & Env, InErr, In, E | OutErr, L, Z> {
  return (resource) => managed_(resource, use)
}

export function succeed<A>(a: A): Sink<unknown, unknown, unknown, never, never, A> {
  return new Sink(Ch.succeed(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, InErr, In, OutErr, L, Z, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (_: In1) => In
): Sink<R, InErr, In1, OutErr, L, Z> {
  return contramapChunks_(sink, C.map(f))
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<In, In1>(
  f: (_: In1) => In
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In1, OutErr, L, Z> {
  return (sink) => contramap_(sink, f)
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapIO_<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (_: In1) => I.IO<R1, InErr1, In>
): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z> {
  return contramapChunksIO_(sink, C.mapIO(f))
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapIO<In, R1, InErr1, In1>(
  f: (_: In1) => I.IO<R1, InErr1, In>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z> {
  return (sink) => contramapIO_(sink, f)
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, InErr, In, OutErr, L, Z, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (chunk: C.Chunk<In1>) => C.Chunk<In>
): Sink<R, InErr, In1, OutErr, L, Z> {
  const loop: Ch.Channel<R, InErr, C.Chunk<In1>, unknown, InErr, C.Chunk<In>, unknown> = Ch.readWith(
    (chunk) => Ch.write(f(chunk))['*>'](loop),
    Ch.fail,
    Ch.succeed
  )
  return new Sink(loop['>>>'](sink.channel))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<In, In1>(
  f: (chunk: C.Chunk<In1>) => C.Chunk<In>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In1, OutErr, L, Z> {
  return (sink) => contramapChunks_(sink, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksIO_<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z> {
  const loop: Ch.Channel<
    R & R1,
    InErr & InErr1,
    C.Chunk<In1>,
    unknown,
    InErr | InErr1,
    C.Chunk<In>,
    unknown
  > = Ch.readWith((chunk) => Ch.fromIO(f(chunk))['>>='](Ch.write)['*>'](loop), Ch.fail, Ch.succeed)
  return new Sink(
    loop['>>>'](sink.channel as Ch.Channel<R, InErr | InErr1, C.Chunk<In>, unknown, OutErr, C.Chunk<L>, Z>)
  )
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksIO<In, R1, InErr1, In1>(
  f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z> {
  return (sink) => contramapChunksIO_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms this sink's result.
 */
export function map_<R, InErr, In, OutErr, L, Z, Z2>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Z2
): Sink<R, InErr, In, OutErr, L, Z2> {
  return new Sink(Ch.map_(sink.channel, f))
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(
  f: (z: Z) => Z2
): <R, InErr, In, OutErr, L>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In, OutErr, L, Z2> {
  return (sink) => map_(sink, f)
}

export function mapIO_<R, InErr, In, OutErr, L, Z, R1, OutErr1, Z1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => I.IO<R1, OutErr1, Z1>
): Sink<R & R1, InErr, In, OutErr | OutErr1, L, Z1> {
  return new Sink(Ch.mapIO_(sink.channel, f))
}

export function mapIO<Z, R1, OutErr1, Z1>(
  f: (z: Z) => I.IO<R1, OutErr1, Z1>
): <R, InErr, In, OutErr, L>(
  sink: Sink<R, InErr, In, OutErr, L, Z>
) => Sink<R & R1, InErr, In, OutErr | OutErr1, L, Z1> {
  return (sink) => mapIO_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, InErr, In, OutErr, L, Z, OutErr2>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (e: OutErr) => OutErr2
): Sink<R, InErr, In, OutErr2, L, Z> {
  return new Sink(Ch.mapError_(sink.channel, f))
}

export function mapError<OutErr, OutErr2>(
  f: (e: OutErr) => OutErr2
): <R, InErr, In, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In, OutErr2, L, Z> {
  return (sink) => mapError_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Match
 * -------------------------------------------------------------------------------------------------
 */

export function matchSink_<
  R,
  InErr,
  In,
  OutErr,
  L extends In1 & In2 & (L1 | L2),
  Z,
  R1,
  InErr1,
  In1 extends In,
  OutErr1,
  L1,
  Z1,
  R2,
  InErr2,
  In2 extends In,
  OutErr2,
  L2,
  Z2
>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  onFailure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, InErr2, In2, OutErr2, L2, Z2>
): Sink<R & R1 & R2, InErr & InErr1 & InErr2, In1 & In2, OutErr1 | OutErr2, L1 | L2, Z1 | Z2> {
  return new Sink(
    pipe(
      sink.channel,
      Ch.doneCollect,
      Ch.matchIO(
        (err) => onFailure(err).channel,
        ([leftovers, z]) =>
          Ch.deferTotal(() => {
            const leftoversRef     = new AtomicReference<C.Chunk<C.Chunk<L1 | L2>>>(
              C.filter_(leftovers, (a) => C.isNonEmpty(a))
            )
            const refReader        = Ch.succeedLazy(() => leftoversRef.getAndSet(C.empty()))['>>=']((chunk) =>
              Ch.writeChunk(chunk as unknown as C.Chunk<C.Chunk<In1 & In2>>)
            )
            const passthrough      = Ch.id<InErr2, C.Chunk<In1 & In2>, unknown>()
            const continuationSink = refReader['*>'](passthrough)['>>>'](onSuccess(z).channel)

            return Ch.doneCollect(continuationSink)['>>='](([newLeftovers, z1]) =>
              Ch.succeedLazy(() => leftoversRef.get)
                ['>>='](Ch.writeChunk)
                ['*>'](Ch.writeChunk(newLeftovers)['$>'](z1))
            )
          })
      )
    )
  )
}

export function matchSink<
  In,
  OutErr,
  L0 extends In1 & In2 & (L1 | L2),
  Z,
  R1,
  InErr1,
  OutErr1,
  In1 extends In,
  L1,
  Z1,
  R2,
  InErr2,
  In2 extends In,
  OutErr2,
  L2,
  Z2
>(
  onFailure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, InErr2, In2, OutErr2, L2, Z2>
): <R, InErr, L extends L0>(
  sink: Sink<R, InErr, In, OutErr, L0 | L, Z>
) => Sink<R & R1 & R2, InErr & InErr1 & InErr2, In1 & In2, OutErr1 | OutErr2, L1 | L2, Z1 | Z2> {
  return (sink) => matchSink_(sink, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1> {
  return matchSink_(sink, (err) => fail(err), f)
}

export function chain<In, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): <R, InErr, OutErr>(
  sink: Sink<R, InErr, In, OutErr, L, Z>
) => Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1> {
  return (sink) => chain_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<
  R,
  InErr,
  In,
  OutErr,
  L extends In1 & L1,
  Z,
  R1,
  InErr1,
  In1 extends In,
  OutErr1,
  L1,
  Z1,
  Z2
>(
  fa: Sink<R, InErr, In, OutErr, L, Z>,
  fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  f: (a: Z, b: Z1) => Z2
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z2> {
  return chain_(fa, (z) => map_(fb, (z1) => f(z, z1)))
}

export function apr_<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
  fa: Sink<R, InErr, In, OutErr, L, Z>,
  fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function exposeLeftover<R, InErr, In, OutErr, L, Z>(
  sink: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, never, readonly [Z, C.Chunk<L>]> {
  return new Sink(
    pipe(
      Ch.doneCollect(sink.channel),
      Ch.map(([chunks, z]) => tuple(z, C.flatten(chunks)))
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function dropLeftover<R, InErr, In, OutErr, L, Z>(
  sink: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, never, Z> {
  return new Sink(Ch.drain(sink.channel))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Sinks
 * -------------------------------------------------------------------------------------------------
 */

function collectLoop<Err, A>(
  state: C.Chunk<A>
): Ch.Channel<unknown, Err, C.Chunk<A>, unknown, Err, C.Chunk<never>, C.Chunk<A>> {
  return Ch.readWithCause(
    (i) => collectLoop(C.concat_(state, i)),
    Ch.halt,
    (_) => Ch.end(state)
  )
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(C.empty()))
}

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: Ch.Channel<unknown, Err, C.Chunk<A>, unknown, Err, C.Chunk<never>, void> = Ch.readWithCause(
    (_) => drain,
    Ch.halt,
    (_) => Ch.unit()
  )

  return new Sink(drain)
}

function foldChunkSplit<In, S>(
  s0: S,
  chunk: C.Chunk<In>,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => S
): readonly [S, C.Chunk<In>] {
  let idx = 0
  let len = chunk.length
  let s   = s0
  while (idx !== len) {
    const s1 = f(s, C.unsafeGet_(chunk, idx))
    if (!cont(s1)) {
      return [s1, C.drop_(chunk, idx + 1)]
    }
    s = s1
    idx++
  }
  return [s, C.empty()]
}

function foldReader<Err, In, S>(
  s0: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => S
): Ch.Channel<unknown, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, S> {
  if (!cont(s0)) {
    return Ch.end(s0)
  } else {
    return Ch.readWith(
      (inp: C.Chunk<In>) => {
        const [nextS, leftovers] = foldChunkSplit(s0, inp, cont, f)
        return C.isNonEmpty(leftovers) ? Ch.write(leftovers)['$>'](nextS) : foldReader(nextS, cont, f)
      },
      Ch.fail,
      () => Ch.end(s0)
    )
  }
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function fold<Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, i: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  return new Sink(foldReader(s, cont, f))
}

function foldChunksReader<Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Chunk<In>) => S
): Ch.Channel<unknown, Err, C.Chunk<In>, unknown, Err, never, S> {
  return Ch.readWith(
    (inp: C.Chunk<In>) => {
      const nextS = f(s, inp)
      return cont(nextS) ? foldChunksReader(nextS, cont, f) : Ch.end(nextS)
    },
    Ch.fail,
    () => Ch.end(s)
  )
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunks<Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Chunk<In>) => S
): Sink<unknown, Err, In, Err, never, S> {
  return new Sink(cont(s) ? foldChunksReader(s, cont, f) : Ch.end(s))
}

function foldChunksIOReader<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Chunk<In>) => I.IO<Env, Err, S>
): Ch.Channel<Env, Err, C.Chunk<In>, unknown, Err, never, S> {
  return Ch.readWith(
    (inp: C.Chunk<In>) =>
      Ch.fromIO(f(s, inp))['>>=']((nextS) => (cont(nextS) ? foldChunksIOReader(nextS, cont, f) : Ch.end(nextS))),
    Ch.fail,
    () => Ch.end(s)
  )
}

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunksIO<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Chunk<In>) => I.IO<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  return new Sink(cont(s) ? foldChunksIOReader(s, cont, f) : Ch.end(s))
}

function foldChunkSplitIO<Env, Err, In, S>(
  s: S,
  chunk: C.Chunk<In>,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): I.IO<Env, Err, readonly [S, O.Option<C.Chunk<In>>]> {
  function go(s: S, chunk: C.Chunk<In>, idx: number, len: number): I.IO<Env, Err, readonly [S, O.Option<C.Chunk<In>>]> {
    if (idx === len) {
      return I.succeed([s, O.none()])
    } else {
      return f(s, C.unsafeGet_(chunk, idx))['>>=']((s1) =>
        cont(s1) ? go(s, chunk, idx + 1, len) : I.succeed([s1, O.some(C.drop_(chunk, idx + 1))])
      )
    }
  }
  return go(s, chunk, 0, chunk.length)
}

function foldIOReader<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): Ch.Channel<Env, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, S> {
  return Ch.readWith(
    (inp: C.Chunk<In>) =>
      Ch.fromIO(foldChunkSplitIO(s, inp, cont, f))['>>='](([nextS, leftovers]) =>
        O.match_(
          leftovers,
          () => foldIOReader(nextS, cont, f),
          (l) => Ch.write(l)['$>'](nextS)
        )
      ),
    Ch.fail,
    () => Ch.end(s)
  )
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function foldIO<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  return new Sink(cont(s) ? foldIOReader(s, cont, f) : Ch.end(s))
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function foldl<Err, In, S>(s: S, f: (s: S, inp: In) => S): Sink<unknown, Err, In, Err, never, S> {
  return dropLeftover(fold(s, () => true, f))
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldlChunks<Err, In, S>(s: S, f: (s: S, inp: C.Chunk<In>) => S): Sink<unknown, Err, In, Err, never, S> {
  return foldChunks(s, () => true, f)
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldlChunksM<R, Err, In, S>(
  s: S,
  f: (s: S, inp: C.Chunk<In>) => I.IO<R, Err, S>
): Sink<R, Err, In, Err, never, S> {
  return dropLeftover(foldChunksIO(s, () => true, f))
}

/**
 * A sink that effectfully folds its inputs with the provided function and initial state.
 */
export function foldlM<R, Err, In, S>(s: S, f: (s: S, inp: In) => I.IO<R, Err, S>): Sink<R, Err, In, Err, In, S> {
  return foldIO(s, () => true, f)
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like foldWeighted, but with a constant cost function of 1.
 */
export function foldUntil<Err, In, S>(s: S, max: number, f: (s: S, inp: In) => S): Sink<unknown, Err, In, Err, In, S> {
  return pipe(
    fold<Err, In, readonly [S, number]>(
      tuple(s, 0),
      ([, n]) => n < max,
      ([o, count], i) => tuple(f(o, i), count + 1)
    ),
    map(([o]) => o)
  )
}

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like foldWeightedM, but with a constant cost function of 1.
 */
export function foldUntilIO<Env, In, Err, S>(
  s: S,
  max: number,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  return pipe(
    foldIO<Env, Err, In, readonly [S, number]>(
      tuple(s, 0),
      ([, n]) => n < max,
      ([o, count], i) => f(o, i)['<$>']((s) => tuple(s, count + 1))
    ),
    map(([o]) => o)
  )
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See foldWeightedDecompose
 * for a variant that can handle these cases.
 */
export function foldWeighted<Err, In, S>(
  s: S,
  costFn: (s: S, inp: In) => number,
  max: number,
  f: (s: S, inp: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  return foldWeightedDecompose(s, costFn, max, C.single, f)
}

function foldWeightedDecomposeLoop<Err, In, S>(
  s0: S,
  costFn: (s: S, inp: In) => number,
  max: number,
  decompose: (inp: In) => C.Chunk<In>,
  f: (s: S, inp: In) => S,
  cost0: number,
  dirty0: boolean
): Ch.Channel<unknown, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, S> {
  return Ch.readWith(
    (inp: C.Chunk<In>) => {
      let idx   = 0
      let dirty = dirty0
      let chunk = inp
      let cost  = cost0
      let s     = s0
      while (idx !== chunk.length) {
        const elem  = C.unsafeGet_(chunk, idx)
        const total = cost + costFn(s, elem)
        if (total <= max) {
          s     = f(s, elem)
          dirty = true
          cost  = total
          idx++
        } else {
          const decomposed = decompose(elem)
          if (decomposed.length <= 1 && !dirty) {
            s     = f(s, elem)
            cost  = total
            dirty = true
            chunk = C.drop_(chunk, idx + 1)
            break
          } else if (decomposed.length <= 1 && dirty) {
            chunk = C.drop_(chunk, idx)
            break
          } else {
            chunk = C.concat_(decomposed, C.drop_(chunk, idx + 1))
            idx   = 0
          }
        }
      }
      if (idx === chunk.length) {
        chunk = C.empty()
      }
      if (C.isNonEmpty(chunk)) {
        return Ch.write(chunk)['*>'](Ch.end(s))
      } else if (cost0 > max) {
        return Ch.end(s)
      } else {
        return foldWeightedDecomposeLoop(s, costFn, max, decompose, f, cost, dirty)
      }
    },
    Ch.fail,
    () => Ch.end(s0)
  )
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements.
 *
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The foldWeightedDecomposeM allows the decompose function
 * to return a `ZIO` value, and consequently it allows the sink
 * to fail.
 */
export function foldWeightedDecompose<Err, In, S>(
  s: S,
  costFn: (s: S, inp: In) => number,
  max: number,
  decompose: (inp: In) => C.Chunk<In>,
  f: (s: S, inp: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  return new Sink(foldWeightedDecomposeLoop(s, costFn, max, decompose, f, 0, false))
}

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See foldWeightedDecomposeM
 * for a variant that can handle these cases.
 */
export function foldWeightedIO<Env, Err, In, S, Env1, Err1, Env2, Err2>(
  s: S,
  costFn: (s: S, inp: In) => I.IO<Env1, Err1, number>,
  max: number,
  f: (s: S, inp: In) => I.IO<Env2, Err2, S>
): Sink<Env & Env1 & Env2, Err, In, Err | Err1 | Err2, In, S> {
  return foldWeightedDecomposeIO(s, costFn, max, flow(C.single, I.succeed), f)
}

function foldWeightedDecomposeIOLoop<Env, Err, In, S, Env1, Err1, Env2, Err2, Env3, Err3>(
  s0: S,
  costFn: (s: S, inp: In) => I.IO<Env1, Err1, number>,
  max: number,
  decompose: (inp: In) => I.IO<Env2, Err2, C.Chunk<In>>,
  f: (s: S, inp: In) => I.IO<Env3, Err3, S>,
  cost0: number,
  dirty0: boolean
): Ch.Channel<Env & Env1 & Env2 & Env3, Err, C.Chunk<In>, unknown, Err | Err1 | Err2 | Err3, C.Chunk<In>, S> {
  return Ch.readWith(
    (inp: C.Chunk<In>) => {
      const go = (
        inp: C.Chunk<In>,
        s: S,
        dirty: boolean,
        cost: number,
        idx: number
      ): I.IO<Env1 & Env2 & Env3, Err1 | Err2 | Err3, readonly [S, number, boolean, C.Chunk<In>]> => {
        if (idx === inp.length) {
          return I.succeed([s, cost, dirty, C.empty()])
        } else {
          const elem = C.unsafeGet_(inp, idx)
          return costFn(s, elem)
            ['<$>']((_) => cost + _)
            ['>>=']((total) => {
              if (total <= max) {
                return f(s, elem)['>>=']((s) => go(inp, s, true, total, idx + 1))
              } else {
                return decompose(elem)['>>=']((decomposed) => {
                  if (decomposed.length <= 1 && !dirty) {
                    return f(s, elem)['<$>']((s) => [s, total, true, C.drop_(inp, idx + 1)])
                  } else if (decomposed.length <= 1 && dirty) {
                    return I.succeed([s, cost, dirty, C.drop_(inp, idx)])
                  } else {
                    return go(decomposed['++'](C.drop_(inp, idx + 1)), s, dirty, cost, 0)
                  }
                })
              }
            })
        }
      }
      return Ch.fromIO(go(inp, s0, dirty0, cost0, 0))['>>='](([nextS, nextCost, nextDirty, leftovers]) => {
        if (C.isNonEmpty(leftovers)) {
          return Ch.write(leftovers)['*>'](Ch.end(nextS))
        } else if (cost0 > max) {
          return Ch.end(nextS)
        } else {
          return foldWeightedDecomposeIOLoop(nextS, costFn, max, decompose, f, nextCost, nextDirty)
        }
      })
    },
    Ch.fail,
    () => Ch.end(s0)
  )
}

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See foldWeightedDecompose for an example.
 */
export function foldWeightedDecomposeIO<Env, Err, In, S, Env1, Err1, Env2, Err2, Env3, Err3>(
  s: S,
  costFn: (s: S, inp: In) => I.IO<Env1, Err1, number>,
  max: number,
  decompose: (inp: In) => I.IO<Env2, Err2, C.Chunk<In>>,
  f: (s: S, inp: In) => I.IO<Env3, Err3, S>
): Sink<Env & Env1 & Env2 & Env3, Err, In, Err | Err1 | Err2 | Err3, In, S> {
  return new Sink(foldWeightedDecomposeIOLoop(s, costFn, max, decompose, f, 0, false))
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function foreach<R, Err, In>(f: (inp: In) => I.IO<R, Err, any>): Sink<R, Err, In, Err, In, void> {
  return foreachWhile(flow(f, I.as(true)))
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function foreachChunk<R, Err, In>(f: (inp: C.Chunk<In>) => I.IO<R, Err, any>): Sink<R, Err, In, Err, In, void> {
  return foreachChunkWhile(flow(f, I.as(true)))
}

function foreachWhileLoop<R, Err, In>(
  f: (_: In) => I.IO<R, Err, boolean>,
  chunk: C.Chunk<In>,
  idx: number,
  len: number,
  cont: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void>
): Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> {
  if (idx === len) {
    return cont
  }
  return pipe(
    Ch.fromIO(f(C.unsafeGet_(chunk, idx))),
    Ch.chain((b) => (b ? foreachWhileLoop(f, chunk, idx + 1, len, cont) : Ch.write(C.drop_(chunk, idx)))),
    Ch.catchAll((e) => Ch.write(C.drop_(chunk, idx))['*>'](Ch.fail(e)))
  )
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function foreachWhile<R, Err, In>(f: (_: In) => I.IO<R, Err, boolean>): Sink<R, Err, In, Err, In, void> {
  const process: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> = Ch.readWithCause(
    (inp: C.Chunk<In>) => foreachWhileLoop(f, inp, 0, inp.length, process),
    Ch.halt,
    () => Ch.unit()
  )
  return new Sink(process)
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function foreachChunkWhile<R, Err, In>(
  f: (chunk: C.Chunk<In>) => I.IO<R, Err, boolean>
): Sink<R, Err, In, Err, In, void> {
  const reader: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> = Ch.readWith(
    (inp: C.Chunk<In>) => Ch.fromIO(f(inp))['>>=']((cont) => (cont ? reader : Ch.end(undefined))),
    (err: Err) => Ch.fail(err),
    () => Ch.unit()
  )
  return new Sink(reader)
}

export function head<Err, In>(): Sink<unknown, Err, In, Err, In, O.Option<In>> {
  return fold(O.none(), O.isNone, (s, i) =>
    O.match_(
      s,
      () => O.some(i),
      () => s
    )
  )
}

export function last<Err, In>(): Sink<unknown, Err, In, Err, In, O.Option<In>> {
  return foldl(O.none(), (_, i) => O.some(i))
}

export function leftover<L>(c: C.Chunk<L>): Sink<unknown, unknown, unknown, never, L, void> {
  return new Sink(Ch.write(c))
}

export function take<Err, In>(n: number): Sink<unknown, Err, In, Err, In, C.Chunk<In>> {
  return foldChunks<Err, In, C.Chunk<In>>(C.empty(), (c) => c.length < n, C.concat_)['>>=']((acc) => {
    const [taken, leftover] = C.splitAt_(acc, n)
    return new Sink(Ch.write(leftover)['*>'](Ch.end(taken)))
  })
}

export function summarized_<R, InErr, In, OutErr, L, Z, R1, E1, B, C>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  summary: I.IO<R1, E1, B>,
  f: (b1: B, b2: B) => C
): Sink<R & R1, InErr, In, OutErr | E1, L, readonly [Z, C]> {
  return new Sink(
    Ch.fromIO(summary)['>>=']((start) =>
      sink.channel['>>=']((done) => Ch.fromIO(summary)['<$>']((end) => [done, f(start, end)]))
    )
  )
}

export function timed<R, InErr, In, OutErr, L, Z>(
  sink: Sink<R & Has<Clock>, InErr, In, OutErr, L, Z>
): Sink<R & Has<Clock>, InErr, In, OutErr, L, readonly [Z, number]> {
  return summarized_(sink, Clock.currentTime, (start, end) => end - start)
}
