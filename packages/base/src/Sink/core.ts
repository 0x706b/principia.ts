import type { Has } from '../Has'
import type { Predicate } from '../Predicate'

import * as Ch from '../Channel'
import * as MD from '../Channel/internal/MergeDecision'
import { Clock } from '../Clock'
import * as C from '../collection/immutable/Conc'
import * as E from '../Either'
import { flow, pipe } from '../function'
import * as H from '../Hub'
import { AtomicReference } from '../internal/AtomicReference'
import * as I from '../IO'
import * as Ex from '../IO/Exit'
import * as Ma from '../Managed'
import * as M from '../Maybe'
import { tuple } from '../tuple/core'

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, E, In, L, Z> {
  constructor(readonly channel: Ch.Channel<R, never, C.Conc<In>, unknown, E, C.Conc<L>, Z>) {}
}

export function succeedLazy<A>(a: () => A): Sink<unknown, unknown, never, never, A> {
  return new Sink(Ch.succeedLazy(a))
}

export function fromIO<R, E, Z>(io: I.IO<R, E, Z>): Sink<R, E, unknown, never, Z> {
  return new Sink(Ch.fromIO(io))
}

export function fail<E>(e: E): Sink<unknown, E, unknown, never, never> {
  return new Sink(Ch.fail(e))
}

export function failLazy<E>(e: () => E): Sink<unknown, unknown, E, never, never> {
  return new Sink(Ch.failLazy(e))
}

export function managed_<R, E, A, R1, E1, In, L, Z>(
  resource: Ma.Managed<R, E, A>,
  use: (a: A) => Sink<R1, E1, In, L, Z>
): Sink<R & R1, E | E1, In, L, Z> {
  return new Sink(Ch.managed_(resource, (a) => use(a).channel))
}

export function managed<A, R1, E1, In, L, Z>(
  use: (a: A) => Sink<R1, E1, In, L, Z>
): <R, E>(resource: Ma.Managed<R, E, A>) => Sink<R & R1, E | E1, In, L, Z> {
  return (resource) => managed_(resource, use)
}

export function succeed<A>(a: A): Sink<unknown, unknown, never, never, A> {
  return new Sink(Ch.succeed(a))
}

function pullFromPush<R, E, I, L, Z>(
  push: (_: M.Maybe<C.Conc<I>>) => I.IO<R, readonly [E.Either<E, Z>, C.Conc<L>], void>
): Ch.Channel<R, never, C.Conc<I>, any, E, C.Conc<L>, Z> {
  return Ch.readWith(
    (inp: C.Conc<I>) =>
      pipe(
        M.just(inp),
        push,
        Ch.fromIO,
        Ch.matchChannel(
          ([ez, leftovers]) =>
            pipe(
              ez,
              E.match(
                (e) => pipe(Ch.write(leftovers), Ch.crossSecond(Ch.fail(e))),
                (z) => pipe(Ch.write(leftovers), Ch.crossSecond(Ch.succeed(z)))
              )
            ),
          () => pullFromPush(push)
        )
      ),
    Ch.fail,
    () =>
      pipe(
        push(M.nothing()),
        Ch.fromIO,
        Ch.matchChannel(
          ([ez, leftovers]) =>
            pipe(
              ez,
              E.match(
                (e) => pipe(Ch.write(leftovers), Ch.crossSecond(Ch.fail(e))),
                (z) => pipe(Ch.write(leftovers), Ch.crossSecond(Ch.succeed(z)))
              )
            ),
          () => Ch.fromIO(I.haltMessage('empty sink'))
        )
      )
  )
}

