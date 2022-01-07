import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/Predicate'
import type { Stream } from '@principia/base/Stream'
import type { ArrayInt64 } from '@principia/base/util/pure-rand/distribution/internals/ArrayInt'

import * as Ch from '@principia/base/Channel'
import * as CED from '@principia/base/Channel/internal/ChildExecutorDecision'
import * as UPR from '@principia/base/Channel/internal/UpstreamPullRequest'
import * as UPS from '@principia/base/Channel/internal/UpstreamPullStrategy'
import * as C from '@principia/base/collection/immutable/Conc'
import * as E from '@principia/base/Either'
import { constVoid, flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as S from '@principia/base/Stream'
import { tuple } from '@principia/base/tuple'

import { add64, halve64, isEqual64, substract64 } from './util/math'

export class Sample<R, A> {
  constructor(readonly value: A, readonly shrink: Stream<R, never, M.Maybe<Sample<R, A>>>) {}
}

export function map_<R, A, B>(ma: Sample<R, A>, f: (a: A) => B): Sample<R, B> {
  return new Sample(f(ma.value), S.map_(ma.shrink, M.map(map(f))))
}

export function map<A, B>(f: (a: A) => B): <R>(ma: Sample<R, A>) => Sample<R, B> {
  return (ma) => map_(ma, f)
}

export function chain_<R, A, R1, B>(ma: Sample<R, A>, f: (a: A) => Sample<R1, B>): Sample<R & R1, B> {
  const sample = f(ma.value)
  return new Sample(sample.value, mergeStream(sample.shrink, pipe(ma.shrink, S.map(M.map(chain(f))))))
}

export function chain<A, R1, B>(f: (a: A) => Sample<R1, B>): <R>(ma: Sample<R, A>) => Sample<R & R1, B> {
  return (ma) => chain_(ma, f)
}

export function shrinkSearch_<R, A>(ma: Sample<R, A>, f: Predicate<A>): Stream<R, never, A> {
  if (!f(ma.value)) {
    return S.succeed(ma.value)
  } else {
    return pipe(
      S.succeed(ma.value),
      S.concat(
        pipe(
          ma.shrink,
          S.takeUntil(
            M.match(
              () => false,
              (v) => f(v.value)
            )
          ),
          S.chain(
            flow(
              M.map(shrinkSearch(f)),
              M.getOrElse(() => S.empty)
            )
          )
        )
      )
    )
  }
}

export function shrinkSearch<A>(f: Predicate<A>): <R>(ma: Sample<R, A>) => Stream<R, never, A> {
  return (ma) => shrinkSearch_(ma, f)
}

export function foreach_<R, A, R1, B>(
  ma: Sample<R, A>,
  f: (a: A) => IO<R1, never, B>
): IO<R & R1, never, Sample<R & R1, B>> {
  return pipe(
    f(ma.value),
    I.map(
      (b) =>
        new Sample(
          b,
          S.mapIO_(
            ma.shrink,
            M.match(() => I.succeed(M.nothing()), flow(foreach(f), I.map(M.just)))
          )
        )
    )
  )
}

export function foreach<A, R1, B>(
  f: (a: A) => IO<R1, never, B>
): <R>(ma: Sample<R, A>) => IO<R & R1, never, Sample<R & R1, B>> {
  return (ma) => foreach_(ma, f)
}

export function crossWith_<R, A, R1, B, C>(
  ma: Sample<R, A>,
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): Sample<R & R1, C> {
  return pipe(
    ma,
    chain((a) => map_(mb, (b) => f(a, b)))
  )
}

export function crossWith<A, R1, B, C>(
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): <R>(ma: Sample<R, A>) => Sample<R & R1, C> {
  return (ma) => crossWith_(ma, mb, f)
}

export function cross_<R, A, R1, B>(ma: Sample<R, A>, mb: Sample<R1, B>): Sample<R & R1, readonly [A, B]> {
  return crossWith_(ma, mb, tuple)
}

export function cross<R1, B>(mb: Sample<R1, B>): <R, A>(ma: Sample<R, A>) => Sample<R & R1, readonly [A, B]> {
  return (ma) => cross_(ma, mb)
}

export function filter_<R, A>(ma: Sample<R, A>, f: Predicate<A>): Stream<R, never, M.Maybe<Sample<R, A>>> {
  if (f(ma.value)) {
    return S.succeed(
      M.just(
        new Sample(
          ma.value,
          pipe(
            ma.shrink,
            S.chain(
              flow(
                M.map(filter(f)),
                M.getOrElse(() => S.empty)
              )
            )
          )
        )
      )
    )
  } else {
    return pipe(
      ma.shrink,
      S.chain(
        flow(
          M.map(filter(f)),
          M.getOrElse(() => S.empty)
        )
      )
    )
  }
}

export function filter<A>(f: Predicate<A>): <R>(ma: Sample<R, A>) => Stream<R, never, M.Maybe<Sample<R, A>>> {
  return (ma) => filter_(ma, f)
}

export function zipWith_<R, A, R1, B, C>(ma: Sample<R, A>, mb: Sample<R1, B>, f: (a: A, b: B) => C): Sample<R & R1, C> {
  return pipe(
    ma,
    chain((a) =>
      pipe(
        mb,
        map((b) => f(a, b))
      )
    )
  )
}

export function zipWith<A, R1, B, C>(
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): <R>(ma: Sample<R, A>) => Sample<R & R1, C> {
  return (ma) => zipWith_(ma, mb, f)
}

export function zip_<R, A, R1, B>(ma: Sample<R, A>, mb: Sample<R1, B>): Sample<R & R1, readonly [A, B]> {
  return zipWith_(ma, mb, tuple)
}

export function zip<R1, B>(mb: Sample<R1, B>): <R, A>(ma: Sample<R, A>) => Sample<R & R1, readonly [A, B]> {
  return (ma) => zip_(ma, mb)
}

export function noShrink<A>(a: A): Sample<unknown, A> {
  return new Sample(a, S.empty)
}

export function shrinkFractional(smallest: number): (a: number) => Sample<unknown, number> {
  return (a) =>
    unfold(a, (max) =>
      tuple(
        max,
        S.unfold(smallest, (min) => {
          const mid = min + (max - min) / 2
          if (mid === max) {
            return M.nothing()
          } else if (Math.abs(max - mid) < 0.001) {
            return M.just([min, max])
          } else {
            return M.just([mid, mid])
          }
        })
      )
    )
}

function quot(x: number, y: number): number {
  return (x / y) | 0
}

function bigIntAbs(x: bigint): bigint {
  return x < BigInt(0) ? -x : x
}

export function shrinkBigInt(smallest: bigint): (a: bigint) => Sample<unknown, bigint> {
  return (a) =>
    unfold(a, (max) =>
      tuple(
        max,
        S.unfold(smallest, (min) => {
          const mid = min + (max - min) / BigInt(2)
          if (mid === max) {
            return M.nothing()
          } else if (bigIntAbs(max - mid) === BigInt(1)) {
            return M.just([mid, max])
          } else {
            return M.just([mid, mid])
          }
        })
      )
    )
}

export function shrinkIntegral(smallest: number): (a: number) => Sample<unknown, number> {
  return (a) =>
    unfold(a, (max) =>
      tuple(
        max,
        S.unfold(smallest, (min) => {
          const mid = min + quot(max - min, 2)
          if (mid === max) {
            return M.nothing()
          } else if (Math.abs(max - mid) === 1) {
            return M.just([mid, max])
          } else {
            return M.just([mid, mid])
          }
        })
      )
    )
}

export function shrinkArrayInt64(target: ArrayInt64): (value: ArrayInt64) => Sample<unknown, ArrayInt64> {
  return (value) =>
    unfold(value, (max) =>
      tuple(
        max,
        S.unfold(target, (min) => {
          const mid = add64(min, halve64(substract64(max, min)))
          if (isEqual64(mid, max)) {
            return M.nothing()
          } else {
            return M.just([mid, max])
          }
        })
      )
    )
}

export function unfold<R, A, S>(s: S, f: (s: S) => readonly [A, Stream<R, never, S>]): Sample<R, A> {
  const [value, shrink] = f(s)
  return new Sample(
    value,
    pipe(
      shrink,
      S.map((s) => M.just(unfold(s, f)))
    )
  )
}

function mergeStream<R, A, R1, B>(
  left: S.Stream<R, never, M.Maybe<A>>,
  right: S.Stream<R1, never, M.Maybe<B>>
): S.Stream<R & R1, never, M.Maybe<A | B>> {
  return chainStream(
    S.fromChunk(C.make(M.just(left), M.just<S.Stream<R & R1, never, M.Maybe<A | B>>>(right))),
    identity
  )
}

export function chainStream<R, A, R1, B>(
  stream: S.Stream<R, never, M.Maybe<A>>,
  f: (a: A) => S.Stream<R1, never, M.Maybe<B>>
): S.Stream<R & R1, never, M.Maybe<B>> {
  return pipe(
    new S.Stream(
      pipe(
        S.rechunk_(stream, 1).channel,
        Ch.concatMapWithCustom(
          (as) =>
            pipe(
              as,
              C.map(
                M.match(
                  () => S.succeed(E.left(false)).channel,
                  (a) => pipe(f(a), S.rechunk(1), S.map(M.match(() => E.left(true), E.right))).channel
                )
              ),
              C.foldl(
                Ch.unit() as Ch.Channel<R1, unknown, unknown, unknown, never, C.Conc<E.Either<boolean, B>>, unknown>,
                Ch.crossSecond_
              )
            ),
          constVoid,
          constVoid,
          UPR.match(
            flow(
              C.head,
              M.flatten,
              M.match(
                () => UPS.PullAfterAllEnqueued(M.nothing()),
                () => UPS.PullAfterNext(M.nothing())
              )
            ),
            (activeDownstreamCount) =>
              UPS.PullAfterAllEnqueued(activeDownstreamCount > 0 ? M.just(C.single(E.left(false))) : M.nothing())
          ),
          (chunk: C.Conc<E.Either<boolean, B>>) =>
            pipe(
              C.head(chunk),
              M.match(
                () => CED.Continue,
                E.match(
                  (b) => (b ? CED.Yield : CED.Continue),
                  () => CED.Continue
                )
              )
            )
        )
      )
    ),
    S.filter(
      E.match(
        (b) => !b,
        () => true
      )
    ),
    S.map(E.match(() => M.nothing(), M.just))
  )
}
