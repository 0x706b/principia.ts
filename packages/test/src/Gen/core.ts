import type * as Eq from '@principia/base/Eq'
import type { Has } from '@principia/base/Has'
import type * as HKT from '@principia/base/HKT'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/Predicate'
import type { _A, _R } from '@principia/base/prelude'
import type { Refinement } from '@principia/base/Refinement'
import type { Stream } from '@principia/base/Stream'

import * as A from '@principia/base/collection/immutable/Array'
import { OrderedMap } from '@principia/base/collection/immutable/OrderedMap'
import * as OM from '@principia/base/collection/immutable/OrderedMap'
import { IllegalArgumentError, NoSuchElementError } from '@principia/base/Error'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import { Random } from '@principia/base/Random'
import * as S from '@principia/base/Stream'
import { tuple } from '@principia/base/tuple'

import { Sample, shrinkFractional } from '../Sample'
import * as Sa from '../Sample'
import { Sized } from '../Sized'
import { clamp } from '../util/math'

export interface GenF extends HKT.HKT {
  readonly type: Gen<this['R'], this['A']>
  readonly variance: {
    R: '-'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export class Gen<R, A> {
  readonly _R!: (_: R) => void
  readonly _A!: () => A
  constructor(readonly sample: Stream<R, never, M.Maybe<Sample<R, A>>>) {}
}

export interface LengthConstraints {
  minLength?: number
  maxLength?: number
}

export interface EqConstraint<A> {
  eq?: Eq.Eq<A>
}

export interface DateConstraints {
  min?: Date
  max?: Date
}

export interface ObjectConstraints {
  maxDepth?: number
  maxKeys?: number
  key?: Gen<any, string>
  values?: Gen<any, any>[]
  withSet?: boolean
  withMap?: boolean
  withBigint?: boolean
  withDate?: boolean
  withTypedArray?: boolean
}

export interface NumberConstraints {
  min?: number
  max?: number
}

export interface FloatConstraints {
  noDefaultInfinity?: boolean
  noNaN?: boolean
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function constant<A>(a: A): Gen<unknown, A> {
  return new Gen(S.succeed(M.just(Sa.noShrink(a))))
}

export function defer<R, A>(gen: () => Gen<R, A>): Gen<R, A> {
  return pipe(I.succeedLazy(gen), fromIO, flatten)
}

export function fromIO<R, A>(effect: IO<R, never, A>): Gen<R, A> {
  return fromIOSample(pipe(effect, I.map(Sa.noShrink)))
}

export function fromIOSample<R, A>(effect: IO<R, never, Sample<R, A>>): Gen<R, A> {
  return new Gen(pipe(effect, I.map(M.just), S.fromIO))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Primitives
 * -------------------------------------------------------------------------------------------------
 */

export const anyBigInt: Gen<Has<Random>, bigint> = fromIOSample(
  I.map_(
    Random.nextBigIntBetween(BigInt(-1) << BigInt(255), (BigInt(1) << BigInt(255)) - BigInt(1)),
    Sa.shrinkBigInt(BigInt(0))
  )
)

export const anyDouble: Gen<Has<Random>, number> = fromIOSample(I.map_(Random.next, shrinkFractional(0)))

export const anyInt: Gen<Has<Random>, number> = fromIOSample(I.map_(Random.nextInt, Sa.shrinkIntegral(0)))

export const boolean: Gen<Has<Random>, boolean> = oneOf(constant(true), constant(false))

export const empty: Gen<unknown, never> = new Gen(S.empty)

export const exponential: Gen<Has<Random>, number> = map_(uniform(), (n) => -Math.log(1 - n))

export function int(constraints: NumberConstraints = {}): Gen<Has<Random>, number> {
  return fromIOSample(
    I.defer(() => {
      const min = constraints.min ?? -0x80000000
      const max = constraints.max ?? 0x7fffffff
      if (min > max || min < Number.MIN_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER) {
        return I.halt(new IllegalArgumentError('invalid bounds', 'Gen.int'))
      } else {
        return I.map_(Random.nextIntBetween(min, max), Sa.shrinkIntegral(min))
      }
    })
  )
}

export function nat(max = 0x7fffffff): Gen<Has<Random>, number> {
  return int({ min: 0, max: clamp(max, 0, max) })
}

export function uniform(): Gen<Has<Random>, number> {
  return fromIOSample(I.map_(Random.next, Sa.shrinkFractional(0.0)))
}

export function unit(): Gen<unknown, void> {
  return constant(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<R, A, R1, B, C>(fa: Gen<R, A>, fb: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, R1, B, C>(fb: Gen<R1, B>, f: (a: A, b: B) => C): <R>(fa: Gen<R, A>) => Gen<R & R1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<R, A, R1, B>(fa: Gen<R, A>, fb: Gen<R1, B>): Gen<R & R1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, B>(fb: Gen<R1, B>): <R, A>(fa: Gen<R, A>) => Gen<R & R1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, A, B>(fa: Gen<R, A>, f: (a: A) => B): Gen<R, B> {
  return new Gen(pipe(fa.sample, S.map(M.map(Sa.map(f)))))
}

export function map<A, B>(f: (a: A) => B): <R>(fa: Gen<R, A>) => Gen<R, B> {
  return (fa) => map_(fa, f)
}

export function mapIO_<R, A, R1, B>(fa: Gen<R, A>, f: (a: A) => IO<R1, never, B>): Gen<R & R1, B> {
  return new Gen(
    S.mapIO_(
      fa.sample,
      M.match(() => I.succeed(M.nothing()), flow(Sa.foreach(f), I.map(M.just)))
    )
  )
}

export function mapIO<A, R1, B>(f: (a: A) => IO<R1, never, B>): <R>(fa: Gen<R, A>) => Gen<R & R1, B> {
  return (fa) => mapIO_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, A, R1, B>(ma: Gen<R, A>, f: (a: A) => Gen<R1, B>): Gen<R & R1, B> {
  return new Gen(
    Sa.chainStream(ma.sample, (sample) => {
      const values  = f(sample.value).sample
      const shrinks = pipe(
        new Gen(sample.shrink),
        chain((a) => f(a))
      ).sample
      return pipe(values, S.map(M.map(Sa.chain((b) => new Sample(b, shrinks)))))
    })
  )
}

export function chain<A, R1, B>(f: (a: A) => Gen<R1, B>): <R>(ma: Gen<R, A>) => Gen<R & R1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<R, R1, A>(mma: Gen<R, Gen<R1, A>>): Gen<R & R1, A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<R, A, B extends A>(fa: Gen<R, A>, f: Refinement<A, B>): Gen<R, B>
export function filter_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A>
export function filter_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A> {
  return pipe(
    fa,
    chain((a) => (f(a) ? constant(a) : empty))
  )
}

export function filter<A, B extends A>(f: Refinement<A, B>): <R>(fa: Gen<R, A>) => Gen<R, B>
export function filter<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A>
export function filter<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A> {
  return (fa) => filter_(fa, f)
}

export function filterNot_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A> {
  return filter_(fa, (a) => !f(a))
}

export function filterNot<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A> {
  return (fa) => filterNot_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function bounded<R, A>(min: number, max: number, f: (n: number) => Gen<R, A>): Gen<R & Has<Random>, A> {
  return chain_(int({ min, max }), f)
}

export function memo<R, A>(builder: (maxDepth: number) => Gen<R, A>): (maxDepth?: number) => Gen<R, A> {
  const previous: { [depth: number]: Gen<R, A> } = {}
  let remainingDepth = 10
  return (maxDepth?: number): Gen<R, A> => {
    const n = maxDepth !== undefined ? maxDepth : remainingDepth
    if (!Object.prototype.hasOwnProperty.call(previous, n)) {
      const prev     = remainingDepth
      remainingDepth = n - 1
      previous[n]    = builder(n)
      remainingDepth = prev
    }
    return previous[n]
  }
}

/**
 * A sized generator that uses an exponential distribution of size values.
 * The majority of sizes will be towards the lower end of the range but some
 * larger sizes will be generated as well.
 */
export function medium<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<R & Has<Random> & Has<Sized>, A> {
  return pipe(
    size,
    chain((max) => map_(exponential, (n) => clamp(Math.round((n * max) / 10.0), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    chain(f)
  )
}

export function oneOf<A extends ReadonlyArray<Gen<any, any>>>(
  ...gens: A
): Gen<_R<A[number]> & Has<Random>, _A<A[number]>> {
  if (A.isEmpty(gens)) return empty
  else return chain_(int({ min: 0, max: gens.length - 1 }), (i) => gens[i])
}

export function reshrink_<R, A, R1, B>(gen: Gen<R, A>, f: (a: A) => Sample<R1, B>): Gen<R & R1, B> {
  return new Gen(
    pipe(gen.sample as Stream<R & R1, never, M.Maybe<Sample<R, A>>>, S.map(M.map((sample) => f(sample.value))))
  )
}

export function reshrink<A, R1, B>(f: (a: A) => Sample<R1, B>): <R>(gen: Gen<R, A>) => Gen<R & R1, B> {
  return (gen) => reshrink_(gen, f)
}

export const size: Gen<Has<Sized>, number> = fromIO(Sized.size)

export function sized<R, A>(f: (size: number) => Gen<R, A>): Gen<R & Has<Sized>, A> {
  return chain_(size, f)
}

export function small<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<Has<Sized> & Has<Random> & R, A> {
  return pipe(
    size,
    chain((max) => map_(exponential, (n) => clamp(Math.round((n * max) / 25), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    chain(f)
  )
}

export function unfoldGen<S, R, A>(
  s: S,
  f: (s: S) => Gen<R, readonly [S, A]>
): Gen<R & Has<Random> & Has<Sized>, ReadonlyArray<A>> {
  return small((n) => unfoldGenN(n, s, f))
}

export function unfoldGenN<S, R, A>(n: number, s: S, f: (s: S) => Gen<R, readonly [S, A]>): Gen<R, ReadonlyArray<A>> {
  if (n <= 0) {
    return constant(A.empty())
  } else {
    return pipe(
      f(s),
      chain(([s, a]) => pipe(unfoldGenN(n - 1, s, f), map(A.append(a))))
    )
  }
}

export function unwrap<R, R1, A>(effect: I.URIO<R, Gen<R1, A>>): Gen<R & R1, A> {
  return pipe(fromIO(effect), flatten)
}

export function weighted<R, A>(...gs: ReadonlyArray<readonly [Gen<R, A>, number]>): Gen<R & Has<Random>, A> {
  const sum = pipe(
    gs,
    A.map(([, w]) => w),
    A.sum
  )
  const [map] = A.foldl_(gs, tuple(new OrderedMap<number, Gen<R, A>>(N.Ord, null), 0), ([map, acc], [gen, d]) => {
    if ((acc + d) / sum > acc / sum) return tuple(OM.insert_(map, (acc + d) / sum, gen), acc + d)
    else return tuple(map, acc)
  })
  return pipe(
    uniform(),
    chain((n) => {
      return pipe(
        map,
        OM.getGte(n),
        M.getOrElse(() => {
          throw new NoSuchElementError('Gen.weighted')
        })
      )
    })
  )
}

export function zipWith_<R, A, R1, B, C>(fa: Gen<R, A>, fb: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C> {
  return pipe(
    fa,
    chain((a) =>
      pipe(
        fb,
        map((b) => f(a, b))
      )
    )
  )
}

export function zipWith<A, R1, B, C>(fb: Gen<R1, B>, f: (a: A, b: B) => C): <R>(fa: Gen<R, A>) => Gen<R & R1, C> {
  return (fa) => zipWith_(fa, fb, f)
}
