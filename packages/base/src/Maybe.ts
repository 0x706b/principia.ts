/**
 * _Maybe_ represents an optional value. It consists of constructors _Nothing_
 * representing an empty value, and _Just_ representing the original datatype
 */

import type { Either } from './Either'
import type { FunctionN } from './function'
import type * as HKT from './HKT'
import type { Maybe } from './internal/Maybe'
import type { MaybeURI } from './Modules'
import type { These } from './These'

import { flow, identity, pipe } from './function'
import * as G from './Guard'
import * as E from './internal/Either'
import * as M from './internal/Maybe'
import * as T from './internal/These'
import { tuple } from './internal/tuple'
import * as P from './prelude'
import { tailRec_ } from './TailRec'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export { Just, Maybe, Nothing } from './internal/Maybe'

type URI = [HKT.URI<MaybeURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Constructs a new `Maybe` holding no value (a.k.a `Nothing`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export const nothing = M.nothing

/**
 * Constructs a new `Maybe` holding a `Just` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export const just = M.just

/**
 * Constructs a new `Maybe` from a nullable value. If the value is `null` or `undefined`, returns `Nothing`, otherwise
 * returns the value wrapped in a `Just`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<A>(a: A | null | undefined): Maybe<NonNullable<A>> {
  return a == null ? nothing() : just(a as NonNullable<A>)
}

export function fromNullableK<A extends ReadonlyArray<unknown>, B>(
  f: (...args: A) => B | null | undefined
): (...args: A) => Maybe<NonNullable<B>> {
  return (...args) => fromNullable(f(...args))
}

/**
 * Constructs a new `Maybe` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch<A>(thunk: () => A): Maybe<A> {
  try {
    return just(thunk())
  } catch (_) {
    return nothing()
  }
}

/**
 * Transforms a non-curried function that may throw, takes a set of arguments `(a, b, ...)`,
 * and returns a value `c`, into a non-curried function that will not throw,
 * takes a set of arguments `(a, b, ...)`, and returns an `Maybe`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK<A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>): (...args: A) => Maybe<B> {
  return (...a) => tryCatch(() => f(...a))
}

/**
 * Constructs a new `Maybe` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate_ = M.fromPredicate_

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst fromPredicate_
 */
export const fromPredicate = M.fromPredicate

/**
 * Constructs a new `Maybe` from an `Either`, transforming a `Left` into a `Nothing` and a `Right` into a `Just`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromEither<E, A>(ma: Either<E, A>): Maybe<A> {
  return E.match_(ma, () => nothing(), just)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export const isNothing = M.isNothing

export const isJust = M.isJust

export const isMaybe = M.isMaybe

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Takes a default value, a function, and an `Maybe` value,
 * if the `Maybe` value is `Nothing` the default value is returned,
 * otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const match_ = M.match_

/**
 * Takes a default value, a function, and an `Maybe` value,
 * if the `Maybe` value is `Nothing` the default value is returned,
 * otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst match_
 */
export const match = M.match

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toNullable<A>(fa: Maybe<A>): A | null {
  return match_(fa, () => null, identity)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUndefined<A>(fa: Maybe<A>): A | undefined {
  return match_(fa, () => undefined, identity)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const getOrElse_ = M.getOrElse_

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst getOrElse_
 */
export const getOrElse = M.getOrElse

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<A, B, C>(fa: Maybe<A>, fb: Maybe<B>, f: (_: These<A, B>) => C): Maybe<C> {
  return match_(
    fa,
    () => match_(fb, nothing, flow(T.right, f, just)),
    (a) =>
      match_(
        fb,
        () => pipe(T.left(a), f, just),
        (b) => pipe(T.both(a, b), f, just)
      )
  )
}

/**
 * @dataFirst alignWith_
 */
export function alignWith<A, B, C>(fb: Maybe<B>, f: (_: These<A, B>) => C): (fa: Maybe<A>) => Maybe<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

/**
 * @dataFirst align_
 */
export function align<B>(fb: Maybe<B>): <A>(fa: Maybe<A>) => Maybe<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Combines two `Maybe` values
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa1: Maybe<A>, fa2: () => Maybe<A>): Maybe<A> {
  return orElse_(fa1, fa2)
}

/**
 * Combines two `Maybe` values
 *
 * @category Alt
 * @since 1.0.0
 *
 * @dataFirst alt_
 */
export function alt<A>(fa2: () => Maybe<A>): (fa1: Maybe<A>) => Maybe<A> {
  return (fa1) => alt_(fa1, fa2)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure expression info an `Maybe`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): Maybe<A> {
  return just(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative Except
 * -------------------------------------------------------------------------------------------------
 */

export function fail<E = never, A = never>(_: E): Maybe<A> {
  return nothing()
}

export function catchAll_<A, B>(fa: Maybe<A>, f: () => Maybe<B>): Maybe<A | B> {
  return orElse_(fa, f)
}

/**
 * @dataFirst catchAll_
 */
export function catchAll<B>(f: () => Maybe<B>): <A>(fa: Maybe<A>) => Maybe<A | B> {
  return (fa) => catchAll_(fa, f)
}

export function catchJust_<A, B>(fa: Maybe<A>, f: () => Maybe<Maybe<B>>): Maybe<A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      getOrElse((): Maybe<A | B> => fa)
    )
  )
}

/**
 * @dataFirst catchJust_
 */
export function catchJust<B>(f: () => Maybe<Maybe<B>>): <A>(fa: Maybe<A>) => Maybe<A | B> {
  return (fa) => catchJust_(fa, f)
}

export function catchMap_<A, B>(fa: Maybe<A>, f: () => B): Maybe<A | B> {
  return catchAll_(fa, () => just(f()))
}

/**
 * @dataFirst catchMap_
 */
export function catchMap<B>(f: () => B): <A>(fa: Maybe<A>) => Maybe<A | B> {
  return (fa) => catchMap_(fa, f)
}

export function either<A>(fa: Maybe<A>): Maybe<Either<void, A>> {
  return catchAll_(
    map_(fa, (a) => E.right(a)),
    () => just(E.left(undefined))
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Applies both `Maybe`s and if both are `Just`, collects their values into a tuple, otherwise, returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * Applies both `Maybe`s and if both are `Just`, collects their values into a tuple, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst cross_
 */
export function cross<B>(fb: Maybe<B>): <A>(fa: Maybe<A>) => Maybe<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function _ap<A, B>(fa: Maybe<A>, fab: Maybe<(a: A) => B>): Maybe<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> {
  return _ap(fa, fab)
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst ap_
 */
export function ap<A>(fa: Maybe<A>): <B>(fab: Maybe<(a: A) => B>) => Maybe<B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst crossFirst_
 */
export function crossFirst<B>(fb: Maybe<B>): <A>(fa: Maybe<A>) => Maybe<A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst crossSecond_
 */
export function crossSecond<B>(fb: Maybe<B>): <A>(fa: Maybe<A>) => Maybe<B> {
  return (fa) => crossSecond_(fa, fb)
}

/**
 * Applies both `Maybe`s and if both are `Just`,  maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossWith_<A, B, C>(fa: Maybe<A>, fb: Maybe<B>, f: (a: A, b: B) => C): Maybe<C> {
  return match_(fa, nothing, (a) => match_(fb, nothing, (b) => pipe(f(a, b), just)))
}

/**
 * Applies both `Maybe`s and if both are `Just`, maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Maybe<B>, f: (a: A, b: B) => C): (fa: Maybe<A>) => Maybe<C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (fa: Maybe<A>) => (fb: Maybe<B>) => Maybe<C> {
  return (fa) => (fb) => crossWith_(fa, fb, (a, b) => f(a)(b))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function separate<A, B>(fa: Maybe<Either<A, B>>): readonly [Maybe<A>, Maybe<B>] {
  return pipe(
    fa,
    map((eb) => tuple(getLeft(eb), getRight(eb))),
    getOrElse(() => tuple(nothing(), nothing()))
  )
}

export const compact: <A>(ta: Maybe<Maybe<A>>) => Maybe<A> = flatten

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Maybe<A>> {
  return P.Eq(
    (x, y) =>
      x === y ||
      match_(
        x,
        () => isNothing(y),
        (a1) =>
          match_(
            y,
            () => false,
            (a2) => E.equals_(a1, a2)
          )
      )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */
export function extend_<A, B>(wa: Maybe<A>, f: (wa: Maybe<A>) => B): Maybe<B> {
  return isNothing(wa) ? nothing() : just(f(wa))
}

/**
 * @dataFrist extend_
 */
export function extend<A, B>(f: (wa: Maybe<A>) => B): (wa: Maybe<A>) => Maybe<B> {
  return (wa) => extend_(wa, f)
}

export function duplicate<A>(wa: Maybe<A>): Maybe<Maybe<A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(fa: Maybe<A>, refinement: P.Refinement<A, B>): Maybe<B>
export function filter_<A>(fa: Maybe<A>, predicate: P.Predicate<A>): Maybe<A>
export function filter_<A>(fa: Maybe<A>, predicate: P.Predicate<A>): Maybe<A> {
  return match_(fa, nothing, (a) => (predicate(a) ? fa : nothing()))
}

/**
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Maybe<A>) => Maybe<B>
export function filter<A>(predicate: P.Predicate<A>): (fa: Maybe<A>) => Maybe<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Maybe<A>) => Maybe<A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<A, B extends A>(fa: Maybe<A>, refinement: P.Refinement<A, B>): readonly [Maybe<A>, Maybe<B>]
export function partition_<A>(fa: Maybe<A>, predicate: P.Predicate<A>): readonly [Maybe<A>, Maybe<A>]
export function partition_<A>(fa: Maybe<A>, predicate: P.Predicate<A>): readonly [Maybe<A>, Maybe<A>] {
  return [filter_(fa, (a) => !predicate(a)), filter_(fa, predicate)]
}

/**
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: Maybe<A>) => readonly [Maybe<A>, Maybe<B>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Maybe<A>) => readonly [Maybe<A>, Maybe<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Maybe<A>) => readonly [Maybe<A>, Maybe<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(fa: Maybe<A>, f: (a: A) => Either<B, C>): readonly [Maybe<B>, Maybe<C>] {
  return separate(map_(fa, f))
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>): (fa: Maybe<A>) => readonly [Maybe<B>, Maybe<C>] {
  return (fa) => partitionMap_(fa, f)
}

/**
 */
export function filterMap_<A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
  return match_(fa, nothing, f)
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => Maybe<B>): (fa: Maybe<A>) => Maybe<B> {
  return (fa) => filterMap_(fa, f)
}

/**
 */
export function foldl_<A, B>(fa: Maybe<A>, b: B, f: (b: B, a: A) => B): B {
  return match_(
    fa,
    () => b,
    (a) => f(b, a)
  )
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Maybe<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 */
export function foldr_<A, B>(fa: Maybe<A>, b: B, f: (a: A, b: B) => B): B {
  return match_(
    fa,
    () => b,
    (a) => f(a, b)
  )
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Maybe<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Maybe<A>, f: (a: A) => M) => M {
  return (fa, f) => match_(fa, () => M.nat, f)
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Maybe<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> {
  return match_(fa, nothing, flow(f, just))
}

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Maybe<A>) => Maybe<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<A, B>(ma: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
  return match_(ma, nothing, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Maybe<B>): (ma: Maybe<A>) => Maybe<B> {
  return (ma) => chain_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<A, B>(ma: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst tap_
 */
export function tap<A, B>(f: (a: A) => Maybe<B>): (ma: Maybe<A>) => Maybe<A> {
  return (ma) => tap_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Maybe`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: Maybe<Maybe<A>>): Maybe<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad Except
 * -------------------------------------------------------------------------------------------------
 */

export function subsumeEither<E, A>(fa: Maybe<Either<E, A>>): Maybe<A> {
  return chain_(fa, E.match(nothing, just))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getApplyMonoid<A>(M: P.Monoid<A>): P.Monoid<Maybe<A>> {
  return {
    ...getApplySemigroup(M),
    nat: just(M.nat)
  }
}

export function getFirstMonoid<A = never>(): P.Monoid<Maybe<A>> {
  return {
    combine_: (x, y) => (isNothing(y) ? x : y),
    combine: (y) => (x) => isNothing(y) ? x : y,
    nat: nothing()
  }
}

export function getLastMonoid<A = never>(): P.Monoid<Maybe<A>> {
  return {
    combine_: (x, y) => (isNothing(x) ? y : x),
    combine: (y) => (x) => isNothing(x) ? y : x,
    nat: nothing()
  }
}

export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<Maybe<A>> {
  const combine_ = (x: Maybe<A>, y: Maybe<A>) =>
    match_(
      x,
      () => y,
      (a1) => match_(y, nothing, (a2) => just(S.combine_(a1, a2)))
    )
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: nothing()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Senigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getApplySemigroup<A>(S: P.Semigroup<A>): P.Semigroup<Maybe<A>> {
  const combine_ = (x: Maybe<A>, y: Maybe<A>) =>
    isJust(x) && isJust(y) ? just(S.combine_(x.value, y.value)) : nothing()
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<A>(S: P.Show<A>): P.Show<Maybe<A>> {
  return {
    show: match(
      () => 'Nothing',
      (a) => `Just(${S.show(a)})`
    )
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRec_<A, B>(a: A, f: (a: A) => Maybe<Either<A, B>>): Maybe<B> {
  return tailRec_(
    a,
    flow(
      f,
      match(
        () => E.right(M.nothing()),
        E.match(E.left, (b) => E.right(M.just(b)))
      )
    )
  )
}

/**
 * @dataFirst chainRec_
 */
export function chainRec<A, B>(f: (a: A) => Maybe<Either<A, B>>): (a: A) => Maybe<B> {
  return (a) => chainRec_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA_: P.MapAFn_<URI> = (G) => (ta, f) => match_(ta, flow(nothing, G.pure), flow(f, G.map(just)))

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA: P.MapAFn<URI> = (G) => (f) => (ta) => mapA_(G)(ta, f)

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<URI> = (G) => (fa) => mapA_(G)(fa, identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Maybe<void> {
  return just(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const filterMapA_: P.FilterMapAFn_<URI> = (A) => (wa, f) => match_(wa, flow(nothing, A.pure), f)

/**
 * @dataFirst filterMapA_
 */
export const filterMapA: P.FilterMapAFn<URI> = (A) => (f) => (wa) => filterMapA_(A)(wa, f)

export const partitionMapA_: P.PartitionMapAFn_<URI> = (A) => (wa, f) =>
  pipe(
    wa,
    map(
      flow(
        f,
        A.map((e) => tuple(getLeft(e), getRight(e)))
      )
    ),
    getOrElse(() => A.pure(tuple(nothing(), nothing())))
  )

/**
 * @dataFirst partitionMapA_
 */
export const partitionMapA: P.PartitionMapAFn<URI> = (A) => (f) => (wa) => partitionMapA_(A)(wa, f)

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map over a Maybe with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function chainNullableK_<A, B>(fa: Maybe<A>, f: (a: A) => B | null | undefined): Maybe<B> {
  return match_(fa, nothing, flow(f, fromNullable))
}

/**
 * Map over a Maybe with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst chainNullableK_
 */
export function chainNullableK<A, B>(f: (a: A) => B | null | undefined): (fa: Maybe<A>) => Maybe<B> {
  return (fa) => chainNullableK_(fa, f)
}

/**
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse_<A, B>(fa: Maybe<A>, onNothing: () => Maybe<B>): Maybe<A | B> {
  return isNothing(fa) ? onNothing() : fa
}

/**
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst orElse_
 */
export function orElse<B>(onNothing: () => Maybe<B>): <A>(fa: Maybe<A>) => Maybe<B | A> {
  return (fa) => orElse_(fa, onNothing)
}

/**
 * Evaluates an `Either` and returns a `Maybe` carrying the left value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getLeft<E, A>(fea: Either<E, A>): Maybe<E> {
  return E.match_(fea, just, nothing)
}

/**
 * Evaluates an `Either` and returns a `Maybe` carrying the right value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getRight<E, A>(fea: Either<E, A>): Maybe<A> {
  return E.match_(fea, nothing, just)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guard
 * -------------------------------------------------------------------------------------------------
 */

export function getGuard<A>(guard: G.Guard<unknown, A>): G.Guard<unknown, Maybe<A>> {
  return G.Guard((u): u is Maybe<A> => isMaybe(u) && match_(u, () => true, guard.is))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Align = P.Align<URI>({
  map_,
  alignWith_,
  nil: nothing
})

export const Functor = P.Functor<URI>({
  map_
})

export const Alt = P.Alt<URI>({
  map_,
  alt_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)
export const mapN      = P.mapNF(SemimonoidalFunctor)
export const crossT_   = P.crossTF_(SemimonoidalFunctor)
/**
 * @dataFirst crossT_
 */
export const crossT  = P.crossTF(SemimonoidalFunctor)
export const crossS_ = P.crossSF_(SemimonoidalFunctor)
/**
 * @dataFirst crossS_
 */
export const crossS = P.crossSF(SemimonoidalFunctor)

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

/**
 * A pipeable version of `sequenceS`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apS: <N extends string, A, B>(
  name: Exclude<N, keyof A>,
  fb: Maybe<B>
) => (fa: Maybe<A>) => Maybe<{
  [K in keyof A | N]: K extends keyof A ? A[K] : B
}> = P.apSF(Apply)

export const apT = P.apTF(Apply)

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeExcept = P.ApplicativeExcept<URI, HKT.Fix<'E', void>>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  catchAll_,
  fail
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, HKT.Fix<'E', void>>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  catchAll_,
  fail
})

export const Do = P.Do(Monad)

const of: Maybe<{}> = just({})
export { of as do }

/**
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const chainS_ = P.chainSF_(Monad)

/**
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 *
 * @dataFirst chainS_
 */
export const chainS = P.chainSF(Monad)

/**
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const pureS_ = P.pureSF_(Monad)

/**
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 *
 * @dataFirst pureS_
 */
export const pureS = P.pureSF(Monad)

/**
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 */
export const toS_ = P.toSF_(Monad)

/**
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 *
 * @dataFirst toS_
 */
export const toS = P.toSF(Monad)

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const Traversable = P.Traversable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  mapA_
})

export const Witherable = P.Witherable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  mapA_,
  filterMapA_,
  partitionMapA_
})

export { MaybeURI } from './Modules'
