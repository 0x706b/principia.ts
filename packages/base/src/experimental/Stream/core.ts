import type { Has } from '../../Has'
import type { Layer } from '../../Layer'
import type { Predicate } from '../../Predicate'
import type * as P from '../../prelude'
import type * as SK from '../Sink'
import type { StreamAspect } from '../StreamAspect'

import * as AI from '../../AsyncIterable'
import * as Ca from '../../Cause'
import * as C from '../../Chunk'
import { Clock } from '../../Clock'
import * as E from '../../Either'
import { IllegalArgumentError } from '../../Error'
import * as Ex from '../../Exit'
import * as F from '../../Fiber'
import { flow, identity, pipe } from '../../function'
import * as HM from '../../HashMap'
import * as H from '../../Hub'
import * as I from '../../IO'
import * as La from '../../Layer'
import * as L from '../../List'
import * as M from '../../Managed'
import * as O from '../../Option'
import { not } from '../../Predicate'
import * as Pr from '../../Promise'
import * as Q from '../../Queue'
import * as Ref from '../../Ref'
import * as SC from '../../Schedule'
import * as Sem from '../../Semaphore'
import { tuple } from '../../tuple'
import * as Ch from '../Channel'
import * as MD from '../Channel/internal/MergeDecision'
import * as Sink from '../Sink'
import * as DS from './DebounceState'
import * as GB from './GroupBy'
import * as HO from './Handoff'
import * as Pull from './Pull'
import * as SER from './SinkEndReason'
import * as Take from './Take'
import { zipChunks_ } from './utils'

export const StreamTypeId = Symbol()
export type StreamTypeId = typeof StreamTypeId

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 */
export class Stream<R, E, A> {
  readonly [StreamTypeId]: StreamTypeId = StreamTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly channel: Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, unknown>) {}

  ['@@']<R, E extends EC, A extends A1, R1, E1, A1, EC>(
    this: Stream<R, E, A>,
    aspect: StreamAspect<R1, E1, A1, EC>
  ): Stream<R & R1, E | E1, A> {
    return aspect.apply(this)
  }
  ['*>']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, A1> {
    return crossSecond_(this, that)
  }
  ['<*']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, A> {
    return crossFirst_(this, that)
  }
  ['<*>']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, readonly [A, A1]> {
    return cross_(this, that)
  }
  ['&>']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, A1> {
    return zipSecond_(this, that)
  }
  ['<&']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, A> {
    return zipFirst_(this, that)
  }
  ['<&>']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, readonly [A, A1]> {
    return zip_(this, that)
  }
  ['++']<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E | E1, A | A1> {
    return concat_(this, that)
  }
  ['>>=']<R1, E1, B>(f: (a: A) => Stream<R1, E1, B>): Stream<R & R1, E | E1, B> {
    return chain_(this, f)
  }
  ['<$>']<B>(f: (a: A) => B): Stream<R, E, B> {
    return map_(this, f)
  }
  ['>>>']<R1, E1, Z>(sink: Sink.Sink<R1, E, A, E1, never, Z>): I.IO<R & R1, E | E1, Z> {
    return run_(this, sink)
  }
}

/**
 * Empty stream
 */
export const empty = fromChunk(C.empty<never>())

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Halt a stream with the specified exception
 */
export function die(u: unknown): Stream<unknown, never, never> {
  return new Stream(Ch.die(u))
}

/**
 * Halt a stream with the specified exception
 */
export function dieLazy(u: () => unknown): Stream<unknown, never, never> {
  return new Stream(Ch.dieLazy(u))
}

/**
 * Halt a stream with the specified error
 */
export function fail<E>(error: E): Stream<unknown, E, never> {
  return new Stream(Ch.fail(error))
}

/**
 * Halt a stream with the specified error
 */
export function failLazy<E>(error: () => E): Stream<unknown, E, never> {
  return new Stream(Ch.failLazy(error))
}

/**
 * Creates a stream from a `Chunk` of values
 */
export function fromChunk<O>(c: C.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(Ch.unwrap(I.succeedLazy(() => Ch.write(c))))
}

/**
 * Creates a stream from a `Chunk` of values
 */