export function fromPush<R, E, I, L, Z>(
  push: Ma.Managed<R, never, (_: M.Maybe<C.Conc<I>>) => I.IO<R, readonly [E.Either<E, Z>, C.Conc<L>], void>>
): Sink<R, E, I, L, Z> {
  return new Sink(pipe(push, Ma.map(pullFromPush), Ch.unwrapManaged))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, E, In, L, Z, In1>(sink: Sink<R, E, In, L, Z>, f: (_: In1) => In): Sink<R, E, In1, L, Z> {
  return contramapChunks_(sink, C.map(f))
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<In, In1>(
  f: (_: In1) => In
): <R, E, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z> {
  return (sink) => contramap_(sink, f)
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapIO_<R, E, In, L, Z, R1, E1, In1>(
  sink: Sink<R, E, In, L, Z>,
  f: (_: In1) => I.IO<R1, E1, In>
): Sink<R & R1, E | E1, In1, L, Z> {
  return contramapChunksIO_(sink, C.mapIO(f))
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapIO<In, R1, E1, In1>(
  f: (_: In1) => I.IO<R1, E1, In>
): <R, E, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R & R1, E | E1, In1, L, Z> {
  return (sink) => contramapIO_(sink, f)
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, E, In, L, Z, In1>(
  sink: Sink<R, E, In, L, Z>,
  f: (chunk: C.Conc<In1>) => C.Conc<In>
): Sink<R, E, In1, L, Z> {
  const loop: Ch.Channel<R, never, C.Conc<In1>, unknown, never, C.Conc<In>, unknown> = Ch.readWith(
    (chunk) => Ch.crossSecond_(Ch.write(f(chunk)), loop),
    Ch.fail,
    Ch.succeed
  )
  return new Sink(Ch.pipeToOrFail_(loop, sink.channel))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<In, In1>(
  f: (chunk: C.Conc<In1>) => C.Conc<In>
): <R, E, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z> {
  return (sink) => contramapChunks_(sink, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksIO_<R, E, In, L, Z, R1, E1, In1>(
  sink: Sink<R, E, In, L, Z>,
  f: (chunk: C.Conc<In1>) => I.IO<R1, E1, C.Conc<In>>
): Sink<R & R1, E | E1, In1, L, Z> {
  const loop: Ch.Channel<R & R1, never, C.Conc<In1>, unknown, E | E1, C.Conc<In>, unknown> = Ch.readWith(
    (chunk) => pipe(Ch.fromIO(f(chunk)), Ch.chain(Ch.write), Ch.crossSecond(loop)),
    Ch.fail,
    Ch.succeed
  )
  return new Sink(
    Ch.pipeToOrFail_(loop, sink.channel as Ch.Channel<R, never, C.Conc<In>, unknown, E | E1, C.Conc<L>, Z>)
  )
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksIO<In, R1, E1, In1>(
  f: (chunk: C.Conc<In1>) => I.IO<R1, E1, C.Conc<In>>
): <R, E, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R & R1, E | E1, In1, L, Z> {
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
export function map_<R, E, In, L, Z, Z2>(sink: Sink<R, E, In, L, Z>, f: (z: Z) => Z2): Sink<R, E, In, L, Z2> {
  return new Sink(Ch.map_(sink.channel, f))
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(f: (z: Z) => Z2): <R, E, In, L>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2> {
  return (sink) => map_(sink, f)
}

export function mapIO_<R, E, In, L, Z, R1, E1, Z1>(
  sink: Sink<R, E, In, L, Z>,
  f: (z: Z) => I.IO<R1, E1, Z1>
): Sink<R & R1, E | E1, In, L, Z1> {
  return new Sink(Ch.mapIO_(sink.channel, f))
}

export function mapIO<Z, R1, E1, Z1>(
  f: (z: Z) => I.IO<R1, E1, Z1>
): <R, E, In, L>(sink: Sink<R, E, In, L, Z>) => Sink<R & R1, E | E1, In, L, Z1> {
  return (sink) => mapIO_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, E, In, L, Z, E1>(sink: Sink<R, E, In, L, Z>, f: (e: E) => E1): Sink<R, E1, In, L, Z> {
  return new Sink(Ch.mapError_(sink.channel, f))
}

export function mapError<E, E1>(f: (e: E) => E1): <R, In, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E1, In, L, Z> {
  return (sink) => mapError_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Match
 * -------------------------------------------------------------------------------------------------
 */

export function matchSink_<
  R,
  E,
  In,
  L extends In1 & In2 & (L1 | L2),
  Z,
  R1,
  E1,
  In1 extends In,
  L1,
  Z1,
  R2,
  E2,
  In2 extends In,
  L2,
  Z2
>(
  sink: Sink<R, E, In, L, Z>,
  onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
): Sink<R & R1 & R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2> {
  return new Sink(
    pipe(
      sink.channel,
      Ch.doneCollect,
      Ch.matchChannel(
        (err) => onFailure(err).channel,
        ([leftovers, z]) =>
          Ch.deferTotal(() => {
            const leftoversRef = new AtomicReference<C.Conc<C.Conc<L1 | L2>>>(
              C.filter_(leftovers, (a) => C.isNonEmpty(a))
            )
            const refReader = Ch.chain_(
              Ch.succeedLazy(() => leftoversRef.getAndSet(C.empty())),
              (chunk) => Ch.writeChunk(chunk as unknown as C.Conc<C.Conc<In1 & In2>>)
            )
            const passthrough      = Ch.id<never, C.Conc<In1 & In2>, unknown>()
            const continuationSink = pipe(refReader, Ch.crossSecond(passthrough), Ch.pipeTo(onSuccess(z).channel))

            return Ch.chain_(Ch.doneCollect(continuationSink), ([newLeftovers, z1]) =>
              pipe(
                Ch.succeedLazy(() => leftoversRef.get),
                Ch.chain(Ch.writeChunk),
                Ch.crossSecond(Ch.as_(Ch.writeChunk(newLeftovers), z1))
              )
            )
          })
      )
    )
  )
}

export function matchSink<
  In,
  E,
  L0 extends In1 & In2 & (L1 | L2),
  Z,
  R1,
  E1,
  In1 extends In,
  L1,
  Z1,
  R2,
  E2,
  In2 extends In,
  L2,
  Z2
>(
  onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
): <R, L extends L0>(sink: Sink<R, E, In, L0 | L, Z>) => Sink<R & R1 & R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2> {
  return (sink) => matchSink_(sink, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1>(
  sink: Sink<R, E, In, L, Z>,
  f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
): Sink<R & R1, E | E1, In1, L1, Z1> {
  return matchSink_(sink, (err) => fail(err), f)
}

export function chain<In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1>(
  f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
): <R, E>(sink: Sink<R, E, In, L, Z>) => Sink<R & R1, E | E1, In1, L1, Z1> {
  return (sink) => chain_(sink, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1, Z2>(
  fa: Sink<R, E, In, L, Z>,
  fb: Sink<R1, E1, In1, L1, Z1>,
  f: (a: Z, b: Z1) => Z2
): Sink<R & R1, E | E1, In & In1, L1, Z2> {
  return chain_(fa, (z) => map_(fb, (z1) => f(z, z1)))
}

export function apSecond_<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1>(
  fa: Sink<R, E, In, L, Z>,
  fb: Sink<R1, E1, In1, L1, Z1>
): Sink<R & R1, E | E1, In1, L1, Z1> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function exposeLeftover<R, E, In, L, Z>(
  sink: Sink<R, E, In, L, Z>
): Sink<R, E, In, never, readonly [Z, C.Conc<L>]> {
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

export function dropLeftover<R, E, In, L, Z>(sink: Sink<R, E, In, L, Z>): Sink<R, E, In, never, Z> {
  return new Sink(Ch.drain(sink.channel))
}

export function unwrapManaged<R, E, R1, E1, In, L, Z>(
  managed: Ma.Managed<R, E, Sink<R1, E1, In, L, Z>>
): Sink<R & R1, E | E1, In, L, Z> {
  return new Sink(Ch.unwrapManaged(Ma.map_(managed, (_) => _.channel)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Sinks
 * -------------------------------------------------------------------------------------------------
 */

function collectLoop<Err, A>(
  state: C.Conc<A>
): Ch.Channel<unknown, Err, C.Conc<A>, unknown, Err, C.Conc<never>, C.Conc<A>> {
  return Ch.readWithCause(
    (i) => collectLoop(C.concat_(state, i)),
    Ch.failCause,
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
export function drain() {
  const drain: Ch.Channel<unknown, never, C.Conc<unknown>, unknown, never, C.Conc<never>, void> = Ch.readWithCause(
    (_) => drain,
    Ch.failCause,
    (_) => Ch.unit()
  )

  return new Sink(drain)
}

export function dropWhile<Err, In>(predicate: Predicate<In>): Sink<unknown, never, In, In, any> {
  const loop: Ch.Channel<unknown, never, C.Conc<In>, any, never, C.Conc<In>, any> = Ch.readWith(
    (inp: C.Conc<In>) => {
      const leftover = C.dropWhile_(inp, predicate)
      const more     = C.isEmpty(leftover)
      if (more) {
        return loop
      } else {
        return pipe(Ch.write(leftover), Ch.crossSecond(Ch.id<never, C.Conc<In>, any>()))
      }
    },
    (err: never) => Ch.fail(err),
    () => Ch.unit()
  )
  return new Sink(loop)
}

function foldChunkSplit<In, S>(
  s0: S,
  chunk: C.Conc<In>,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => S
): readonly [S, C.Conc<In>] {
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

function foldReader<In, S>(
  s0: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => S
): Ch.Channel<unknown, never, C.Conc<In>, unknown, never, C.Conc<In>, S> {
  if (!cont(s0)) {
    return Ch.end(s0)
  } else {
    return Ch.readWith(
      (inp: C.Conc<In>) => {
        const [nextS, leftovers] = foldChunkSplit(s0, inp, cont, f)
        return C.isNonEmpty(leftovers) ? Ch.as_(Ch.write(leftovers), nextS) : foldReader(nextS, cont, f)
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
): Sink<unknown, never, In, In, S> {
  return new Sink(foldReader(s, cont, f))
}

function foldChunksReader<In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Conc<In>) => S
): Ch.Channel<unknown, never, C.Conc<In>, unknown, never, never, S> {
  return Ch.readWith(
    (inp: C.Conc<In>) => {
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
  f: (s: S, inp: C.Conc<In>) => S
): Sink<unknown, never, In, never, S> {
  return new Sink(cont(s) ? foldChunksReader(s, cont, f) : Ch.end(s))
}

function foldChunksIOReader<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: C.Conc<In>) => I.IO<Env, Err, S>
): Ch.Channel<Env, Err, C.Conc<In>, unknown, Err, never, S> {
  return Ch.readWith(
    (inp: C.Conc<In>) =>
      Ch.chain_(Ch.fromIO(f(s, inp)), (nextS) => (cont(nextS) ? foldChunksIOReader(nextS, cont, f) : Ch.end(nextS))),
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
  f: (s: S, inp: C.Conc<In>) => I.IO<Env, Err, S>
): Sink<Env, Err, In, In, S> {
  return new Sink(cont(s) ? foldChunksIOReader(s, cont, f) : Ch.end(s))
}

function foldChunkSplitIO<Env, Err, In, S>(
  s: S,
  chunk: C.Conc<In>,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): I.IO<Env, Err, readonly [S, M.Maybe<C.Conc<In>>]> {
  function go(s: S, chunk: C.Conc<In>, idx: number, len: number): I.IO<Env, Err, readonly [S, M.Maybe<C.Conc<In>>]> {
    if (idx === len) {
      return I.succeed([s, M.nothing()])
    } else {
      return I.chain_(f(s, C.unsafeGet_(chunk, idx)), (s1) =>
        cont(s1) ? go(s, chunk, idx + 1, len) : I.succeed([s1, M.just(C.drop_(chunk, idx + 1))])
      )
    }
  }
  return go(s, chunk, 0, chunk.length)
}

function foldIOReader<Env, Err, In, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, inp: In) => I.IO<Env, Err, S>
): Ch.Channel<Env, Err, C.Conc<In>, unknown, Err, C.Conc<In>, S> {
  return Ch.readWith(
    (inp: C.Conc<In>) =>
      Ch.chain_(Ch.fromIO(foldChunkSplitIO(s, inp, cont, f)), ([nextS, leftovers]) =>
        M.match_(
          leftovers,
          () => foldIOReader(nextS, cont, f),
          (l) => Ch.as_(Ch.write(l), nextS)
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
): Sink<Env, Err, In, In, S> {
  return new Sink(cont(s) ? foldIOReader(s, cont, f) : Ch.end(s))
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function foldl<Err, In, S>(s: S, f: (s: S, inp: In) => S): Sink<unknown, Err, In, never, S> {
  return dropLeftover(fold(s, () => true, f))
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldlChunks<Err, In, S>(s: S, f: (s: S, inp: C.Conc<In>) => S): Sink<unknown, Err, In, never, S> {
  return foldChunks(s, () => true, f)
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldlChunksIO<R, Err, In, S>(
  s: S,
  f: (s: S, inp: C.Conc<In>) => I.IO<R, Err, S>
): Sink<R, Err, In, never, S> {
  return dropLeftover(foldChunksIO(s, () => true, f))
}

/**
 * A sink that effectfully folds its inputs with the provided function and initial state.
 */
export function foldlIO<R, Err, In, S>(s: S, f: (s: S, inp: In) => I.IO<R, Err, S>): Sink<R, Err, In, In, S> {
  return foldIO(s, () => true, f)
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like foldWeighted, but with a constant cost function of 1.
 */
export function foldUntil<Err, In, S>(s: S, max: number, f: (s: S, inp: In) => S): Sink<unknown, Err, In, In, S> {
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
): Sink<Env, Err, In, In, S> {
  return pipe(
    foldIO<Env, Err, In, readonly [S, number]>(
      tuple(s, 0),
      ([, n]) => n < max,
      ([o, count], i) => I.map_(f(o, i), (s) => tuple(s, count + 1))
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
): Sink<unknown, Err, In, In, S> {
  return foldWeightedDecompose(s, costFn, max, C.single, f)
}

function foldWeightedDecomposeLoop<In, S>(
  s0: S,
  costFn: (s: S, inp: In) => number,
  max: number,
  decompose: (inp: In) => C.Conc<In>,
  f: (s: S, inp: In) => S,
  cost0: number,
  dirty0: boolean
): Ch.Channel<unknown, never, C.Conc<In>, unknown, never, C.Conc<In>, S> {
  return Ch.readWith(
    (inp: C.Conc<In>) => {
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
        return Ch.crossSecond_(Ch.write(chunk), Ch.end(s))
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
export function foldWeightedDecompose<In, S>(
  s: S,
  costFn: (s: S, inp: In) => number,
  max: number,
  decompose: (inp: In) => C.Conc<In>,
  f: (s: S, inp: In) => S
): Sink<unknown, never, In, In, S> {
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
): Sink<Env & Env1 & Env2, Err | Err1 | Err2, In, In, S> {
  return foldWeightedDecomposeIO(s, costFn, max, flow(C.single, I.succeed), f)
}

function foldWeightedDecomposeIOLoop<Env, Err, In, S, Env1, Err1, Env2, Err2, Env3, Err3>(
  s0: S,
  costFn: (s: S, inp: In) => I.IO<Env1, Err1, number>,
  max: number,
  decompose: (inp: In) => I.IO<Env2, Err2, C.Conc<In>>,
  f: (s: S, inp: In) => I.IO<Env3, Err3, S>,
  cost0: number,
  dirty0: boolean
): Ch.Channel<Env & Env1 & Env2 & Env3, Err, C.Conc<In>, unknown, Err | Err1 | Err2 | Err3, C.Conc<In>, S> {
  return Ch.readWith(
    (inp: C.Conc<In>) => {
      const go = (
        inp: C.Conc<In>,
        s: S,
        dirty: boolean,
        cost: number,
        idx: number
      ): I.IO<Env1 & Env2 & Env3, Err1 | Err2 | Err3, readonly [S, number, boolean, C.Conc<In>]> => {
        if (idx === inp.length) {
          return I.succeed([s, cost, dirty, C.empty()])
        } else {
          const elem = C.unsafeGet_(inp, idx)
          return pipe(
            costFn(s, elem),
            I.map((_) => cost + _),
            I.chain((total) => {
              if (total <= max) {
                return I.chain_(f(s, elem), (s) => go(inp, s, true, total, idx + 1))
              } else {
                return I.chain_(decompose(elem), (decomposed) => {
                  if (decomposed.length <= 1 && !dirty) {
                    return I.map_(f(s, elem), (s) => [s, total, true, C.drop_(inp, idx + 1)])
                  } else if (decomposed.length <= 1 && dirty) {
                    return I.succeed([s, cost, dirty, C.drop_(inp, idx)])
                  } else {
                    return go(C.concat_(decomposed, C.drop_(inp, idx + 1)), s, dirty, cost, 0)
                  }
                })
              }
            })
          )
        }
      }
      return Ch.chain_(Ch.fromIO(go(inp, s0, dirty0, cost0, 0)), ([nextS, nextCost, nextDirty, leftovers]) => {
        if (C.isNonEmpty(leftovers)) {
          return Ch.crossSecond_(Ch.write(leftovers), Ch.end(nextS))
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
  decompose: (inp: In) => I.IO<Env2, Err2, C.Conc<In>>,
  f: (s: S, inp: In) => I.IO<Env3, Err3, S>
): Sink<Env & Env1 & Env2 & Env3, Err | Err1 | Err2 | Err3, In, In, S> {
  return new Sink(foldWeightedDecomposeIOLoop(s, costFn, max, decompose, f, 0, false))
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function foreach<R, Err, In>(f: (inp: In) => I.IO<R, Err, any>): Sink<R, Err, In, In, void> {
  return foreachWhile(flow(f, I.as(true)))
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function foreachChunk<R, Err, In>(f: (inp: C.Conc<In>) => I.IO<R, Err, any>): Sink<R, Err, In, In, void> {
  return foreachChunkWhile(flow(f, I.as(true)))
}

function foreachWhileLoop<R, Err, In>(
  f: (_: In) => I.IO<R, Err, boolean>,
  chunk: C.Conc<In>,
  idx: number,
  len: number,
  cont: Ch.Channel<R, Err, C.Conc<In>, unknown, Err, C.Conc<In>, void>
): Ch.Channel<R, Err, C.Conc<In>, unknown, Err, C.Conc<In>, void> {
  if (idx === len) {
    return cont
  }
  return pipe(
    Ch.fromIO(f(C.unsafeGet_(chunk, idx))),
    Ch.chain((b) => (b ? foreachWhileLoop(f, chunk, idx + 1, len, cont) : Ch.write(C.drop_(chunk, idx)))),
    Ch.catchAll((e) => Ch.crossSecond_(Ch.write(C.drop_(chunk, idx)), Ch.fail(e)))
  )
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function foreachWhile<R, Err, In>(f: (_: In) => I.IO<R, Err, boolean>): Sink<R, Err, In, In, void> {
  const process: Ch.Channel<R, Err, C.Conc<In>, unknown, Err, C.Conc<In>, void> = Ch.readWithCause(
    (inp: C.Conc<In>) => foreachWhileLoop(f, inp, 0, inp.length, process),
    Ch.failCause,
    () => Ch.unit()
  )
  return new Sink(process)
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function foreachChunkWhile<R, Err, In>(
  f: (chunk: C.Conc<In>) => I.IO<R, Err, boolean>
): Sink<R, Err, In, In, void> {
  const reader: Ch.Channel<R, Err, C.Conc<In>, unknown, Err, C.Conc<In>, void> = Ch.readWith(
    (inp: C.Conc<In>) => Ch.chain_(Ch.fromIO(f(inp)), (cont) => (cont ? reader : Ch.end(undefined))),
    (err: Err) => Ch.fail(err),
    () => Ch.unit()
  )
  return new Sink(reader)
}

export function head<Err, In>(): Sink<unknown, Err, In, In, M.Maybe<In>> {
  return fold(M.nothing(), M.isNothing, (s, i) =>
    M.match_(
      s,
      () => M.just(i),
      () => s
    )
  )
}

export function last<Err, In>(): Sink<unknown, Err, In, In, M.Maybe<In>> {
  return foldl(M.nothing(), (_, i) => M.just(i))
}

export function leftover<L>(c: C.Conc<L>): Sink<unknown, never, unknown, L, void> {
  return new Sink(Ch.write(c))
}

export function take<Err, In>(n: number): Sink<unknown, Err, In, In, C.Conc<In>> {
  return chain_(
    foldChunks<Err, In, C.Conc<In>>(C.empty(), (c) => c.length < n, C.concat_),
    (acc) => {
      const [taken, leftover] = C.splitAt_(acc, n)
      return new Sink(Ch.crossSecond_(Ch.write(leftover), Ch.end(taken)))
    }
  )
}

export function summarized_<R, E, In, L, Z, R1, E1, B, C>(
  sink: Sink<R, E, In, L, Z>,
  summary: I.IO<R1, E1, B>,
  f: (b1: B, b2: B) => C
): Sink<R & R1, E | E1, In, L, readonly [Z, C]> {
  return new Sink(
    Ch.chain_(Ch.fromIO(summary), (start) =>
      Ch.chain_(sink.channel, (done) => Ch.map_(Ch.fromIO(summary), (end) => [done, f(start, end)]))
    )
  )
}

export function timed<R, E, In, L, Z>(
  sink: Sink<R & Has<Clock>, E, In, L, Z>
): Sink<R & Has<Clock>, E, In, L, readonly [Z, number]> {
  return summarized_(sink, Clock.currentTime, (start, end) => end - start)
}

export function raceWith_<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1, R2, E2, Z2, R3, E3, Z3>(
  sink: Sink<R, E, In, L, Z>,
  that: Sink<R1, E1, In1, L1, Z1>,
  leftDone: (exit: Ex.Exit<E, Z>) => MD.MergeDecision<R2, E1, Z1, E2, Z2>,
  rightDone: (exit: Ex.Exit<E1, Z1>) => MD.MergeDecision<R3, E, Z, E3, Z3>,
  capacity = 16
): Sink<R & R1 & R2 & R3, E | E1 | E2 | E3, In & In1, L | L1, Z2 | Z3> {
  const managed = Ma.gen(function* (_) {
    const hub    = yield* _(H.makeBounded<E.Either<Ex.Exit<never, any>, C.Conc<In & In1>>>(capacity))
    const left   = yield* _(Ch.fromHubManaged(hub))
    const right  = yield* _(Ch.fromHubManaged(hub))
    const reader = Ch.toHub<never, any, C.Conc<In1>>(hub)
    const writer = pipe(
      left,
      Ch.pipeTo(sink.channel),
      Ch.mergeWith(pipe(right, Ch.pipeTo(that.channel)), leftDone, rightDone)
    )
    const channel = pipe(
      reader,
      Ch.mergeWith(
        writer,
        (_) => MD.await(I.fromExit),
        (done) => MD.done(I.fromExit(done))
      )
    )
    return new Sink(channel)
  })
  return unwrapManaged(managed)
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function crossWithC_<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1, Z2>(
  fa: Sink<R, E, In, L, Z>,
  fb: Sink<R1, E1, In1, L1, Z1>,
  f: (a: Z, b: Z1) => Z2,
  capacity = 16
): Sink<R & R1, E | E1, In & In1, L1, Z2> {
  return raceWith_(
    fa,
    fb,
    Ex.match(
      (err) => MD.done(I.failCause(err)),
      (lz): MD.MergeDecision<unknown, E | E1, Z1, E | E1, Z2> =>
        MD.await(
          Ex.match(
            (cause) => I.failCause(cause),
            (rz) => I.succeed(f(lz, rz))
          )
        )
    ),
    Ex.match(
      (err) => MD.done(I.failCause(err)),
      (rz): MD.MergeDecision<unknown, E | E1, Z, E | E1, Z2> =>
        MD.await(
          Ex.match(
            (cause) => I.failCause(cause),
            (lz) => I.succeed(f(lz, rz))
          )
        )
    )
  )
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function crossWithC<In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1, Z2>(
  fb: Sink<R1, E1, In1, L1, Z1>,
  f: (a: Z, b: Z1) => Z2
): <R, E>(fa: Sink<R, E, In, L, Z>) => Sink<R & R1, E | E1, In & In1, L1, Z2> {
  return (fa) => crossWithC_(fa, fb, f)
}