export function fromChunkLazy<O>(c: () => C.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(Ch.unwrap(I.succeedLazy(() => Ch.writeLazy(c))))
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function fromManaged<R, E, A>(stream: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(Ch.managedOut(M.map_(stream, C.single)))
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return fromChunk(C.single(o))
}

/**
 * Creates a single-valued pure stream
 */
export function succeedLazy<O>(o: () => O): Stream<unknown, never, O> {
  return fromChunkLazy(() => C.single(o()))
}

function unfoldChunkIOLoop<S, R, E, A>(
  s: S,
  f: (s: S) => I.IO<R, E, O.Option<readonly [C.Chunk<A>, S]>>
): Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, unknown> {
  return Ch.unwrap(
    I.map_(
      f(s),
      O.match(
        () => Ch.unit(),
        ([as, s]) => Ch.chain_(Ch.write(as), () => unfoldChunkIOLoop(s, f))
      )
    )
  )
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkIO<R, E, A, S>(
  s: S,
  f: (s: S) => I.IO<R, E, O.Option<readonly [C.Chunk<A>, S]>>
): Stream<R, E, A> {
  return new Stream(unfoldChunkIOLoop(s, f))
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldIO<S, R, E, A>(s: S, f: (s: S) => I.IO<R, E, O.Option<readonly [A, S]>>): Stream<R, E, A> {
  return unfoldChunkIO(s, (_) =>
    I.map_(
      f(_),
      O.map(([a, s]) => tuple(C.single(a), s))
    )
  )
}

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromIO<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return fromIOOption(I.mapError_(fa, O.some))
}

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromIOOption<R, E, A>(fa: I.IO<R, O.Option<E>, A>): Stream<R, E, A> {
  return new Stream(
    Ch.unwrap(
      I.match_(
        fa,
        O.match(
          () => Ch.end(undefined),
          (e) => Ch.fail(e)
        ),
        (a) => Ch.write(C.single(a))
      )
    )
  )
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue_<R, E, O>(
  queue: Q.Queue<never, R, unknown, E, never, O>,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): Stream<R, E, O> {
  return repeatIOChunkOption(
    pipe(
      Q.takeBetween_(queue, 1, maxChunkSize),
      I.map(C.from),
      I.catchAllCause((c) =>
        I.chain_(Q.isShutdown(queue), (down) => {
          if (down && Ca.interrupted(c)) {
            return Pull.end
          } else {
            return Pull.halt(c)
          }
        })
      )
    )
  )
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue(maxChunkSize: number = DEFAULT_CHUNK_SIZE) {
  return <R, E, O>(queue: Q.Queue<never, R, unknown, E, never, O>) => fromQueue_(queue, maxChunkSize)
}

export function fromQueueWithShutdown_<R, E, A>(
  queue: Q.Queue<never, R, unknown, E, never, A>,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): Stream<R, E, A> {
  return pipe(fromQueue_(queue, maxChunkSize), ensuring(Q.shutdown(queue)))
}

export function fromQueueWithShutdown(
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): <R, E, A>(queue: Q.Queue<never, R, unknown, E, never, A>) => Stream<R, E, A> {
  return (queue) => fromQueueWithShutdown_(queue, maxChunkSize)
}

/**
 * Repeats the provided value infinitely.
 */
export function repeatValue<A>(a: A): Stream<unknown, never, A> {
  return new Stream(pipe(C.single(a), Ch.write, Ch.repeated))
}

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatIO<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return pipe(fa, I.mapError(O.some), repeatIOOption)
}

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export function repeatIOOption<R, E, A>(fa: I.IO<R, O.Option<E>, A>): Stream<R, E, A> {
  return pipe(fa, I.map(C.single), repeatIOChunkOption)
}

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatIOChunk<R, E, A>(fa: I.IO<R, E, C.Chunk<A>>): Stream<R, E, A> {
  return pipe(fa, I.mapError(O.some), repeatIOChunkOption)
}

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatIOChunkOption<R, E, A>(fa: I.IO<R, O.Option<E>, C.Chunk<A>>): Stream<R, E, A> {
  return unfoldChunkIO(undefined, (_) => {
    return I.catchAll_(
      I.map_(fa, (chunk) => O.some(tuple(chunk, undefined))),
      O.match(
        () => I.succeed(O.none()),
        (e) => I.fail(e)
      )
    )
  })
}

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatIOWith<R, E, A>(
  effect: I.IO<R, E, A>,
  schedule: SC.Schedule<R, A, unknown>
): Stream<R & Has<Clock>, E, A> {
  return pipe(
    effect,
    I.cross(SC.driver(schedule)),
    fromIO,
    chain(([a, driver]) =>
      pipe(
        succeed(a),
        concat(
          unfoldIO(
            a,
            flow(
              driver.next,
              I.matchIO(
                (_) => I.succeed(O.none()),
                () =>
                  pipe(
                    effect,
                    I.map((nextA) => O.some(tuple(nextA, nextA)))
                  )
              )
            )
          )
        )
      )
    )
  )
}

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A>(a: A, schedule: SC.Schedule<R, A, unknown>): Stream<R & Has<Clock>, never, A> {
  return repeatIOWith(I.succeed(a), schedule)
}

export function asyncInterrupt<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => E.Either<I.Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return unwrapManaged(
    M.gen(function* (_) {
      const output       = yield* _(M.bracket_(Q.makeBounded<Take.Take<E, A>>(outputBuffer), Q.shutdown))
      const runtime      = yield* _(I.runtime<R>())
      const eitherStream = yield* _(
        M.succeedLazy(() =>
          register((k, cb) =>
            pipe(
              Take.fromPull(k),
              I.chain((a) => Q.offer_(output, a)),
              runtime.runCancel(cb)
            )
          )
        )
      )
      return E.match_(
        eitherStream,
        (canceler) => {
          const loop: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = pipe(
            Q.take(output),
            I.chain(Take.done),
            I.match(flow(O.match(() => Ch.end(undefined), Ch.fail)), (a) => Ch.zipr_(Ch.write(a), loop)),
            Ch.unwrap
          )
          return ensuring_(new Stream(loop), canceler)
        },
        (stream) =>
          pipe(
            Q.shutdown(output),
            I.asLazy(() => stream),
            unwrap
          )
      )
    })
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function asyncOption<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => O.Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncInterrupt((k) => O.match_(register(k), () => E.left(I.unit()), E.right), outputBuffer)
}

export function async<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncOption((cb) => {
    register(cb)
    return O.none()
  }, outputBuffer)
}

export function asyncIO<R, E, A, R1 = R, E1 = E>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => I.IO<R1, E1, unknown>,
  outputBuffer = 16
): Stream<R & R1, E | E1, A> {
  return new Stream(
    Ch.unwrapManaged(
      M.gen(function* (_) {
        const output  = yield* _(M.bracket_(Q.makeBounded<Take.Take<E, A>>(outputBuffer), Q.shutdown))
        const runtime = yield* _(I.runtime<R>())
        yield* _(
          register((k, cb) =>
            pipe(
              Take.fromPull(k),
              I.chain((a) => Q.offer_(output, a)),
              runtime.runCancel(cb)
            )
          )
        )
        const loop: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = pipe(
          Q.take(output),
          I.chain(Take.done),
          I.matchCauseIO(
            (maybeError) =>
              pipe(
                Q.shutdown(output),
                I.asLazy(() =>
                  pipe(
                    Ca.failureOrCause(maybeError),
                    E.match(
                      O.match(() => Ch.end(undefined), Ch.fail),
                      Ch.halt
                    )
                  )
                )
              ),
            (a) => I.succeed(Ch.zipr_(Ch.write(a), loop))
          ),
          Ch.unwrap
        )
        return loop
      })
    )
  )
}

function fromIteratorLoop<A>(
  iterator: Iterator<A>
): Ch.Channel<unknown, unknown, unknown, unknown, never, C.Chunk<A>, unknown> {
  return Ch.unwrap(
    I.succeedLazy(() => {
      const v = iterator.next()
      return v.done ? Ch.end(undefined) : pipe(Ch.write(C.single(v.value)), Ch.zipr(fromIteratorLoop(iterator)))
    })
  )
}

export function fromIterator<A>(iterator: () => Iterator<A>): Stream<unknown, never, A> {
  return new Stream(fromIteratorLoop(iterator()))
}

/**
 * The stream that always halts with `cause`.
 */
export function halt<E>(cause: Ca.Cause<E>): Stream<unknown, E, never> {
  return fromIO(I.halt(cause))
}

/**
 * The stream that always halts with `cause`.
 */
export function haltLazy<E>(cause: () => Ca.Cause<E>): Stream<unknown, E, never> {
  return fromIO(I.haltLazy(cause))
}

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(hub: H.Hub<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return chain_(fromManaged(H.subscribe(hub)), fromQueue())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, readonly [A, A1]> {
  return new Stream(
    Ch.concatMap_(stream.channel, (a) =>
      Ch.mapOut_(that.channel, (b) => C.chain_(a, (a) => C.map_(b, (b) => tuple(a, b))))
    )
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(stream: Stream<R, E, A>) => cross_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossFirst_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return map_(cross_(stream, that), ([a]) => a)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossFirst<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(stream: Stream<R, E, A>) => crossFirst_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossSecond_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A1> {
  return map_(cross_(stream, that), ([, a1]) => a1)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossSecond<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(stream: Stream<R, E, A>) => crossSecond_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossWith<R, R1, E, E1, A, A1>(stream: Stream<R, E, A>, that: Stream<R1, E1, A1>) {
  return <C>(f: (a: A, a1: A1) => C): Stream<R & R1, E | E1, C> => chain_(stream, (l) => map_(that, (r) => f(l, r)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 */
export function chain_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    Ch.concatMap_(stream.channel, (o) =>
      C.foldl_(
        C.map_(o, (x) => f(x).channel),
        Ch.unit() as Ch.Channel<R1, unknown, unknown, unknown, E1, C.Chunk<O1>, unknown>,
        (s, a) => Ch.chain_(s, () => a)
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 *
 * @dataFirst chain_
 */
export function chain<O, R1, E1, O1>(
  f: (o: O) => Stream<R1, E1, O1>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (stream) => chain_(stream, f)
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R0, E0, R, E, A>(stream: Stream<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return chain_(stream, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapIO_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return loopOnPartialChunksElements_<R, E, A, R1, E1, B>(stream, (a, emit) => I.chain_(f(a), emit))
}

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @dataFirst mapIO_
 */
export function mapIO<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapIO_(stream, f)
}

/**
 * Transforms the elements of this stream using the supplied function.
 */
export function map_<R, E, O, O1>(stream: Stream<R, E, O>, f: (o: O) => O1): Stream<R, E, O1> {
  return new Stream(Ch.mapOut_(stream.channel, (o) => C.map_(o, f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @dataFirst map_
 */
export function map<O, O1>(f: (o: O) => O1): <R, E>(stream: Stream<R, E, O>) => Stream<R, E, O1> {
  return (stream) => map_(stream, f)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, A, A2>(stream: Stream<R, E, A>, a2: A2): Stream<R, E, A2> {
  return map_(stream, (_) => a2)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<A2>(a2: A2) {
  return <R, E, A>(stream: Stream<R, E, A>) => as_(stream, a2)
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, A1>(
  stream: Stream<R, E, A>,
  f: (chunk: C.Chunk<A>) => C.Chunk<A1>
): Stream<R, E, A1> {
  return new Stream(Ch.mapOut_(stream.channel, f))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<A, A1>(
  f: (chunk: C.Chunk<A>) => C.Chunk<A1>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A1> {
  return (stream) => mapChunks_(stream, f)
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksIO_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (chunk: C.Chunk<A>) => I.IO<R1, E1, C.Chunk<B>>
): Stream<R & R1, E | E1, B> {
  return new Stream(Ch.mapOutIO_(stream.channel, f))
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksIO<A, R1, E1, B>(
  f: (chunk: C.Chunk<A>) => I.IO<R1, E1, C.Chunk<B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapChunksIO_(stream, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E1, A>(stream: Stream<R, E, A>, f: (e: E) => E1): Stream<R, E1, A> {
  return new Stream(Ch.mapError_(stream.channel, f))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(stream: Stream<R, E, A>) => mapError_(stream, f)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, E1, A, A1>(stream: Stream<R, E, A>, f: (e: E) => E1, g: (a: A) => A1): Stream<R, E1, A1> {
  return map_(mapError_(stream, f), g)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(stream: Stream<R, E, A>) => bimap_(stream, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filterIO_<R, E, A, R1, E1>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  return loopOnPartialChunksElements_(fa, (a, emit) => f(a)['>>=']((r) => (r ? emit(a) : I.unit())))
}

export function filterIO<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, boolean>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (fa) => filterIO_(fa, f)
}

export function filter_<R, E, A, B extends A>(fa: Stream<R, E, A>, refinement: P.Refinement<A, B>): Stream<R, E, B>
export function filter_<R, E, A>(fa: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A>
export function filter_<R, E, A>(fa: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A> {
  return filterIO_(fa, flow(predicate, I.succeed))
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B>
export function filter<A>(predicate: P.Predicate<A>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, A>
export function filter<A>(predicate: P.Predicate<A>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMapIO_<R, E, A, R1, E1, B>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, O.Option<B>>
): Stream<R & R1, E | E1, B> {
  return loopOnPartialChunksElements_(fa, (a, emit) => f(a)['>>='](O.match(() => I.unit(), emit)))
}

export function filterMapIO<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, O.Option<B>>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (fa) => filterMapIO_(fa, f)
}

export function filterMap_<R, E, A, B>(fa: Stream<R, E, A>, f: (a: A) => O.Option<B>): Stream<R, E, B> {
  return filterMapIO_(fa, flow(f, I.succeed))
}

export function filterMap<A, B>(f: (a: A) => O.Option<B>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
  return (fa) => filterMap_(fa, f)
}

export function partitionMapIO_<R, E, A, R1, E1, B, C>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, E.Either<B, C>>,
  buffer = 16
): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, B>, Stream<unknown, E | E1, C>]> {
  return pipe(
    fa,
    mapIO(f),
    distributedWith(
      2,
      buffer,
      E.match(
        () => I.succeed((_) => _ === 0),
        () => I.succeed((_) => _ === 1)
      )
    ),
    M.chain(([q1, q2]) =>
      M.succeed(
        tuple(
          pipe(fromQueueWithShutdown_(q1), flattenExitOption, collectLeft),
          pipe(fromQueueWithShutdown_(q2), flattenExitOption, collectRight)
        )
      )
    )
  )
}

export function partitionMapIO<A, R1, E1, B, C>(
  f: (a: A) => I.IO<R1, E1, E.Either<B, C>>,
  buffer = 16
): <R, E>(
  fa: Stream<R, E, A>
) => M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, B>, Stream<unknown, E | E1, C>]> {
  return (fa) => partitionMapIO_(fa, f, buffer)
}

export function partitionMap_<R, E, A, B, C>(
  fa: Stream<R, E, A>,
  f: (a: A) => E.Either<B, C>,
  buffer = 16
): M.Managed<R, never, readonly [Stream<unknown, E, B>, Stream<unknown, E, C>]> {
  return partitionMapIO_(fa, flow(f, I.succeed), buffer)
}

export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>,
  buffer = 16
): <R, E>(fa: Stream<R, E, A>) => M.Managed<R, never, readonly [Stream<unknown, E, B>, Stream<unknown, E, C>]> {
  return (fa) => partitionMap_(fa, f, buffer)
}

export function partitionIO_<R, E, A, R1, E1>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, boolean>,
  buffer = 16
): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, A>, Stream<unknown, E | E1, A>]> {
  return partitionMapIO_(
    fa,
    (a) =>
      pipe(
        f(a),
        I.map((b) => (b ? E.right(a) : E.left(a)))
      ),
    buffer
  )
}

export function partitionIO<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, boolean>,
  buffer = 16
): <R, E>(
  fa: Stream<R, E, A>
) => M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, A>, Stream<unknown, E | E1, A>]> {
  return (fa) => partitionIO_(fa, f, buffer)
}

export function partition_<R, E, A, B extends A>(
  fa: Stream<R, E, A>,
  refinement: P.Refinement<A, B>,
  buffer?: number
): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, B>]>
export function partition_<R, E, A>(
  fa: Stream<R, E, A>,
  predicate: P.Predicate<A>,
  buffer?: number
): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]>
export function partition_<R, E, A>(
  fa: Stream<R, E, A>,
  predicate: P.Predicate<A>,
  buffer = 16
): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]> {
  return partitionIO_(fa, flow(predicate, I.succeed), buffer)
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>,
  buffer?: number
): <R, E>(fa: Stream<R, E, A>) => M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, B>]>
export function partition<A>(
  predicate: P.Predicate<A>,
  buffer?: number
): <R, E>(fa: Stream<R, E, A>) => M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]>
export function partition<A>(
  predicate: P.Predicate<A>,
  buffer = 16
): <R, E>(fa: Stream<R, E, A>) => M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]> {
  return (fa) => partition_(fa, predicate, buffer)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function ask<R>(): Stream<R, never, R> {
  return fromIO(I.ask<R>())
}

/**
 * Accesses the environment of the stream.
 */
export function asks<R, A>(f: (r: R) => A): Stream<R, never, A> {
  return map_(ask<R>(), f)
}

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function asksIO<R0, R, E, A>(f: (r0: R0) => I.IO<R, E, A>): Stream<R0 & R, E, A> {
  return mapIO_(ask<R0>(), f)
}

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function asksStream<R0, R, E, A>(f: (r0: R0) => Stream<R, E, A>): Stream<R0 & R, E, A> {
  return chain_(ask<R0>(), f)
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, A>(ra: Stream<R, E, A>, r: R): Stream<unknown, E, A> {
  return new Stream(Ch.giveAll_(ra.channel, r))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R): <E, A>(ra: Stream<R, E, A>) => Stream<unknown, E, A> {
  return (ra) => giveAll_(ra, r)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives_<R, E, A, R0>(ra: Stream<R, E, A>, f: (r0: R0) => R): Stream<R0, E, A> {
  return ask<R0>()['>>=']((r0) => giveAll_(ra, f(r0)))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives<R, R0>(f: (r0: R0) => R): <E, A>(ra: Stream<R, E, A>) => Stream<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function give_<R, E, A, R0>(ra: Stream<R0 & R, E, A>, r: R): Stream<R0, E, A> {
  return gives_(ra, (r0) => ({ ...r0, ...r }))
}

export function give<R>(r: R): <R0, E, A>(ra: Stream<R0 & R, E, A>) => Stream<R0, E, A> {
  return (ra) => give_(ra, r)
}

/**
 * Provides a layer to the stream, which translates it to another level.
 */
export function giveLayer_<R, E, A, R0, E1, R1>(
  ra: Stream<R & R1, E, A>,
  layer: Layer<R0, E1, R1>
): Stream<R0 & R, E | E1, A> {
  return new Stream(Ch.managed_(La.build(layer), (r1) => Ch.gives_(ra.channel, (env0: R0 & R) => ({ ...env0, ...r1 }))))
}

/**
 * Provides a layer to the stream, which translates it to another level.
 */
export function giveLayer<R0, E1, R1>(
  layer: Layer<R0, E1, R1>
): <R, E, A>(ra: Stream<R & R1, E, A>) => Stream<R0 & R, E | E1, A> {
  return <R, E, A>(ra: Stream<R & R1, E, A>): Stream<R0 & R, E | E1, A> =>
    new Stream(Ch.managed_(La.build(layer), (r1) => Ch.gives_(ra.channel, (env0: R0 & R) => ({ ...env0, ...r1 }))))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

function combineChunksProducer<Err, Elem>(
  handoff: HO.Handoff<Take.Take<Err, Elem>>,
  latch: HO.Handoff<void>
): Ch.Channel<unknown, Err, C.Chunk<Elem>, unknown, never, never, any> {
  return Ch.fromIO(HO.take(latch))['*>'](
    Ch.readWithCause(
      (chunk) => Ch.fromIO(HO.offer(handoff, Take.chunk(chunk)))['*>'](combineChunksProducer(handoff, latch)),
      (cause) => Ch.fromIO(HO.offer(handoff, Take.halt(cause))),
      () => Ch.fromIO(HO.offer(handoff, Take.end))['*>'](combineChunksProducer(handoff, latch))
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, E, A, R1, E1, A1, S, R2, A2>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    l: I.IO<R, O.Option<E>, C.Chunk<A>>,
    r: I.IO<R1, O.Option<E1>, C.Chunk<A1>>
  ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [C.Chunk<A2>, S]>>
): Stream<R1 & R & R2, E | E1, A2> {
  return new Stream(
    Ch.managed_(
      M.gen(function* (_) {
        const left   = yield* _(HO.make<Take.Take<E, A>>())
        const right  = yield* _(HO.make<Take.Take<E1, A1>>())
        const latchL = yield* _(HO.make<void>())
        const latchR = yield* _(HO.make<void>())
        yield* _(pipe(stream.channel['>>>'](combineChunksProducer(left, latchL)), Ch.runManaged, M.fork))
        yield* _(pipe(that.channel['>>>'](combineChunksProducer(right, latchR)), Ch.runManaged, M.fork))
        return tuple(left, right, latchL, latchR)
      }),
      ([left, right, latchL, latchR]) => {
        const pullLeft  = HO.offer(latchL, undefined)['*>'](HO.take(left))['>>='](Take.done)
        const pullRight = HO.offer(latchR, undefined)['*>'](HO.take(right))['>>='](Take.done)
        return unfoldChunkIO(s, (s) => f(s, pullLeft, pullRight)['>>='](flow(I.done, I.optional))).channel
      }
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * @dataFirst combineChunks_
 */
export function combineChunks<R, E, A, R1, E1, A1, S, R2, A2>(
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    l: I.IO<R, O.Option<E>, C.Chunk<A>>,
    r: I.IO<R1, O.Option<E1>, C.Chunk<A1>>
  ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [C.Chunk<A2>, S]>>
): (stream: Stream<R, E, A>) => Stream<R1 & R & R2, E | E1, A2> {
  return (stream) => combineChunks_(stream, that, s, f)
}

/**
 * Repeats this stream forever.
 */
export function forever<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(Ch.repeated(stream.channel))
}

/**
 * Loops over the stream chunks concatenating the result of f
 */
export function loopOnChunks_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  f: (a: C.Chunk<A>) => Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean>
): Stream<R & R1, E | E1, A1> {
  const loop: Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean> = Ch.readWithCause(
    (chunk) => Ch.chain_(f(chunk), (cont) => (cont ? loop : Ch.end(false))),
    Ch.halt,
    (_) => Ch.end(false)
  )
  return new Stream(stream.channel['>>>'](loop))
}

/**
 * Loops on chunks emitting partially
 */
export function loopOnPartialChunks_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  f: (a: C.Chunk<A>, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A1> {
  return loopOnChunks_(stream, (chunk) =>
    Ch.unwrap(
      I.defer(() => {
        let outputChunk = C.empty<A1>()
        return I.catchAll_(
          I.map_(
            f(chunk, (a: A1) =>
              I.succeedLazy(() => {
                outputChunk = C.append_(outputChunk, a)
              })
            ),
            (cont) => Ch.chain_(Ch.write(outputChunk), () => Ch.end(cont))
          ),
          (failure) =>
            I.succeedLazy(() => {
              if (C.isEmpty(outputChunk)) {
                return Ch.fail(failure)
              } else {
                return Ch.chain_(Ch.write(outputChunk), () => Ch.fail(failure))
              }
            })
        )
      })
    )
  )
}

/**
 * Loops on chunks elements emitting partially
 */
export function loopOnPartialChunksElements_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  f: (a: A, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, void>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunks_(stream, (a, emit) =>
    I.asLazy_(
      C.mapIO_(a, (a) => f(a, emit)),
      () => true
    )
  )
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R2, E2, Z>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): I.IO<R & R2, E2, Z> {
  return Ch.runDrain(stream.channel['>>>'](sink.channel))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @dataFirst run_
 */
export function run<E, A, R2, E2, Z>(
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): <R>(stream: Stream<R, E, A>) => I.IO<R & R2, E2, Z> {
  return (stream) => run_(stream, sink)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, E, A, R2, E2, Z>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): M.Managed<R & R2, E | E2, Z> {
  return Ch.runManaged(Ch.drain(stream.channel['>>>'](sink.channel)))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @dataFirst runManaged_
 */
export function runManaged<E, A, R2, E2, Z>(
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): <R>(stream: Stream<R, E, A>) => M.Managed<R & R2, E | E2, Z> {
  return (stream) => runManaged_(stream, sink)
}

/**
 * Runs the stream and collects all of its elements to a chunk.
 */
export function runCollect<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, C.Chunk<A>> {
  return run_(stream, Sink.collectAll())
}

/**
 * Runs the stream and collects ignore its elements.
 */
export function runDrain<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, void> {
  return run_(stream, Sink.drain())
}

export function runForeachManaged_<R, E, A, R1, E1>(
  sa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(sa, Sink.foreach<R1, E | E1, A>(f))
}

export function runForeachManaged<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(sa: Stream<R, E, A>) => M.Managed<R & R1, E | E1, void> {
  return (sa) => runForeachManaged_(sa, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeach_<R, E, A, R1, E1>(
  sa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): I.IO<R & R1, E | E1, void> {
  return run_(sa, Sink.foreach<R1, E | E1, A>(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeach<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(sa: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (sa) => runForeach_(sa, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeachChunk_<R, E, A, R1, E1>(
  sa: Stream<R, E, A>,
  f: (as: C.Chunk<A>) => I.IO<R1, E1, any>
): I.IO<R & R1, E | E1, void> {
  return run_(sa, Sink.foreachChunk<R1, E | E1, A>(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeachChunk<A, R1, E1>(
  f: (as: C.Chunk<A>) => I.IO<R1, E1, any>
): <R, E>(sa: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (sa) => runForeachChunk_(sa, f)
}

function takeLoop<E, A>(n: number): Ch.Channel<unknown, E, C.Chunk<A>, unknown, E, C.Chunk<A>, unknown> {
  return Ch.readWithCause(
    (i) => {
      const taken = C.take_(i, n)
      const left  = Math.max(n - taken.length, 0)
      if (left > 0) {
        return Ch.chain_(Ch.write(taken), () => takeLoop(left))
      } else {
        return Ch.write(taken)
      }
    },
    Ch.halt,
    Ch.end
  )
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take_<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A> {
  if (n <= 0) {
    return empty
  }
  if (!Number.isInteger(n)) {
    return die(new IllegalArgumentError(`${n} should be an integer`, 'Stream.take'))
  }
  return new Stream(stream.channel['>>>'](takeLoop(n)))
}

/**
 * Takes the specified number of elements from this stream.
 *
 * @dataFirst take_
 */
export function take(n: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => take_(stream, n)
}

/**
 * Interpret the stream as a managed pull
 */
export function toPull<R, E, A>(stream: Stream<R, E, A>): M.Managed<R, never, I.IO<R, O.Option<E>, C.Chunk<A>>> {
  return M.map_(Ch.toPull(stream.channel), (pull) =>
    I.mapError_(pull, (e) => (e._tag === 'Left' ? O.some(e.left) : O.none()))
  )
}

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R0, E0, R, E, A>(stream: I.IO<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return flatten(fromIO(stream))
}

/**
 * Creates a stream produced from a managed
 */
export function unwrapManaged<R0, E0, R, E, A>(stream: M.Managed<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return flatten(fromManaged(stream))
}

/**
 * Submerges the error case of an `Either` into the `ZStream`.
 */
export function subsumeEither<R, E, E2, A>(xs: Stream<R, E, E.Either<E2, A>>): Stream<R, E | E2, A> {
  return mapIO_(xs, (_) => I.fromEitherLazy(() => _))
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync_<R, R1, E extends E1, E1, E2, A extends A1, A1, B>(
  stream: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
): Stream<R & R1 & Has<Clock>, E2, B> {
  return aggregateAsyncWithin_(stream, sink, SC.forever)
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync<R1, E1, E2, A1, B>(sink: SK.Sink<R1, E1, A1, E2, A1, B>) {
  return <R, E extends E1, A extends A1>(stream: Stream<R, E, A>) => aggregateAsync_(stream, sink)
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, R1, R2, E extends E1, E1, E2, A extends A1, A1, B, C>(
  stream: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<Clock>, E2, B> {
  return collect_(
    aggregateAsyncWithinEither_(stream, sink, schedule),
    E.match(
      () => O.none(),
      (v) => O.some(v)
    )
  )
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(stream: Stream<R, E, A>) => aggregateAsyncWithin_(stream, sink, schedule)
}

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither_<R, R1, R2, E extends E1, E1, E2, A extends A1, A1, B, C>(
  stream: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  type HandoffSignal = HO.HandoffSignal<C, E1, A>
  type SinkEndReason = SER.SinkEndReason<C>

  const deps = I.sequenceT(
    HO.make<HandoffSignal>(),
    Ref.make<SinkEndReason>(new SER.SinkEnd()),
    Ref.make(C.empty<A1>()),
    SC.driver(schedule)
  )

  return chain_(fromIO(deps), ([handoff, sinkEndReason, sinkLeftovers, scheduleDriver]) => {
    const handoffProducer: Ch.Channel<unknown, E1, C.Chunk<A>, unknown, never, never, any> = Ch.readWithCause(
      (_in: C.Chunk<A>) => Ch.zipr_(Ch.fromIO(HO.offer(handoff, new HO.Emit(_in))), handoffProducer),
      (cause: Ca.Cause<E1>) => Ch.fromIO(HO.offer(handoff, new HO.Halt(cause))),
      (_: any) => Ch.fromIO(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
    )

    const handoffConsumer: Ch.Channel<unknown, unknown, unknown, unknown, E1, C.Chunk<A1>, void> = Ch.unwrap(
      I.chain_(Ref.getAndSet_(sinkLeftovers, C.empty<A1>()), (leftovers) => {
        if (C.isEmpty(leftovers)) {
          return I.succeed(Ch.zipr_(Ch.write(leftovers), handoffConsumer))
        } else {
          return I.map_(HO.take(handoff), (_) => {
            switch (_._typeId) {
              case HO.EmitTypeId:
                return Ch.zipr_(Ch.write(_.els), handoffConsumer)
              case HO.HaltTypeId:
                return Ch.halt(_.error)
              case HO.EndTypeId:
                return Ch.fromIO(Ref.set_(sinkEndReason, _.reason))
            }
          })
        }
      })
    )

    const scheduledAggregator = (
      lastB: O.Option<B>
    ): Ch.Channel<R1 & R2 & Has<Clock>, unknown, unknown, unknown, E2, C.Chunk<E.Either<C, B>>, any> => {
      const timeout = I.matchCauseIO_(
        scheduleDriver.next(lastB),
        (_) =>
          E.match_(
            Ca.failureOrCause(_),
            (_) => HO.offer(handoff, new HO.End(new SER.ScheduleTimeout())),
            (cause) => HO.offer(handoff, new HO.Halt(cause))
          ),
        (c) => HO.offer(handoff, new HO.End(new SER.ScheduleEnd(c)))
      )

      return pipe(
        Ch.managed_(I.forkManaged(timeout), (fiber) => {
          return Ch.chain_(Ch.doneCollect(handoffConsumer['>>>'](sink.channel)), ([leftovers, b]) => {
            return Ch.zipr_(
              Ch.fromIO(I.crossSecond_(F.interrupt(fiber), Ref.set_(sinkLeftovers, C.flatten(leftovers)))),
              Ch.unwrap(
                Ref.modify_(sinkEndReason, (reason) => {
                  switch (reason._typeId) {
                    case SER.ScheduleEndTypeId:
                      return tuple(
                        Ch.as_(Ch.write(C.from([E.right(b), E.left(reason.c)])), O.some(b)),
                        new SER.SinkEnd()
                      )
                    case SER.ScheduleTimeoutTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.some(b)), new SER.SinkEnd())
                    case SER.SinkEndTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.some(b)), new SER.SinkEnd())
                    case SER.UpstreamEndTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.none()), new SER.UpstreamEnd())
                  }
                })
              )
            )
          })
        }),
        Ch.chain((_) => {
          if (O.isNone(_)) {
            return Ch.unit()
          } else {
            return scheduledAggregator(_)
          }
        })
      )
    }

    return zipSecond_(
      fromManaged(pipe(stream.channel['>>>'](handoffProducer), Ch.runManaged, M.fork)),
      new Stream(scheduledAggregator(O.none()))
    )
  })
}

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(stream: Stream<R, E, A>) => aggregateAsyncWithinEither_(stream, sink, schedule)
}

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `bufferSize` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function chainPar_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => Stream<R1, E1, B>,
  n: number,
  bufferSize = 16
): Stream<R & R1, E | E1, B> {
  return new Stream(
    pipe(
      ma.channel,
      Ch.concatMap(Ch.writeChunk),
      Ch.mergeMap((a) => f(a).channel, n, bufferSize)
    )
  )
}

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `bufferSize` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function chainPar<A, R1, E1, B>(
  f: (a: A) => Stream<R1, E1, B>,
  n: number,
  bufferSize = 16
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => chainPar_(ma, f, n, bufferSize)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast_<R, E, A>(
  stream: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, C.Chunk<Stream<unknown, E, A>>> {
  return pipe(stream, broadcastedQueues(n, maximumLag), M.map(C.map(flow(fromQueueWithShutdown(), flattenTake))))
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, C.Chunk<Stream<unknown, E, A>>> {
  return (stream) => broadcast_(stream, n, maximumLag)
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, A>(
  stream: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, Stream<unknown, E, A>> {
  return M.map_(broadcastedQueuesDynamic_(stream, maximumLag), (_) =>
    pipe(fromManaged(_), chain(fromQueue()), flattenTake)
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, A>(stream: Stream<R, E, A>) => broadcastDynamic_(stream, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, A>(
  stream: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, C.Chunk<H.HubDequeue<unknown, never, Take.Take<E, A>>>> {
  return M.gen(function* (_) {
    const hub    = yield* _(H.makeBounded<Take.Take<E, A>>(maximumLag))
    const queues = yield* _(M.collectAll(C.fill(n, () => H.subscribe(hub))))
    yield* _(M.fork(runIntoHubManaged_(stream, hub)))
    return queues
  })
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues(n: number, maximumLag: number) {
  return <R, E, A>(stream: Stream<R, E, A>) => broadcastedQueues_(stream, n, maximumLag)
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  stream: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, M.Managed<unknown, never, H.HubDequeue<unknown, never, Take.Take<E, A>>>> {
  return M.map_(toHub_(stream, maximumLag), (_) => H.subscribe(_))
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic(maximumLag: number) {
  return <R, E, A>(stream: Stream<R, E, A>) => broadcastedQueuesDynamic_(stream, maximumLag)
}

export function bufferChunks_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = toQueue_(stream, capacity)
  return new Stream(
    Ch.managed_(queue, (queue) => {
      const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = pipe(
        Ch.fromIO(Q.take(queue)),
        Ch.chain((take: Take.Take<E, A>) =>
          Take.fold_(take, Ch.end(undefined), Ch.halt, (value) => Ch.zipr_(Ch.write(value), process))
        )
      )
      return process
    })
  )
}

export function bufferChunks(capacty: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => bufferChunks_(stream, capacty)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a queue.
 */
export function buffer_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = toQueueOfElements_(stream, capacity)
  return new Stream(
    Ch.managed_(queue, (queue) => {
      const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = pipe(
        Ch.fromIO(Q.take(queue)),
        Ch.chain((exit: Ex.Exit<O.Option<E>, A>) =>
          Ex.match_(
            exit,
            flow(
              Ca.flipCauseOption,
              O.match(() => Ch.end(undefined), Ch.halt)
            ),
            (value) => Ch.zipr_(Ch.write(C.single(value)), process)
          )
        )
      )
      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function buffer(capacity: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => buffer_(stream, capacity)
}

export function bufferDropping_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = M.bracket_(Q.makeDropping<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>(capacity), Q.shutdown)
  return new Stream(bufferSignal(queue, chunkN_(stream, 1).channel))
}

export function bufferDropping(capacity: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => bufferDropping_(stream, capacity)
}

export function bufferSliding_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = M.bracket_(Q.makeSliding<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>(capacity), Q.shutdown)
  return new Stream(bufferSignal(queue, chunkN_(stream, 1).channel))
}

export function bufferSliding(capacity: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => bufferSliding_(stream, capacity)
}

export function bufferChunksDropping_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = M.bracket_(Q.makeDropping<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>(capacity), Q.shutdown)
  return new Stream(bufferSignal(queue, stream.channel))
}

export function bufferChunksDropping(capacity: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => bufferChunksDropping_(stream, capacity)
}

export function bufferChunksSliding_<R, E, A>(stream: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = M.bracket_(Q.makeSliding<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>(capacity), Q.shutdown)
  return new Stream(bufferSignal(queue, stream.channel))
}

export function bufferChunksSliding(capacity: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => bufferSliding_(stream, capacity)
}

function bufferSignalProducer<R, E, A>(
  queue: Q.UQueue<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>,
  ref: Ref.URef<Pr.Promise<never, void>>
): Ch.Channel<R, E, C.Chunk<A>, unknown, never, never, unknown> {
  const terminate = (take: Take.Take<E, A>): Ch.Channel<R, E, C.Chunk<A>, unknown, never, never, unknown> =>
    Ch.fromIO(
      I.gen(function* (_) {
        const latch = yield* _(ref.get)
        yield* _(Pr.await(latch))
        const p = yield* _(Pr.make<never, void>())
        yield* _(Q.offer_(queue, tuple(take, p)))
        yield* _(ref.set(p))
        yield* _(Pr.await(p))
      })
    )
  return Ch.readWith(
    (inp) =>
      Ch.zipr_(
        Ch.fromIO(
          I.gen(function* (_) {
            const p     = yield* _(Pr.make<never, void>())
            const added = yield* _(Q.offer_(queue, tuple(Take.chunk(inp), p)))
            yield* _(I.when_(ref.set(p), () => added))
          })
        ),
        bufferSignalProducer(queue, ref)
      ),
    flow(Take.fail, terminate),
    () => terminate(Take.end)
  )
}

function bufferSignalConsumer<R, E, A>(
  queue: Q.UQueue<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>
): Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, void> {
  const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = Ch.fromIO(Q.take(queue))['>>='](
    ([take, promise]) =>
      Ch.zipr_(
        Ch.fromIO(Pr.succeed_(promise, undefined)),
        Take.fold_(take, Ch.end(undefined), Ch.halt, (value) => Ch.write(value)['*>'](process))
      )
  )
  return process
}

function bufferSignal<R, E, A>(
  managed: M.UManaged<Q.UQueue<readonly [Take.Take<E, A>, Pr.Promise<never, void>]>>,
  channel: Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, unknown>
): Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, void> {
  return Ch.managed_(
    M.gen(function* (_) {
      const queue = yield* _(managed)
      const start = yield* _(Pr.make<never, void>())
      yield* _(Pr.succeed_(start, undefined))
      const ref = yield* _(Ref.make(start))
      yield* _(pipe(channel, Ch.pipeTo(bufferSignalProducer(queue, ref)), Ch.runManaged, M.fork))
      return queue
    }),
    bufferSignalConsumer
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> {
  const queue = toQueueUnbounded(stream)

  return new Stream(
    Ch.managed_(queue, (queue) => {
      const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = Ch.chain_(
        Ch.fromIO(Q.take(queue)),
        Take.fold(
          Ch.end(undefined),
          (error) => Ch.halt(error),
          (value) => Ch.zipr_(Ch.write(value), process)
        )
      )

      return process
    })
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  return catchAllCause_(stream, (_) => E.match_(Ca.failureOrCause(_), f, (_) => halt(_)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<R1, E, E1, A1>(f: (e: E) => Stream<R1, E1, A1>) {
  return <R, A>(stream: Stream<R, E, A>) => catchAll_(stream, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  f: (cause: Ca.Cause<E>) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  const channel: Ch.Channel<R & R1, unknown, unknown, unknown, E1, C.Chunk<A | A1>, unknown> = Ch.catchAllCause_(
    stream.channel,
    (_) => f(_).channel
  )

  return new Stream(channel)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause<R1, E, E1, A1>(f: (cause: Ca.Cause<E>) => Stream<R1, E1, A1>) {
  return <R, A>(stream: Stream<R, E, A>) => catchAllCause_(stream, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  pf: (e: E) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAll_(stream, (e) =>
    O.match_(
      pf(e),
      () => fail<E | E1>(e),
      (_) => _
    )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<R1, E, E1, A1>(pf: (e: E) => O.Option<Stream<R1, E1, A1>>) {
  return <R, A>(stream: Stream<R, E, A>) => catchSome_(stream, pf)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  pf: (e: Ca.Cause<E>) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAllCause_(
    stream,
    (e): Stream<R1, E | E1, A1> =>
      O.match_(
        pf(e),
        () => halt(e),
        (_) => _
      )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<R1, E, E1, A1>(pf: (e: Ca.Cause<E>) => O.Option<Stream<R1, E1, A1>>) {
  return <R, A>(stream: Stream<R, E, A>) => catchSomeCause_(stream, pf)
}

class Rechunker<A> {
  private builder = C.builder<A>()
  private pos     = 0

  constructor(readonly n: number) {}

  /* eslint-disable functional/immutable-data */
  write(elem: A) {
    this.builder.append(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = this.builder.result()

      this.builder = C.builder()
      this.pos     = 0

      return result
    }

    return null
  }

  emitOfNotEmpty() {
    if (this.pos !== 0) {
      return Ch.write(this.builder.result())
    } else {
      return Ch.unit()
    }
  }
  /* eslint-enable */
}

function changesWithWriter<R, E, A>(
  f: (x: A, y: A) => boolean,
  last: O.Option<A>
): Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, void> {
  return Ch.readWithCause(
    (chunk: C.Chunk<A>) => {
      const [newLast, newChunk] = C.foldl_(chunk, [last, C.empty<A>()], ([maybeLast, os], o1) =>
        O.match_(
          maybeLast,
          () => [O.some(o1), os[':+'](o1)],
          (o) => (f(o, o1) ? [O.some(o1), os] : [O.some(o1), os[':+'](o1)])
        )
      )
      return Ch.write(newChunk)['*>'](changesWithWriter(f, newLast))
    },
    Ch.halt,
    () => Ch.unit()
  )
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 */
export function changesWith_<R, E, A>(stream: Stream<R, E, A>, f: (x: A, y: A) => boolean): Stream<R, E, A> {
  return new Stream(stream.channel['>>>'](changesWithWriter<R, E, A>(f, O.none())))
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 */
export function changesWith<A>(f: (x: A, y: A) => boolean): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => changesWith_(stream, f)
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the provided `Eq` instance to determine whether two
 * elements are equal.
 */
export function changes<A>(E: P.Eq<A>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => changesWith_(stream, E.equals_)
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return unwrap(
    I.succeedLazy(() => {
      const rechunker                                                           = new Rechunker<A>(n)
      const process: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, void> = Ch.readWithCause(
        (chunk) => {
          const chunkSize = chunk.length

          if (chunkSize > 0) {
            let chunks                    = L.empty<C.Chunk<A>>()
            let result: C.Chunk<A> | null = null
            let i                         = 0

            while (i < chunkSize) {
              while (i < chunkSize && result === null) {
                result = rechunker.write(C.unsafeGet_(chunk, i))
                i     += 1
              }

              if (result !== null) {
                chunks = L.prepend_(chunks, result)
                result = null
              }
            }

            return Ch.zipr_(Ch.writeAll(...L.toArray(L.reverse(chunks))), process)
          }

          return process
        },
        (cause) => Ch.zipr_(rechunker.emitOfNotEmpty(), Ch.halt(cause)),
        (_) => rechunker.emitOfNotEmpty()
      )

      return new Stream(stream.channel['>>>'](process))
    })
  )
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number) {
  return <R, E, A>(stream: Stream<R, E, A>) => chunkN_(stream, n)
}

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of elements
 */
export function chunks<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, C.Chunk<A>> {
  return mapChunks_(stream, C.single)
}

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => O.Option<B>): Stream<R, E, B> {
  return mapChunks_(stream, C.filterMap(f))
}

/**
 * Performs a filter and map in a single step.
 */
export function collect<A, B>(f: (a: A) => O.Option<B>) {
  return <R, E>(stream: Stream<R, E, A>) => collect_(stream, f)
}

/**
 * Filters any `Right` values.
 */
export function collectLeft<R, E, L1, A>(stream: Stream<R, E, E.Either<L1, A>>): Stream<R, E, L1> {
  return collect_(
    stream,
    E.match(
      (a) => O.some(a),
      (_) => O.none()
    )
  )
}

/**
 * Filters any `Left` values.
 */
export function collectRight<R, E, A, R1>(stream: Stream<R, E, E.Either<A, R1>>): Stream<R, E, R1> {
  return collect_(
    stream,
    E.match(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Filters any `None` values.
 */
export function collectSome<R, E, A>(stream: Stream<R, E, O.Option<A>>): Stream<R, E, A> {
  return collect_(stream, (a) => a)
}

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, A, L1>(stream: Stream<R, E, Ex.Exit<L1, A>>) {
  return collect_(
    stream,
    Ex.match(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectIO_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  pf: (a: A) => O.Option<I.IO<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunksElements_(stream, (a, emit) =>
    O.match_(
      pf(a),
      () => I.unit(),
      (_) => I.asUnit(I.chain_(_, emit))
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectIO<R1, E1, A, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>) {
  return <R, E>(stream: Stream<R, E, A>) => collectIO_(stream, pf)
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, A, A1>(stream: Stream<R, E, A>, pf: (a: A) => O.Option<A1>): Stream<R, E, A1> {
  const loop: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A1>, any> = Ch.readWith(
    (_in) => {
      const mapped = C.collectWhile_(_in, pf)

      if (mapped.length === _in.length) {
        return Ch.zipr_(Ch.write(mapped), loop)
      } else {
        return Ch.write(mapped)
      }
    },
    Ch.fail,
    Ch.succeed
  )

  return new Stream(stream.channel['>>>'](loop))
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile<A, A1>(pf: (a: A) => O.Option<A1>) {
  return <R, E>(stream: Stream<R, E, A>) => collectWhile_(stream, pf)
}

/**
 * Terminates the stream when encountering the first `Right`.
 */
export function collectWhileLeft<R, E, A1, L1>(stream: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, L1> {
  return collectWhile_(
    stream,
    E.match(
      (l) => O.some(l),
      (_) => O.none()
    )
  )
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileIO_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  pf: (a: A) => O.Option<I.IO<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunks_(stream, (chunk, emit) => {
    const pfSome = (a: A) =>
      O.match_(
        pf(a),
        () => I.succeed(false),
        (_) => I.as_(I.chain_(_, emit), true)
      )

    const loop = (chunk: C.Chunk<A>): I.IO<R1, E1, boolean> => {
      if (C.isEmpty(chunk)) {
        return I.succeed(true)
      } else {
        return I.chain_(pfSome(C.unsafeHead(chunk)), (cont) => {
          if (cont) {
            return loop(C.unsafeTail(chunk))
          } else {
            return I.succeed(false)
          }
        })
      }
    }

    return loop(chunk)
  })
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileIO<R1, E1, A, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>) {
  return <R, E>(stream: Stream<R, E, A>) => collectWhileIO_(stream, pf)
}

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, A1>(stream: Stream<R, E, O.Option<A1>>): Stream<R, E, A1> {
  return collectWhile_(stream, identity)
}

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, A1, L1>(stream: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, A1> {
  return collectWhile_(
    stream,
    E.match(
      () => O.none(),
      (r) => O.some(r)
    )
  )
}

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, A1, L1>(stream: Stream<R, E, Ex.Exit<L1, A1>>): Stream<R, E, A1> {
  return collectWhile_(
    stream,
    Ex.match(
      () => O.none(),
      (r) => O.some(r)
    )
  )
}

function combineProducer<Err, Elem>(
  handoff: HO.Handoff<Ex.Exit<O.Option<Err>, Elem>>,
  latch: HO.Handoff<void>
): Ch.Channel<unknown, Err, Elem, unknown, never, never, any> {
  return Ch.fromIO(HO.take(latch))['*>'](
    Ch.readWithCause(
      (value) => Ch.fromIO(HO.offer(handoff, Ex.succeed(value)))['*>'](combineProducer(handoff, latch)),
      (cause) => Ch.fromIO(HO.offer(handoff, Ex.halt(Ca.map_(cause, O.some)))),
      () => Ch.fromIO(HO.offer(handoff, Ex.fail(O.none())))['*>'](combineProducer(handoff, latch))
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 */
export function combine<R, E, A, R1, E1, A1, S, R2, A2>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    eff1: I.IO<R, O.Option<E>, A>,
    eff2: I.IO<R1, O.Option<E1>, A1>
  ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [A2, S]>>
): Stream<R & R1 & R2, E | E1, A2> {
  return new Stream(
    Ch.managed_(
      M.gen(function* (_) {
        const left   = yield* _(HO.make<Ex.Exit<O.Option<E>, A>>())
        const right  = yield* _(HO.make<Ex.Exit<O.Option<E1>, A1>>())
        const latchL = yield* _(HO.make<void>())
        const latchR = yield* _(HO.make<void>())
        yield* _(
          pipe(
            stream.channel,
            Ch.concatMap(Ch.writeChunk),
            Ch.pipeTo(combineProducer(left, latchL)),
            Ch.runManaged,
            M.fork
          )
        )
        yield* _(
          pipe(
            that.channel,
            Ch.concatMap(Ch.writeChunk),
            Ch.pipeTo(combineProducer(right, latchR)),
            Ch.runManaged,
            M.fork
          )
        )
        return tuple(left, right, latchL, latchR)
      }),
      ([left, right, latchL, latchR]) => {
        const pullLeft  = HO.offer(latchL, undefined)['*>'](HO.take(left))['>>='](I.done)
        const pullRight = HO.offer(latchR, undefined)['*>'](HO.take(right))['>>='](I.done)
        return unfoldIO(s, (s) => f(s, pullLeft, pullRight)['>>='](flow(I.done, I.optional))).channel
      }
    )
  )
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return new Stream<R & R1, E | E1, A | A1>(Ch.zipr_(stream.channel, that.channel))
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(stream: Stream<R, E, A>) => concat_(stream, that)
}

export function debounce_<R, E, A>(stream: Stream<R, E, A>, duration: number): Stream<R & Has<Clock>, E, A> {
  return unwrap(
    I.gen(function* (_) {
      const scope   = yield* _(I.forkScope)
      const handoff = yield* _(HO.make<HO.HandoffSignal<void, E, A>>())
      function enqueue(last: C.Chunk<A>) {
        return pipe(
          Clock.sleep(duration),
          I.as(last),
          I.forkIn(scope),
          I.map((f) => consumer(new DS.Previous(f)))
        )
      }
      const producer: Ch.Channel<R & Has<Clock>, E, C.Chunk<A>, unknown, E, never, unknown> = Ch.readWithCause(
        (inp: C.Chunk<A>) =>
          pipe(
            C.last(inp),
            O.match(
              () => producer,
              (last) => Ch.fromIO(HO.offer(handoff, new HO.Emit(C.single(last))))['*>'](producer)
            )
          ),
        (cause: Ca.Cause<E>) => Ch.fromIO(HO.offer(handoff, new HO.Halt(cause))),
        () => Ch.fromIO(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
      )
      function consumer(
        state: DS.DebounceState<E, A>
      ): Ch.Channel<R & Has<Clock>, unknown, unknown, unknown, E, C.Chunk<A>, unknown> {
        return Ch.unwrap(
          DS.match_(state, {
            NotStarted: () =>
              HO.take(handoff)['<$>'](
                HO.matchSignal({
                  Emit: ({ els }) => Ch.unwrap(enqueue(els)),
                  Halt: ({ error }) => Ch.halt(error),
                  End: () => Ch.unit()
                })
              ),
            Current: ({ fiber }) =>
              F.join(fiber)['<$>'](
                HO.matchSignal({
                  Emit: ({ els }) => Ch.unwrap(enqueue(els)),
                  Halt: ({ error }) => Ch.halt(error),
                  End: () => Ch.unit()
                })
              ),
            Previous: ({ fiber }) =>
              I.raceWith_(
                F.join(fiber),
                HO.take(handoff),
                (ex, current) =>
                  Ex.match_(
                    ex,
                    (cause) => F.interrupt(current)['$>'](Ch.halt(cause)),
                    (chunk) => I.succeed(Ch.write(chunk)['*>'](consumer(new DS.Current(current))))
                  ),
                (ex, previous) =>
                  Ex.match_(
                    ex,
                    (cause) => F.interrupt(previous)['$>'](Ch.halt(cause)),
                    HO.matchSignal({
                      Emit: ({ els }) => F.interrupt(previous)['*>'](enqueue(els)),
                      Halt: ({ error }) => F.interrupt(previous)['$>'](Ch.halt(error)),
                      End: () => F.join(previous)['<$>']((chunk) => Ch.write(chunk)['*>'](Ch.unit()))
                    })
                  )
              )
          })
        )
      }
      return fromManaged(pipe(stream.channel, Ch.pipeTo(producer), Ch.runManaged, M.fork))['*>'](
        new Stream(consumer(new DS.NotStarted()))
      )
    })
  )
}

/**
 * More powerful version of `ZStream#distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, A>(
  ma: Stream<R, E, A>,
  maximumLag: number,
  decide: (o: A) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): M.Managed<R, never, I.UIO<readonly [symbol, Q.Dequeue<Ex.Exit<O.Option<E>, A>>]>> {
  const offer = (queuesRef: Ref.URef<HM.HashMap<symbol, Q.UQueue<Ex.Exit<O.Option<E>, A>>>>) => (a: A) =>
    I.gen(function* (_) {
      const shouldProcess = yield* _(decide(a))
      const queues        = yield* _(queuesRef.get)
      return yield* _(
        pipe(
          queues,
          I.foldl(C.empty<symbol>(), (b, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                Q.offer_(queue, Ex.succeed(a)),
                I.matchCauseIO(
                  (c) => (Ca.interrupted(c) ? I.succeed(C.append(id)(b)) : I.halt(c)),
                  () => I.succeed(b)
                )
              )
            } else {
              return I.succeed(b)
            }
          }),
          I.chain((ids) => (C.isNonEmpty(ids) ? Ref.update_(queuesRef, HM.removeMany(ids)) : I.unit()))
        )
      )
    })

  return M.gen(function* (_) {
    const queuesRef = yield* _(
      M.bracket_(
        Ref.make<HM.HashMap<symbol, Q.UQueue<Ex.Exit<O.Option<E>, A>>>>(HM.makeDefault()),
        flow(
          Ref.get,
          I.chain((qs) => I.foreach_(HM.values(qs), Q.shutdown))
        )
      )
    )

    const add = yield* _(
      M.gen(function* (_) {
        const queuesLock = yield* _(Sem.make(1))
        const newQueue   = yield* _(
          Ref.make<I.UIO<readonly [symbol, Q.UQueue<Ex.Exit<O.Option<E>, A>>]>>(
            I.gen(function* (_) {
              const queue = yield* _(Q.makeBounded<Ex.Exit<O.Option<E>, A>>(maximumLag))
              const id    = yield* _(I.succeedLazy(() => Symbol()))
              yield* _(pipe(queuesRef, Ref.update(HM.set(id, queue))))
              return tuple(id, queue)
            })
          )
        )
        const finalize = (endTake: Ex.Exit<O.Option<E>, never>): I.UIO<void> =>
          Sem.withPermit(queuesLock)(
            pipe(
              I.gen(function* (_) {
                const queue = yield* _(Q.makeBounded<Ex.Exit<O.Option<E>, A>>(1))
                yield* _(Q.offer_(queue, endTake))
                const id = Symbol() as symbol
                yield* _(pipe(queuesRef, Ref.update(HM.set(id, queue))))
                return tuple(id, queue)
              }),
              newQueue.set,
              I.chain(() =>
                I.gen(function* (_) {
                  const queues = yield* _(pipe(queuesRef.get, I.map(HM.values)))
                  yield* _(
                    I.foreach_(queues, (queue) =>
                      pipe(
                        Q.offer_(queue, endTake),
                        I.catchSomeCause((c) => (Ca.interrupted(c) ? O.some(I.unit()) : O.none<I.UIO<void>>()))
                      )
                    )
                  )
                  yield* _(done(endTake))
                })
              ),
              I.asUnit
            )
          )

        yield* _(
          pipe(
            ma,
            runForeachManaged(offer(queuesRef)),
            M.matchCauseManaged(flow(Ca.map(O.some), Ex.halt, finalize, I.toManaged()), () =>
              pipe(O.none(), Ex.fail, finalize, I.toManaged())
            ),
            M.fork
          )
        )
        return Sem.withPermit(queuesLock)(I.flatten(newQueue.get))
      })
    )
    return add
  })
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic<E, A>(
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): <R>(ma: Stream<R, E, A>) => M.Managed<R, never, I.UIO<readonly [symbol, Q.Dequeue<Ex.Exit<O.Option<E>, A>>]>> {
  return (ma) => distributedWithDynamic_(ma, maximumLag, decide, done)
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, A>(
  ma: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: number) => boolean>
): M.Managed<R, never, C.Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return pipe(
    Pr.make<never, (_: A) => I.UIO<(_: symbol) => boolean>>(),
    M.fromIO,
    M.chain((p) =>
      pipe(
        distributedWithDynamic_(
          ma,
          maximumLag,
          (o) => I.chain_(Pr.await(p), (_) => _(o)),
          (_) => I.unit()
        ),
        M.chain((next) =>
          pipe(
            I.collectAll(
              pipe(
                C.range(0, n),
                C.map((id) => I.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            I.chain((entries) => {
              const [mappings, queues] = C.foldr_(
                entries,
                [HM.makeDefault<symbol, number>(), C.empty<Q.Dequeue<Ex.Exit<O.Option<E>, A>>>()] as const,
                ([mapping, queue], [mappings, queues]) => [
                  HM.set_(mappings, mapping[0], mapping[1]),
                  C.append_(queues, queue)
                ]
              )
              return pipe(
                Pr.succeed_(p, (o: A) =>
                  I.map_(decide(o), (f) => (key: symbol) => f(O.toUndefined(HM.get_(mappings, key))!))
                ),
                I.as(queues)
              )
            }),
            M.fromIO
          )
        )
      )
    )
  )
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith<A>(
  n: number,
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: number) => boolean>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R, never, C.Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide)
}

function dropLoop<R, E, A>(r: number): Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, unknown> {
  return Ch.readWith(
    (inp: C.Chunk<A>) => {
      const dropped  = C.drop_(inp, r)
      const leftover = Math.max(0, r - inp.length)
      const more     = C.isEmpty(inp) || leftover > 0
      return more ? dropLoop(leftover) : Ch.write(dropped)['*>'](Ch.id())
    },
    Ch.fail,
    () => Ch.unit()
  )
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return new Stream(stream.channel['>>>'](dropLoop(n)))
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop(n: number): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => drop_(stream, n)
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, A>(stream: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A> {
  const loop: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, unknown> = Ch.readWith(
    (inp: C.Chunk<A>) => {
      const leftover = C.dropWhile_(inp, predicate)
      return C.isEmpty(leftover) ? loop : Ch.write(leftover)['*>'](Ch.id())
    },
    Ch.fail,
    () => Ch.unit()
  )

  return new Stream(stream.channel['>>>'](loop))
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile<A>(predicate: P.Predicate<A>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => dropWhile_(stream, predicate)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, A>(stream: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A> {
  return pipe(stream, dropWhile(not(predicate)), drop(1))
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil<A>(predicate: P.Predicate<A>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => dropUntil_(stream, predicate)
}

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have
 * been exposed as part of the `Either` success case.
 *
 * @note the stream will end as soon as the first error occurs.
 */
export function either<R, E, A>(stream: Stream<R, E, A>): Stream<R, never, E.Either<E, A>> {
  return pipe(stream, map(E.right), catchAll(flow(E.left, succeed)))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 */
export function find_<R, E, A>(stream: Stream<R, E, A>, f: Predicate<A>): Stream<R, E, A> {
  const loop: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, unknown> = Ch.readWith(
    flow(
      C.find(f),
      O.match(() => loop, flow(C.single, Ch.write))
    ),
    Ch.fail,
    () => Ch.unit()
  )
  return new Stream(stream.channel['>>>'](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 */
export function find<A>(f: Predicate<A>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => find_(stream, f)
}

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 */
export function findIO_<R, E, A, R1, E1>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  const loop: Ch.Channel<R & R1, E, C.Chunk<A>, unknown, E | E1, C.Chunk<A>, unknown> = Ch.readWith(
    flow(C.findIO(f), I.map(O.match(() => loop, flow(C.single, Ch.write))), Ch.unwrap),
    Ch.fail,
    () => Ch.unit()
  )
  return new Stream(stream.channel['>>>'](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 */
export function findIO<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, boolean>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (stream) => findIO_(stream, f)
}

export function groupBy_<R, E, A, R1, E1, K, V>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): GroupBy<R & R1, E | E1, K, V> {
  const qstream = unwrapManaged(
    M.gen(function* (_) {
      const decider = yield* _(Pr.make<never, (k: K, v: V) => I.UIO<(_: symbol) => boolean>>())
      const out     = yield* _(
        M.bracket_(
          Q.makeBounded<Ex.Exit<O.Option<E | E1>, readonly [K, Q.Dequeue<Ex.Exit<O.Option<E | E1>, V>>]>>(buffer),
          Q.shutdown
        )
      )
      const ref     = yield* _(Ref.make<HM.HashMap<K, symbol>>(HM.makeDefault()))
      const add     = yield* _(
        pipe(
          stream,
          mapIO(f),
          distributedWithDynamic(
            buffer,
            ([k, v]) => I.chain_(Pr.await(decider), (f) => f(k, v)),
            (_) => Q.offer_(out, _)
          )
        )
      )
      yield* _(
        Pr.succeed_(decider, (k, _) =>
          pipe(
            ref.get,
            I.map(HM.get(k)),
            I.chain(
              O.match(
                () =>
                  pipe(
                    add,
                    I.chain(([idx, q]) =>
                      pipe(
                        Ref.update_(ref, HM.set(k, idx)),
                        I.crossSecond(
                          Q.offer_(
                            out,
                            Ex.succeed([
                              k,
                              Q.map_(
                                q,
                                Ex.map(([, v]) => v)
                              )
                            ] as const)
                          )
                        ),
                        I.as((_) => _ === idx)
                      )
                    )
                  ),
                (idx) => I.succeed((_) => _ === idx)
              )
            )
          )
        )
      )
      return flattenExitOption(fromQueueWithShutdown_(out))
    })
  )
  return new GroupBy(qstream, buffer)
}

export function groupBy<A, R1, E1, K, V>(
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): <R, E>(stream: Stream<R, E, A>) => GroupBy<R & R1, E | E1, K, V> {
  return (stream) => groupBy_(stream, f, buffer)
}

export function groupByKey_<R, E, A, K>(stream: Stream<R, E, A>, f: (a: A) => K, buffer = 16): GroupBy<R, E, K, A> {
  return groupBy_(stream, (a) => I.succeed([f(a), a]), buffer)
}

export function groupByKey<A, K>(f: (a: A) => K, buffer = 16): <R, E>(stream: Stream<R, E, A>) => GroupBy<R, E, K, A> {
  return (stream) => groupByKey_(stream, f, buffer)
}

function haltWhenWriter<E, A, E1>(
  fiber: F.Fiber<E1, any>
): Ch.Channel<unknown, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A>, void> {
  return Ch.unwrap(
    fiber.poll['<$>'](
      O.match(
        () =>
          Ch.readWith(
            (inp: C.Chunk<A>) => Ch.write(inp)['*>'](haltWhenWriter(fiber)),
            Ch.fail,
            () => Ch.unit()
          ),
        Ex.match(Ch.halt, () => Ch.unit())
      )
    )
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen_<R, E, A, R1, E1>(stream: Stream<R, E, A>, io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A> {
  return new Stream(Ch.unwrapManaged(I.forkManaged(io)['<$>']((fiber) => stream.channel['>>>'](haltWhenWriter(fiber)))))
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen<R1, E1>(
  io: I.IO<R1, E1, any>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (stream) => haltWhen_(stream, io)
}

export function interleave_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R & R1, E | E1, A | B> {
  return interleaveWith_(sa, sb, pipe(C.make(true, false), fromChunk, forever))
}

export function interleave<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E | E1, A | B> {
  return (sa) => interleave_(sa, sb)
}

function interleaveWithProducer<R, E, A>(
  handoff: HO.Handoff<Take.Take<E, A>>
): Ch.Channel<R, E, A, unknown, never, never, void> {
  return Ch.readWithCause(
    (value: A) => Ch.fromIO(HO.offer(handoff, Take.single(value)))['*>'](interleaveWithProducer(handoff)),
    (cause) => Ch.fromIO(HO.offer(handoff, Take.halt(cause))),
    () => Ch.fromIO(HO.offer(handoff, Take.end))
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith_<R, E, A, R1, E1, B, R2, E2>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>,
  b: Stream<R2, E2, boolean>
): Stream<R & R1 & R2, E | E1 | E2, A | B> {
  return new Stream(
    Ch.managed_(
      M.gen(function* (_) {
        const left  = yield* _(HO.make<Take.Take<E, A>>())
        const right = yield* _(HO.make<Take.Take<E1, B>>())
        yield* _(
          pipe(sa.channel, Ch.concatMap(Ch.writeChunk), Ch.pipeTo(interleaveWithProducer(left)), Ch.runManaged, M.fork)
        )
        yield* _(
          pipe(sb.channel, Ch.concatMap(Ch.writeChunk), Ch.pipeTo(interleaveWithProducer(right)), Ch.runManaged, M.fork)
        )
        return tuple(left, right)
      }),
      ([left, right]) => {
        const process = (
          leftDone: boolean,
          rightDone: boolean
        ): Ch.Channel<R & R1 & R2, E | E1 | E2, boolean, unknown, E | E1 | E2, C.Chunk<A | B>, void> =>
          Ch.readWithCause(
            (b: boolean) => {
              if (b && leftDone) {
                return Ch.fromIO(HO.take(left))['>>='](
                  Take.fold(
                    rightDone ? Ch.unit() : process(true, rightDone),
                    (cause) => Ch.halt(cause),
                    (chunk) => Ch.write(chunk)['*>'](process(leftDone, rightDone))
                  )
                )
              }
              if (!b && !rightDone) {
                return Ch.fromIO(HO.take(right))['>>='](
                  Take.fold(
                    leftDone ? Ch.unit() : process(leftDone, true),
                    (cause) => Ch.halt(cause),
                    (chunk) => Ch.write(chunk)['*>'](process(leftDone, rightDone))
                  )
                )
              }
              return process(leftDone, rightDone)
            },
            Ch.halt,
            () => Ch.unit()
          )
        return pipe(b.channel, Ch.concatMap(Ch.writeChunk), Ch.pipeTo(process(false, false)))
      }
    )
  )
}

export function interleaveWith<R1, E1, B, R2, E2>(
  sb: Stream<R1, E1, B>,
  b: Stream<R2, E2, boolean>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1 & R2, E | E1 | E2, A | B> {
  return (sa) => interleaveWith_(sa, sb, b)
}

function intersperseWriter<R, E, A, A1>(
  middle: A1,
  isFirst: boolean
): Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A | A1>, void> {
  return Ch.readWith(
    (inp: C.Chunk<A>) => {
      const builder  = C.builder<A | A1>()
      let flagResult = isFirst
      C.foreach_(inp, (a) => {
        if (flagResult) {
          flagResult = false
          builder.append(a)
        } else {
          builder.append(middle)
          builder.append(a)
        }
      })
      return Ch.write(builder.result())['*>'](intersperseWriter(middle, flagResult))
    },
    Ch.fail,
    () => Ch.unit()
  )
}

/**
 * Intersperse stream with provided element
 */
export function intersperse_<R, E, A, A1>(stream: Stream<R, E, A>, middle: A1): Stream<R, E, A | A1> {
  return new Stream(stream.channel['>>>'](intersperseWriter(middle, true)))
}

/**
 * Intersperse stream with provided element
 */
export function intersperse<A1>(middle: A1): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A | A1> {
  return (stream) => intersperse_(stream, middle)
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen_<R, E, A, R1, E1>(
  stream: Stream<R, E, A>,
  io: I.IO<R1, E1, any>
): Stream<R & R1, E | E1, A> {
  return new Stream(Ch.interruptWhen_(stream.channel, io))
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen<R1, E1>(
  io: I.IO<R1, E1, any>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (stream) => interruptWhen_(stream, io)
}

function mapAccumAccumulator<S, E = never, A = never, B = never>(
  currS: S,
  f: (s: S, a: A) => readonly [B, S]
): Ch.Channel<unknown, E, C.Chunk<A>, unknown, E, C.Chunk<B>, void> {
  return Ch.readWith(
    (inp: C.Chunk<A>) => {
      const [bs, nextS] = C.mapAccum_(inp, currS, f)
      return Ch.write(bs)['*>'](mapAccumAccumulator(nextS, f))
    },
    Ch.fail,
    () => Ch.unit()
  )
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, A, S, B>(
  stream: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => readonly [B, S]
): Stream<R, E, B> {
  return new Stream(stream.channel['>>>'](mapAccumAccumulator(s, f)))
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum<A, S, B>(
  s: S,
  f: (s: S, a: A) => readonly [B, S]
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => mapAccum_(stream, s, f)
}

function mapAccumIOAccumulator<R, E, A, R1, E1, S, B>(
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, readonly [B, S]>
): Ch.Channel<R & R1, E, C.Chunk<A>, unknown, E | E1, C.Chunk<B>, void> {
  return Ch.readWith(
    (inp: C.Chunk<A>) =>
      Ch.unwrap(
        I.defer(() => {
          const outputChunk = C.builder<B>()
          const emit        = (b: B) =>
            I.succeedLazy(() => {
              outputChunk.append(b)
            })
          return pipe(
            inp,
            I.foldl(s, (s1, a) =>
              pipe(
                f(s1, a),
                I.chain(([b, s2]) => emit(b)['$>'](s2))
              )
            ),
            I.match(
              (failure) => {
                const partialResult = outputChunk.result()
                return C.isNonEmpty(partialResult) ? Ch.write(partialResult)['*>'](Ch.fail(failure)) : Ch.fail(failure)
              },
              (s) => Ch.write(outputChunk.result())['*>'](mapAccumIOAccumulator(s, f))
            )
          )
        })
      ),
    Ch.fail,
    () => Ch.unit()
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumIO_<R, E, A, R1, E1, S, B>(
  stream: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, readonly [B, S]>
): Stream<R & R1, E | E1, B> {
  return new Stream(stream.channel['>>>'](mapAccumIOAccumulator(s, f)))
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumIO<A, S, R1, E1, B>(
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, readonly [B, S]>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapAccumIO_(stream, s, f)
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => C.Chunk<B>): Stream<R, E, B> {
  return mapChunks_(stream, C.chain(f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk<A, B>(f: (a: A) => C.Chunk<B>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => mapConcatChunk_(stream, f)
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => Iterable<B>): Stream<R, E, B> {
  return mapConcatChunk_(stream, (a) => C.from(f(a)))
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat<A, B>(f: (a: A) => Iterable<B>): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => mapConcat_(stream, f)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkIO_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, C.Chunk<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(stream, mapIO(f), mapConcatChunk(identity))
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkIO<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, C.Chunk<B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapConcatChunkIO_(stream, f)
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatIO_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(stream, mapIO(flow(f, I.map(C.from))), mapConcatChunk(identity))
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatIO<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapConcatIO_(stream, f)
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, A, E1>(
  fa: Stream<R, E, A>,
  f: (e: Ca.Cause<E>) => Ca.Cause<E1>
): Stream<R, E1, A> {
  return new Stream(Ch.mapErrorCause_(fa.channel, f))
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause<E, E1>(
  f: (e: Ca.Cause<E>) => Ca.Cause<E1>
): <R, A>(fa: Stream<R, E, A>) => Stream<R, E1, A> {
  return (fa) => mapErrorCause_(fa, f)
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use chunkN afterwards.
 */
export function mapIOPar_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  n: number,
  f: (a: A) => I.IO<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return new Stream(pipe(stream.channel, Ch.concatMap(Ch.writeChunk), Ch.mapOutIOPar(n, f), Ch.mapOut(C.single)))
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use chunkN afterwards.
 */
export function mapIOPar<A, R1, E1, B>(
  n: number,
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapIOPar_(stream, n, f)
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order
 * is not enforced by this combinator, and elements may be reordered.
 */
export function mapIOParUnordered_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>,
  n: number,
  bufferSize = 16
): Stream<R & R1, E | E1, B> {
  return chainPar_(stream, flow(f, fromIO), n, bufferSize)
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order
 * is not enforced by this combinator, and elements may be reordered.
 */
export function mapIOParUnordered<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>,
  n: number,
  bufferSize = 16
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (stream) => mapIOParUnordered_(stream, f, n, bufferSize)
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapIOPartitioned_<R, E, A, R1, E1, A1, K>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, A1>,
  keyBy: (a: A) => K,
  buffer = 16
): Stream<R & R1, E | E1, A1> {
  return pipe(
    stream,
    groupByKey(keyBy, buffer),
    GB.merge((_, s) => mapIO_(s, f))
  )
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapIOPartitioned<A, R1, E1, A1, K>(
  f: (a: A) => I.IO<R1, E1, A1>,
  keyBy: (a: A) => K,
  buffer = 16
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, A1> {
  return (stream) => mapIOPartitioned_(stream, f, keyBy, buffer)
}

export function mergeWithHandler<R, E>(
  terminate: boolean
): (exit: Ex.Exit<E, unknown>) => MD.MergeDecision<R, E, unknown, E, unknown> {
  return (exit) => (terminate || !Ex.isSuccess(exit) ? MD.done(I.done(exit)) : MD.await(I.done))
}

export function merge_<R, E, A, R1, E1, A1>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, A1>,
  strategy: TerminationStrategy = 'Both'
): Stream<R & R1, E | E1, A | A1> {
  return mergeWith_(sa, sb, identity, identity, strategy)
}

export function merge<R1, E1, A1>(
  sb: Stream<R1, E1, A1>,
  strategy: TerminationStrategy = 'Both'
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E | E1, A | A1> {
  return (sa) => merge_(sa, sb, strategy)
}

export type TerminationStrategy = 'Left' | 'Right' | 'Both' | 'Either'

export function mergeWith_<R, E, A, R1, E1, A1, B, C>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, A1>,
  l: (a: A) => B,
  r: (b: A1) => C,
  strategy: TerminationStrategy = 'Both'
): Stream<R & R1, E | E1, B | C> {
  return new Stream<R & R1, E | E1, B | C>(
    pipe(
      sa['<$>'](l).channel,
      Ch.mergeWith(
        sb['<$>'](r).channel,
        mergeWithHandler<R & R1, E | E1>(strategy === 'Either' || strategy === 'Left'),
        mergeWithHandler<R & R1, E | E1>(strategy === 'Either' || strategy === 'Right')
      )
    )
  )
}

export function mergeWith<A, R1, E1, A1, B, C>(
  sb: Stream<R1, E1, A1>,
  l: (a: A) => B,
  r: (a: A1) => C,
  strategy: TerminationStrategy = 'Both'
): <R, E>(sa: Stream<R, E, A>) => Stream<R & R1, E | E1, B | C> {
  return (sa) => mergeWith_(sa, sb, l, r, strategy)
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `IO.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError_<R, E, A, R1>(
  stream: Stream<R, E, A>,
  cleanup: (e: Ca.Cause<E>) => I.IO<R1, never, any>
): Stream<R & R1, E, A> {
  return catchAllCause_(stream, (cause) => fromIO(cleanup(cause)['*>'](I.halt(cause))))
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `IO.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError<E, R1>(
  cleanup: (e: Ca.Cause<E>) => I.IO<R1, never, any>
): <R, A>(stream: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (stream) => onError_(stream, cleanup)
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also Stream#catchAll.
 */
export function orElse_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  that: () => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  return new Stream<R & R1, E1, A | A1>(Ch.orElse_(stream.channel, that().channel))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also ZStream#catchAll.
 */
export function orElse<R1, E1, A1>(
  that: () => Stream<R1, E1, A1>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E1, A | A1> {
  return (stream) => orElse_(stream, that)
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also ZStream#catchAll.
 */
export function orElseEither_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  that: () => Stream<R1, E1, A1>
): Stream<R & R1, E1, E.Either<A, A1>> {
  return pipe(
    stream['<$>'](E.left),
    orElse(() => that()['<$>'](E.right))
  )
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also ZStream#catchAll.
 */
export function orElseEither<R1, E1, A1>(
  that: () => Stream<R1, E1, A1>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, E.Either<A, A1>> {
  return (stream) => orElseEither_(stream, that)
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also Stream#catchAll.
 */
export function orElseFail_<R, E, A, E1>(stream: Stream<R, E, A>, e: () => E1): Stream<R, E1, A> {
  return orElse_(stream, () => fail(e()))
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also Stream#catchAll.
 */
export function orElseFail<E1>(e: () => E1): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E1, A> {
  return (stream) => orElseFail_(stream, e)
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also Stream#catchAll.
 */
export function orElseOptional_<R, E, A, R1, E1, A1>(
  stream: Stream<R, O.Option<E>, A>,
  that: () => Stream<R1, O.Option<E1>, A1>
): Stream<R & R1, O.Option<E | E1>, A | A1> {
  return catchAll_(
    stream,
    O.match(
      (): Stream<R & R1, O.Option<E | E1>, A | A1> => that(),
      (e) => fail(O.some(e))
    )
  )
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also Stream#catchAll.
 */
export function orElseOptional<R1, E1, A1>(
  that: () => Stream<R1, O.Option<E1>, A1>
): <R, E, A>(stream: Stream<R, O.Option<E>, A>) => Stream<R & R1, O.Option<E | E1>, A | A1> {
  return (stream) => orElseOptional_(stream, that)
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 */
export function orElseSucceed_<R, E, A, A1>(stream: Stream<R, E, A>, a: () => A1): Stream<R, never, A | A1> {
  return orElse_(stream, () => succeed(a()))
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 */
export function orElseSucceed<A1>(a: () => A1): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, never, A | A1> {
  return (stream) => orElseSucceed_(stream, a)
}

class PeelEmit<A> {
  readonly _tag = 'Emit'
  constructor(readonly els: C.Chunk<A>) {}
}
class PeelHalt<E> {
  readonly _tag = 'Halt'
  constructor(readonly cause: Ca.Cause<E>) {}
}
class PeelEnd {
  readonly _tag = 'End'
}
type PeelSignal<E, A> = PeelEmit<A> | PeelHalt<E> | PeelEnd

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel_<R, E, A extends A1, R1, E1, A1, Z>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R1, E, A, E1, A1, Z>
): M.Managed<R & R1, E1, readonly [Z, Stream<unknown, E | E1, A1>]> {
  return M.gen(function* (_) {
    const p       = yield* _(Pr.make<E1, Z>())
    const handoff = yield* _(HO.make<PeelSignal<E, A1>>())

    const consumer = pipe(
      Sink.exposeLeftover(sink),
      Sink.matchSink(
        (e) => Sink.apr_(Sink.fromIO(Pr.fail_(p, e)), Sink.fail(e)),
        ([z1, leftovers]) => {
          const loop: Ch.Channel<unknown, E, C.Chunk<A1>, unknown, E | E1, C.Chunk<A1>, void> = Ch.readWithCause(
            (inp: C.Chunk<A1>) => Ch.zipr_(Ch.fromIO(HO.offer(handoff, new PeelEmit(inp))), loop),
            (cause) => Ch.zipr_(Ch.fromIO(HO.offer(handoff, new PeelHalt(cause))), Ch.halt(cause)),
            () => Ch.zipr_(Ch.fromIO(HO.offer(handoff, new PeelEnd())), Ch.unit())
          )
          return new Sink.Sink(
            pipe(
              Ch.fromIO(Pr.succeed_(p, z1)),
              Ch.zipr(Ch.fromIO(HO.offer(handoff, new PeelEmit(leftovers)))),
              Ch.zipr(loop)
            )
          )
        }
      )
    )
    const producer: Ch.Channel<unknown, unknown, unknown, unknown, E | E1, C.Chunk<A1>, void> = Ch.unwrap(
      I.map_(HO.take(handoff), (signal) => {
        switch (signal._tag) {
          case 'Emit':
            return Ch.zipr_(Ch.write(signal.els), producer)
          case 'Halt':
            return Ch.halt(signal.cause)
          case 'End':
            return Ch.unit()
        }
      })
    )
    yield* _(M.fork(runManaged_(stream, consumer)))
    const z = yield* _(Pr.await(p))
    return tuple(z, new Stream(producer))
  })
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel<E, A extends A1, R1, E1, A1, Z>(
  sink: Sink.Sink<R1, E, A, E1, A1, Z>
): <R>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1, readonly [Z, Stream<unknown, E | E1, A1>]> {
  return (stream) => peel_(stream, sink)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  stream: Stream<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): Stream<R, E1, A> {
  return new Stream(
    Ch.catchAll_(stream.channel, (e) =>
      pipe(
        pf(e),
        O.match(
          () => Ch.halt(Ca.die(f(e))),
          (e1) => Ch.fail(e1)
        )
      )
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): <R, A>(stream: Stream<R, E, A>) => Stream<R, E1, A> {
  return (stream) => refineOrDieWith_(stream, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, A, E1>(stream: Stream<R, E, A>, pf: (e: E) => O.Option<E1>): Stream<R, E1, A> {
  return refineOrDieWith_(stream, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>): <R, A>(stream: Stream<R, E, A>) => Stream<R, E1, A> {
  return (stream) => refineOrDie_(stream, pf)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeat_<R, E, A, R1, B>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & Has<Clock>, E, A> {
  return pipe(stream, repeatEither(schedule), filterMap(O.getRight))
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeat<R1, B>(
  schedule: SC.Schedule<R1, any, B>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, A> {
  return (stream) => repeat_(stream, schedule)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 */
export function repeatEither_<R, E, A, R1, B>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>> {
  return repeatWith_(stream, schedule, E.right, E.left)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 */
export function repeatEither<R1, B>(
  schedule: SC.Schedule<R1, any, B>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, E.Either<B, A>> {
  return (stream) => repeatEither_(stream, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements_<R, E, A, R1, B>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): Stream<R & R1 & Has<Clock>, E, A> {
  return pipe(stream, repeatElementsEither(schedule), filterMap(O.getRight))
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements<A, R1, B>(
  schedule: SC.Schedule<R1, A, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, A> {
  return (stream) => repeatElements_(stream, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither_<R, E, A, R1, B>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>> {
  return repeatElementsWith_(stream, schedule, E.right, E.left)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither<A, R1, B>(
  schedule: SC.Schedule<R1, A, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, E.Either<B, A>> {
  return (stream) => repeatElementsEither_(stream, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 */
export function repeatElementsWith_<R, E, A, R1, B, C, D>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C,
  g: (b: B) => D
): Stream<R & R1 & Has<Clock>, E, C | D> {
  return new Stream<R & R1 & Has<Clock>, E, C | D>(
    stream.channel['>>>'](
      Ch.unwrap(
        I.gen(function* (_) {
          const driver = yield* _(SC.driver(schedule))
          const feed   = (
            inp: C.Chunk<A>
          ): Ch.Channel<R & R1 & Has<Clock>, E, C.Chunk<A>, unknown, E, C.Chunk<C> | C.Chunk<D>, void> =>
            pipe(
              inp,
              C.head,
              O.match(
                () => loop,
                (a) => Ch.write(C.single(f(a)))['*>'](step(C.drop_(inp, 1), a))
              )
            )
          const step   = (
            inp: C.Chunk<A>,
            a: A
          ): Ch.Channel<R & R1 & Has<Clock>, E, C.Chunk<A>, unknown, E, C.Chunk<C> | C.Chunk<D>, void> => {
            const advance = driver.next(a)['$>'](Ch.write(C.single(f(a)))['*>'](step(inp, a)))
            const reset   = I.gen(function* (_) {
              const b = yield* _(I.orDie(driver.last))
              yield* _(driver.reset)
              return Ch.write(C.single(g(b)))['*>'](feed(inp))
            })
            return Ch.unwrap(I.orElse_(advance, () => reset))
          }

          const loop: Ch.Channel<
            R & R1 & Has<Clock>,
            E,
            C.Chunk<A>,
            unknown,
            E,
            C.Chunk<C> | C.Chunk<D>,
            void
          > = Ch.readWith(feed, Ch.fail, () => Ch.unit())

          return loop
        })
      )
    )
  )
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 */
export function repeatElementsWith<A, R1, B, C, D>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C,
  g: (b: B) => D
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, C | D> {
  return (stream) => repeatElementsWith_(stream, schedule, f, g)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 */
export function repeatWith_<R, E, A, R1, B, C, D>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C,
  g: (b: B) => D
): Stream<R & R1 & Has<Clock>, E, C | D> {
  return unwrap(
    I.gen(function* (_) {
      const driver         = yield* _(SC.driver(schedule))
      const scheduleOutput = pipe(driver.last, I.orDie, I.map(g))
      const process        = stream['<$>'](f).channel

      const loop: Ch.Channel<R & R1 & Has<Clock>, unknown, unknown, unknown, E, C.Chunk<C | D>, void> = pipe(
        driver.next(undefined),
        I.match(
          () => Ch.unit(),
          () => process['*>'](Ch.unwrap(scheduleOutput['<$>']((d) => Ch.write(C.single(d)))))['*>'](loop)
        ),
        Ch.unwrap
      )
      return new Stream(process['*>'](loop))
    })
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 */
export function repeatWith<A, R1, B, C, D>(
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C,
  g: (b: B) => D
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, C | D> {
  return (stream) => repeatWith_(stream, schedule, f, g)
}

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, A, B>(stream: Stream<R, E, E.Either<A, B>>): Stream<R, O.Option<E>, B> {
  return pipe(
    stream,
    mapError(O.some),
    rightOrFail(() => O.none())
  )
}

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail_<R, E, A, B, E1>(stream: Stream<R, E, E.Either<A, B>>, e: () => E1): Stream<R, E | E1, B> {
  return pipe(stream, mapIO(E.match(() => I.fail(e()), I.succeed)))
}

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail<E1>(
  e: () => E1
): <R, E, A, B>(stream: Stream<R, E, E.Either<A, B>>) => Stream<R, E | E1, B> {
  return (stream) => rightOrFail_(stream, e)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function runInto_<R, E extends E1, A, R1, E1>(
  stream: Stream<R, E, A>,
  queue: Q.Queue<R1, never, never, unknown, Take.Take<E1, A>, any>
): I.IO<R & R1, E | E1, void> {
  return pipe(
    stream,
    runIntoManaged(queue),
    M.use(() => I.unit())
  )
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function runInto<R1, E1, A>(
  queue: Q.Queue<R1, never, never, unknown, Take.Take<E1, A>, any>
): <R, E extends E1>(stream: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (stream) => runInto_(stream, queue)
}

/*
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoElementsManaged_<R, E, A, R1, E1>(
  stream: Stream<R, E, A>,
  queue: Q.Queue<R1, unknown, never, never, Ex.Exit<O.Option<E | E1>, A>, unknown>
): M.Managed<R & R1, E | E1, void> {
  const writer: Ch.Channel<R & R1, E, C.Chunk<A>, unknown, never, Ex.Exit<O.Option<E | E1>, A>, unknown> = Ch.readWith(
    (inp: C.Chunk<A>) =>
      Ch.zipr_(
        C.foldl_(
          inp,
          Ch.unit() as Ch.Channel<R1, unknown, unknown, unknown, never, Ex.Exit<O.Option<E | E1>, A>, unknown>,
          (channel, a) => Ch.zipr_(channel, Ch.write(Ex.succeed(a)))
        ),
        writer
      ),
    (err) => Ch.write(Ex.fail(O.some(err))),
    () => Ch.write(Ex.fail(O.none()))
  )
  return pipe(
    stream.channel,
    Ch.pipeTo(writer),
    Ch.mapOutIO((exit) => Q.offer_(queue, exit)),
    Ch.drain,
    Ch.runManaged,
    M.asUnit
  )
}

/*
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoElementsManaged<E, A, R1, E1>(
  queue: Q.Queue<R1, unknown, never, never, Ex.Exit<O.Option<E | E1>, A>, unknown>
): <R>(stream: Stream<R, E, A>) => M.Managed<R & R1, E | E1, void> {
  return (stream) => runIntoElementsManaged_(stream, queue)
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged_<R, R1, E extends E1, E1, A>(
  stream: Stream<R, E, A>,
  hub: H.Hub<R1, never, never, unknown, Take.Take<E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  return runIntoManaged_(stream, H.toQueue(hub))
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged<R1, E1, A>(hub: H.Hub<R1, never, never, unknown, Take.Take<E1, A>, any>) {
  return <R, E extends E1>(stream: Stream<R, E, A>) => runIntoHubManaged_(stream, hub)
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged_<R, R1, E extends E1, E1, A>(
  stream: Stream<R, E, A>,
  queue: Q.Queue<R1, never, never, unknown, Take.Take<E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  const writer: Ch.Channel<R, E, C.Chunk<A>, unknown, E, Take.Take<E | E1, A>, any> = Ch.readWithCause(
    (in_) => Ch.zipr_(Ch.write(Take.chunk(in_)), writer),
    (cause) => Ch.write(Take.halt(cause)),
    (_) => Ch.write(Take.end)
  )

  return pipe(
    stream.channel['>>>'](writer),
    Ch.mapOutIO((_) => Q.offer_(queue, _)),
    Ch.drain,
    Ch.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged<R1, E1, A>(
  queue: Q.Queue<R1, never, never, unknown, Take.Take<E1, A>, any>
): <R, E extends E1>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, void> {
  return (stream) => runIntoManaged_(stream, queue)
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, E, A, R1>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, any>
): Stream<R & R1 & Has<Clock>, E, A> {
  return pipe(scheduleEither_(stream, schedule), filterMap(O.getLeft))
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule<A, R1>(
  schedule: SC.Schedule<R1, A, any>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, A> {
  return (stream) => schedule_(stream, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, E, A, R1, B>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<A, B>> {
  return scheduleWith_(stream, schedule, E.left, E.right)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither<A, R1, B>(
  schedule: SC.Schedule<R1, A, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, E.Either<A, B>> {
  return (stream) => scheduleEither_(stream, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith_<R, E, A, R1, B, C, D>(
  stream: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C,
  g: (b: B) => D
): Stream<R & R1 & Has<Clock>, E, C | D> {
  return unwrap(
    SC.driver(schedule)['<$>']((driver) =>
      loopOnPartialChunksElements_(stream, (a, emit) =>
        pipe(
          driver.next(a),
          I.crossSecond(emit(f(a))),
          I.orElse(() =>
            pipe(
              driver.last,
              I.orDie,
              I.chain((b) => emit(f(a))['*>'](emit(g(b)))),
              I.crossFirst(driver.reset)
            )
          )
        )
      )
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<A, R1, B, C, D>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C,
  g: (b: B) => D
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E, C | D> {
  return (stream) => scheduleWith_(stream, schedule, f, g)
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 * {{{
 * mapM(stream, _ => T.done(_))
 * }}}
 */
export function flattenExitOption<R, E, E1, A>(stream: Stream<R, E, Ex.Exit<O.Option<E1>, A>>): Stream<R, E | E1, A> {
  const processChunk = (
    chunk: C.Chunk<Ex.Exit<O.Option<E1>, A>>,
    cont: Ch.Channel<R, E, C.Chunk<Ex.Exit<O.Option<E1>, A>>, unknown, E | E1, C.Chunk<A>, any>
  ): Ch.Channel<R, E, C.Chunk<Ex.Exit<O.Option<E1>, A>>, unknown, E | E1, C.Chunk<A>, any> => {
    const [toEmit, rest] = C.splitWhere_(chunk, (_) => !Ex.isSuccess(_))
    const next           = O.match_(
      C.head(rest),
      () => cont,
      Ex.match(
        (cause) =>
          O.match_(
            Ca.flipCauseOption(cause),
            () => Ch.end<void>(undefined),
            (cause) => Ch.halt(cause)
          ),
        () => Ch.end<void>(undefined)
      )
    )

    return Ch.zipr_(
      Ch.write(
        C.filterMap_(
          toEmit,
          Ex.match(
            () => O.none(),
            (a) => O.some(a)
          )
        )
      ),
      next
    )
  }

  const process: Ch.Channel<
    R,
    E,
    C.Chunk<Ex.Exit<O.Option<E1>, A>>,
    unknown,
    E | E1,
    C.Chunk<A>,
    any
  > = Ch.readWithCause(
    (chunk) => processChunk(chunk, process),
    (cause) => Ch.halt(cause),
    (_) => Ch.end(undefined)
  )

  return new Stream(stream.channel['>>>'](process))
}

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, A>(stream: Stream<R, E, Take.Take<E1, A>>): Stream<R, E | E1, A> {
  return pipe(
    stream,
    map((_) => _.exit),
    flattenExitOption,
    flattenChunks
  )
}

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(stream: Stream<R, E, C.Chunk<A>>): Stream<R, E, A> {
  return new Stream(Ch.mapOut_(stream.channel, C.flatten))
}

export const DEFAULT_CHUNK_SIZE = 4096

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub_<R, E, A>(
  stream: Stream<R, E, A>,
  capacity: number
): M.Managed<R, never, H.UHub<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const hub = yield* _(M.bracket_(H.makeBounded<Take.Take<E, A>>(capacity), H.shutdown))
    yield* _(M.fork(runIntoHubManaged_(stream, hub)))
    return hub
  })
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub(
  capacity: number
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, H.UHub<Take.Take<E, A>>> {
  return (stream) => toHub_(stream, capacity)
}

export function ensuring_<R, E, A, R1>(sa: Stream<R, E, A>, fin: I.IO<R1, never, any>): Stream<R & R1, E, A> {
  return new Stream(pipe(sa.channel, Ch.ensuring(fin)))
}

export function ensuring<R1>(fin: I.IO<R1, never, any>): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (sa) => ensuring_(sa, fin)
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, A>(
  stream: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.UQueue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(M.bracket_(Q.makeBounded<Take.Take<E, A>>(capacity), Q.shutdown))
    yield* _(M.fork(runIntoManaged_(stream, queue)))
    return queue
  })
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue(
  capacity = 2
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, Q.UQueue<Take.Take<E, A>>> {
  return (stream) => toQueue_(stream, capacity)
}

/**
 * Converts the stream into an unbounded managed queue. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export function toQueueUnbounded<R, E, A>(stream: Stream<R, E, A>): M.Managed<R, never, Q.UQueue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(M.bracket_(Q.makeUnbounded<Take.Take<E, A>>(), Q.shutdown))
    yield* _(M.fork(runIntoManaged_(stream, queue)))
    return queue
  })
}

export function toQueueDropping_<R, E, A>(
  stream: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Dequeue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(M.bracket_(Q.makeDropping<Take.Take<E, A>>(capacity), Q.shutdown))
    yield* _(M.fork(runIntoManaged_(stream, queue)))
    return queue
  })
}

export function toQueueDropping(
  capacity = 2
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, Q.Dequeue<Take.Take<E, A>>> {
  return (stream) => toQueueDropping_(stream, capacity)
}

export function toQueueOfElements_<R, E, A>(
  stream: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Dequeue<Ex.Exit<O.Option<E>, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(M.bracket_(Q.makeBounded<Ex.Exit<O.Option<E>, A>>(capacity), Q.shutdown))
    yield* _(M.fork(runIntoElementsManaged_(stream, queue)))
    return queue
  })
}

export function toQueueOfElements(
  capacity = 2
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, Q.Dequeue<Ex.Exit<O.Option<E>, A>>> {
  return (stream) => toQueueOfElements_(stream, capacity)
}

export function toQueueSliding_<R, E, A>(
  stream: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Dequeue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(M.bracket_(Q.makeSliding<Take.Take<E, A>>(capacity), Q.shutdown))
    yield* _(M.fork(runIntoManaged_(stream, queue)))
    return queue
  })
}

export function toQueueSliding(
  capacity = 2
): <R, E, A>(stream: Stream<R, E, A>) => M.Managed<R, never, Q.Dequeue<Take.Take<E, A>>> {
  return (stream) => toQueueSliding_(stream, capacity)
}

/**
 *
 */
export function toAsyncIterable<R, E, A>(ma: Stream<R, E, A>): M.Managed<R, never, AsyncIterable<E.Either<E, A>>> {
  return M.gen(function* (_) {
    const runtime = yield* _(I.runtime<R>())
    const pull    = yield* _(toPull(ma))
    return AI.asyncIterable(() => {
      let currentChunk: C.Chunk<A> = C.empty()
      return {
        async next(): Promise<IteratorResult<E.Either<E, A>>> {
          if (currentChunk.length === 1) {
            const v      = C.unsafeHead(currentChunk)
            currentChunk = C.empty()
            return { done: false, value: E.right(v) }
          } else if (currentChunk.length > 1) {
            const v      = C.unsafeHead(currentChunk)
            currentChunk = C.unsafeTail(currentChunk)
            return { done: false, value: E.right(v) }
          } else {
            const result = await runtime.runPromiseExit(pull)
            return pipe(
              result,
              Ex.match(
                flow(
                  Ca.failureOrCause,
                  E.match(
                    O.match(
                      () => Promise.resolve({ value: null, done: true }),
                      (e) => Promise.resolve({ value: E.left(e), done: true })
                    ),
                    (ca) => {
                      throw new Ca.FiberFailure(ca)
                    }
                  )
                ),
                (c) => {
                  currentChunk = c
                  return this.next()
                }
              )
            )
          }
        }
      }
    })
  })
}

class Running<W1, W2> {
  readonly _tag = 'Running'
  constructor(readonly excess: E.Either<C.Chunk<W1>, C.Chunk<W2>>) {}
}
class LeftDone<W1> {
  readonly _tag = 'LeftDone'
  constructor(readonly excessL: C.Chunk<W1>) {}
}
class RightDone<W2> {
  readonly _tag = 'RightDone'
  constructor(readonly excessR: C.Chunk<W2>) {}
}
class End {
  readonly _tag = 'End'
}
type State<W1, W2> = Running<W1, W2> | LeftDone<W1> | RightDone<W2> | End

function handleSuccess<A, A1, B>(
  f: (a: A, a1: A1) => B,
  leftUpd: O.Option<C.Chunk<A>>,
  rightUpd: O.Option<C.Chunk<A1>>,
  excess: E.Either<C.Chunk<A>, C.Chunk<A1>>
): Ex.Exit<O.Option<never>, readonly [C.Chunk<B>, State<A, A1>]> {
  const [leftExcess, rightExcess] = E.match_(
    excess,
    (l) => [l, C.empty<A1>()] as const,
    (r) => [C.empty<A>(), r] as const
  )
  const left                      = O.match_(
    leftUpd,
    () => leftExcess,
    (upd) => C.concat_(leftExcess, upd)
  )
  const right                     = O.match_(
    rightUpd,
    () => rightExcess,
    (upd) => C.concat_(rightExcess, upd)
  )
  const [emit, newExcess]         = zipChunks_(left, right, f)

  if (leftUpd._tag === 'Some' && rightUpd._tag === 'Some') {
    return Ex.succeed(tuple(emit, new Running(newExcess)))
  }
  if (leftUpd._tag === 'None' && rightUpd._tag === 'None') {
    return Ex.fail(O.none())
  }
  const newState: State<A, A1> =
    newExcess._tag === 'Left'
      ? C.isEmpty(newExcess.left)
        ? new End()
        : new LeftDone(newExcess.left)
      : C.isEmpty(newExcess.right)
      ? new End()
      : new RightDone(newExcess.right)
  return Ex.succeed(tuple(emit, newState))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, A1, B>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): Stream<R1 & R, E | E1, B> {
  return combineChunks_(stream, that, <State<A, A1>>new Running(E.left(C.empty())), (st, p1, p2) => {
    switch (st._tag) {
      case 'End': {
        return I.succeed(Ex.fail(O.none()))
      }
      case 'Running': {
        return I.catchAllCause_(
          I.crossWithPar_(I.optional(p1), I.optional(p2), (l, r) => handleSuccess(f, l, r, st.excess)),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
      case 'LeftDone': {
        return I.catchAllCause_(
          I.map_(I.optional(p2), (l) => handleSuccess(f, O.none(), l, E.left(st.excessL))),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
      case 'RightDone': {
        return I.catchAllCause_(
          I.map_(I.optional(p1), (r) => handleSuccess(f, r, O.none(), E.right(st.excessR))),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
    }
  })
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, A1, B>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(stream: Stream<R, E, A>) => Stream<R1 & R, E | E1, B> {
  return (stream) => zipWith_(stream, that, f)
}

export function zipWithIndex<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, readonly [A, number]> {
  return mapAccum_(stream, 0, (index, a) => [[a, index], index + 1])
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 */
export function zip_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, readonly [A, A1]> {
  return zipWith_(stream, that, tuple)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @dataFirst zip_
 */
export function zip<R1, E1, A1>(
  that: Stream<R1, E1, A1>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R1 & R, E | E1, readonly [A, A1]> {
  return (stream) => zip_(stream, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipSecond_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A1> {
  return zipWith_(stream, that, (_, o) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipSecond<R, R1, E, E1, A, A1>(that: Stream<R1, E1, A1>) {
  return (stream: Stream<R, E, A>) => zipSecond_(stream, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipFirst_<R, R1, E, E1, A, A1>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A> {
  return zipWith_(stream, that, (o, _) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipFirst<R, R1, E, E1, A, A1>(that: Stream<R1, E1, A1>) {
  return (stream: Stream<R, E, A>) => zipFirst_(stream, that)
}

export class GroupBy<R, E, K, V> {
  constructor(
    readonly grouped: Stream<R, E, readonly [K, Q.Dequeue<Ex.Exit<O.Option<E>, V>>]>,
    readonly buffer: number
  ) {}

  first(n: number): GroupBy<R, E, K, V> {
    const g1 = pipe(
      this.grouped,
      zipWithIndex,
      filterIO((elem) => {
        const i = elem[1]
        return i < n ? I.succeed(true) : I.as_(Q.shutdown(elem[0][1]), false)
      }),
      map(([_]) => _)
    )
    return new GroupBy(g1, this.buffer)
  }

  filter(f: (k: K) => boolean): GroupBy<R, E, K, V> {
    const g1 = pipe(
      this.grouped,
      filterIO(([k, q]) => (f(k) ? I.succeed(true) : I.as_(Q.shutdown(q), false)))
    )
    return new GroupBy(g1, this.buffer)
  }

  apply<R1, E1, A>(f: (k: K, s: Stream<unknown, E, V>) => Stream<R1, E1, A>): Stream<R & R1, E | E1, A> {
    return pipe(
      this.grouped,
      chainPar(([k, q]) => f(k, flattenExitOption(fromQueueWithShutdown_(q))), Number.MAX_SAFE_INTEGER)
    )
  }
}
