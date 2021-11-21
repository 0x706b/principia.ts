/**
 * Everybody's favorite sum type
 *
 * Either represents values with two possibilities: Left<E> or Right<A>
 * By convention, the _Left_ constructor is used to hold an Error value
 * and the _Right_ constructor is used to hold a correct value
 */

import type { FunctionN } from './function'
import type { Either, Left, Right } from './internal/Either'
import type { Maybe } from './Maybe'
import type { NonEmptyArray } from './NonEmptyArray'
import type { These } from './These'

import { NoSuchElementError } from './Error'
import { flow, identity, pipe } from './function'
import { genF, GenHKT } from './Gen'
import * as HKT from './HKT'
import * as _ from './internal/Either'
import * as M from './Maybe'
import * as P from './prelude'
import { tailRec_ } from './TailRec'
import * as T from './These'
import { tuple } from './tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export { Either, Left, Right } from './internal/Either'

export type InferLeft<T extends Either<any, any>> = T extends Left<infer E> ? E : never

export type InferRight<T extends Either<any, any>> = T extends Right<infer A> ? A : never

export interface EitherF extends HKT.HKT {
  readonly type: Either<this['E'], this['A']>
  readonly variance: {
    readonly E: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable_<E, A>(a: A, e: () => E): Either<E, NonNullable<A>> {
  return a == null ? left(e()) : right(a as NonNullable<A>)
}

/**
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst fromNullable_
 */
export function fromNullable<E>(e: () => E): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A): Either<E, NonNullable<A>> => (a == null ? left(e()) : right(a as NonNullable<A>))
}

export function fromNullableK<E, A extends ReadonlyArray<unknown>, B>(
  f: (...args: A) => B | null | undefined,
  e: () => E
): (...args: A) => Either<E, NonNullable<B>> {
  const from = fromNullable(e)
  return (...args) => from(f(...args))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromMaybe_<E, A>(fa: Maybe<A>, onNothing: () => E): Either<E, A> {
  return M.match_(fa, flow(onNothing, left), right)
}

/**
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst fromMaybe_
 */
export function fromMaybe<E>(onNothing: () => E): <A>(fa: Maybe<A>) => Either<E, A> {
  return (fa) => fromMaybe_(fa, onNothing)
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<E, A, B extends A>(
  a: A,
  refinement: P.Refinement<A, B>,
  onFalse: (a: A) => E
): Either<E, B>
export function fromPredicate_<E, A>(a: A, predicate: P.Predicate<A>, onFalse: (a: A) => E): Either<E, A>
export function fromPredicate_<E, A>(a: A, predicate: P.Predicate<A>, onFalse: (a: A) => E): Either<E, A> {
  return predicate(a) ? right(a) : left(onFalse(a))
}

/**
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst fromPredicate_
 */
export function fromPredicate<E, A, B extends A>(
  refinement: P.Refinement<A, B>,
  onFalse: (a: A) => E
): (a: A) => Either<E, B>
export function fromPredicate<E, A>(predicate: P.Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
export function fromPredicate<E, A>(predicate: P.Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A> {
  return (a) => fromPredicate_(a, predicate, onFalse)
}

/**
 * Constructs a new `Either` holding a `Left` value.
 * This usually represents a failure, due to the right-bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export const left = _.left

/**
 * Constructs a new `Either` holding a `Right` value.
 * This usually represents a successful value due to the right bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export const right = _.right

/**
 * Constructs a new `Either` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch<E, A>(thunk: () => A, onThrow: (e: unknown) => E): Either<E, A> {
  try {
    return right(thunk())
  } catch (e) {
    return left(onThrow(e))
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK_<A extends ReadonlyArray<unknown>, B, E>(
  f: FunctionN<A, B>,
  onThrow: (reason: unknown) => E
): (...args: A) => Either<E, B> {
  return (...a) => tryCatch(() => f(...a), onThrow)
}

/**
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst tryCatchK_
 */
export function tryCatchK<E>(
  onThrow: (reason: unknown) => E
): <A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>) => (...args: A) => Either<E, B> {
  return (f) => tryCatchK_(f, onThrow)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEither(u: unknown): u is Either<unknown, unknown> {
  return typeof u === 'object' && u != null && '_tag' in u && (u['_tag'] === 'Left' || u['_tag'] === 'Right')
}

/**
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isLeft<E, A>(fa: Either<E, A>): fa is Left<E> {
  return fa._tag === 'Left'
}

/**
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isRight<E, A>(fa: Either<E, A>): fa is Right<A> {
  return fa._tag === 'Right'
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const match_ = _.match_

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst match_
 */
export const match = _.match

/**
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<E, A, B>(pab: Either<E, A>, onLeft: (e: E) => B): A | B {
  return match_(pab, onLeft, identity)
}

/**
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst getOrElse_
 */
export function getOrElse<E, A, B>(f: (e: E) => B): (pab: Either<E, A>) => A | B {
  return (pab) => getOrElse_(pab, f)
}

/**
 * @category Destructors
 * @since 1.0.0
 */
export function merge<E, A>(pab: Either<E, A>): E | A {
  return match_(pab, identity, identity as any)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<E, A, E1, B, C>(
  fa: Either<E, A>,
  fb: Either<E1, B>,
  f: (_: These<A, B>) => C
): Either<E | E1, C> {
  return fa._tag === 'Left'
    ? fb._tag === 'Left'
      ? fa
      : right(f(T.right(fb.right)))
    : fb._tag === 'Left'
    ? right(f(T.left(fa.right)))
    : right(f(T.both(fa.right, fb.right)))
}

/**
 * @dataFirst alignWith_
 */
export function alignWith<A, E1, B, C>(
  fb: Either<E1, B>,
  f: (_: These<A, B>) => C
): <E>(fa: Either<E, A>) => Either<E | E1, C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<E, A, E1, B>(fa: Either<E, A>, fb: Either<E1, B>): Either<E | E1, These<A, B>> {
  return alignWith_(fa, fb, identity)
}

/**
 * @dataFirst align_
 */
export function align<E1, B>(fb: Either<E1, B>): <E, A>(fa: Either<E, A>) => Either<E | E1, These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> {
  return isLeft(fa) ? that() : fa
}

/**
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 *
 * @dataFirst alt_
 */
export function alt<G, A>(that: () => Either<G, A>): <E>(fa: Either<E, A>) => Either<G | E, A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure expression info an `Either`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <E = never, A = never>(a: A) => Either<E, A> = right

/*
 * -------------------------------------------------------------------------------------------------
 * ApplicativeExcept
 * -------------------------------------------------------------------------------------------------
 */

export function catchAll_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Either<E1, B>): Either<E1, A | B> {
  return match_(fa, f, right)
}

/**
 * @dataFirst catchAll_
 */
export function catchAll<E, E1, B>(f: (e: E) => Either<E1, B>): <A>(fa: Either<E, A>) => Either<E1, A | B> {
  return (fa) => catchAll_(fa, f)
}

export function catchJust_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Maybe<Either<E1, B>>): Either<E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      M.getOrElse((): Either<E | E1, A | B> => fa)
    )
  )
}

/**
 * @dataFirst catchJust_
 */
export function catchJust<E, E1, B>(f: (e: E) => Maybe<Either<E1, B>>): <A>(fa: Either<E, A>) => Either<E | E1, A | B> {
  return (fa) => catchJust_(fa, f)
}

export function catchMap_<E, A, B>(fa: Either<E, A>, f: (e: E) => B): Either<never, A | B> {
  return catchAll_(fa, flow(f, right))
}

/**
 * @dataFirst catchMap_
 */
export function catchMap<E, B>(f: (e: E) => B): <A>(fa: Either<E, A>) => Either<never, A | B> {
  return (fa) => catchMap_(fa, f)
}

export function either<E, A>(fa: Either<E, A>): Either<never, Either<E, A>> {
  return right(fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function _ap<E, A, G, B>(fa: Either<E, A>, fab: Either<G, (a: A) => B>): Either<E | G, B> {
  return match_(fab, left, (f) => match_(fa, left, (a) => right(f(a))))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> {
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
export function ap<E, A>(fa: Either<E, A>): <G, B>(fab: Either<G, (a: A) => B>) => Either<E | G, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossFirst_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst crossFirst_
 */
export function crossFirst<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossSecond_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst crossSecond_
 */
export function crossSecond<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst cross_
 */
export function cross<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossWith_<E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> {
  return match_(fa, left, (a) => match_(fb, left, (b) => right(f(a, b))))
}

/**
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst crossWith_
 */
export function crossWith<A, G, B, C>(
  fb: Either<G, B>,
  f: (a: A, b: B) => C
): <E>(fa: Either<E, A>) => Either<G | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(
  f: (a: A) => (b: B) => C
): <E>(fa: Either<E, A>) => <G>(fb: Either<G, B>) => Either<E | G, C> {
  return (fa) => (fb) => crossWith_(fa, fb, (a, b) => f(a)(b))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function swap<E, A>(pab: Either<E, A>): Either<A, E> {
  return match_(pab, right, left)
}

/**
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> {
  return match_(pab, flow(f, left), flow(g, right))
}

/**
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @dataFirst bimap_
 */
export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Either<E, A>) => Either<G, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapLeft_<E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> {
  return bimap_(pab, f, identity)
}

/**
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @dataFirst mapLeft_
 */
export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: Either<E, A>) => Either<G, A> {
  return (pab) => mapLeft_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function getCompactable<E>(Md: P.Monoid<E>) {
  return HKT.instance<P.Compactable<EitherF, HKT.Fix<'E', E>>>({
    compact: match(
      left,
      M.match(() => left(Md.nat), right)
    ),
    separate: (fa) =>
      match_(
        fa,
        (e) => [left(e), left(e)],
        match(
          (a) => [right(a), left(Md.nat)],
          (b) => [left(Md.nat), right(b)]
        )
      )
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getEq<E, A>(eqE: P.Eq<E>, eqA: P.Eq<A>): P.Eq<Either<E, A>> {
  const equals_ = (x: Either<E, A>, y: Either<E, A>) =>
    x === y ||
    match_(
      x,
      (e1) =>
        match_(
          y,
          (e2) => eqE.equals_(e1, e2),
          () => false
        ),
      (a1) =>
        match_(
          y,
          () => false,
          (a2) => eqA.equals_(a1, a2)
        )
    )
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend_<E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> {
  return isLeft(wa) ? wa : right(f(wa))
}

/**
 * @category Extend
 * @since 1.0.0
 *
 * @dataFirst extend_
 */
export function extend<E, A, B>(f: (wa: Either<E, A>) => B): (wa: Either<E, A>) => Either<E, B> {
  return (wa) => extend_(wa, f)
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<E, A>(wa: Either<E, A>): Either<E, Either<E, A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Builds a `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getFilterable<E>(Md: P.Monoid<E>) {
  type FixE = HKT.Fix<'E', E>

  const empty = left(Md.nat)

  const partitionMap_: P.PartitionMapFn_<EitherF, FixE> = (fa, f) =>
    match_(
      fa,
      (e) => [left(e), left(e)],
      (a) =>
        match_(
          f(a),
          (b) => [right(b), empty],
          (b1) => [empty, right(b1)]
        )
    )

  const partition_: P.PartitionFn_<EitherF, FixE> = <A>(
    fa: Either<E, A>,
    predicate: P.Predicate<A>
  ): readonly [Either<E, A>, Either<E, A>] =>
    match_(
      fa,
      (e) => [left(e), left(e)],
      (a) => (predicate(a) ? [empty, right(a)] : [right(a), empty])
    )

  const filterMap_: P.FilterMapFn_<EitherF, FixE> = (fa, f) =>
    match_(fa, left, (a) => M.match_(f(a), () => empty, right))

  const filter_: P.FilterFn_<EitherF, FixE> = <A>(fa: Either<E, A>, predicate: P.Predicate<A>): Either<E, A> =>
    match_(fa, left, (a) => (predicate(a) ? right(a) : empty))

  return P.Filterable<EitherF, FixE>({
    map_,
    filter_,
    filterMap_,
    partition_,
    partitionMap_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B {
  return match_(
    fa,
    () => b,
    (a) => f(b, a)
  )
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: Either<E, A>, f: (a: A) => M) => M {
  return (fa, f) => match_(fa, () => M.nat, f)
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function foldr_<E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B {
  return match_(
    fa,
    () => b,
    (a) => f(a, b)
  )
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
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
export function map_<E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> {
  return match_(fa, left, flow(f, right))
}

/**
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Either<E, A>) => Either<E, B> {
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
export function chain_<E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> {
  return match_(fa, left, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst chain_
 */
export function chain<A, G, B>(f: (e: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, B> {
  return (ma) => chain_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> {
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
 * @dataFirst chain_
 */
export function tap<A, G, B>(f: (a: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, A> {
  return (ma) => tap_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Either`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E, G, A>(mma: Either<E, Either<G, A>>): Either<E | G, A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

export const subsumeEither = flatten

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_: P.CombineFn_<Either<E, A>> = (x, y) =>
    match_(
      y,
      () => x,
      (a1) =>
        match_(
          x,
          () => y,
          (a2) => right(S.combine_(a1, a2))
        )
    )

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

/**
 * @category Instances
 * @since 1.0.0
 */
export function getShow<E, A>(showE: P.Show<E>, showA: P.Show<A>): P.Show<Either<E, A>> {
  return {
    show: match(
      (e) => `left(${showE.show(e)})`,
      (a) => `right(${showA.show(a)})`
    )
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRec_<E, A, B>(a: A, f: (a: A) => Either<E, Either<A, B>>): Either<E, B> {
  return tailRec_(
    a,
    flow(
      f,
      match(
        (e) => right(left(e)),
        match(left, (b) => right(right(b)))
      )
    )
  )
}

/**
 * @dataFirst chainRec_
 */
export function chainRec<E, A, B>(f: (a: A) => Either<E, Either<A, B>>): (a: A) => Either<E, B> {
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
export const traverse_: P.TraverseFn_<EitherF> = (AG) => (ta, f) =>
  match_(ta, flow(left, AG.pure), flow(f, AG.map(right)))

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<EitherF> = (AG) => (f) => (ta) => traverse_(AG)(ta, f)

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<EitherF> = (AG) => (ta) => traverse_(AG)(ta, identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * The unit `Either`
 */
export function unit<E = never>(): Either<E, void> {
  return right(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getWitherable<E>(M: P.Monoid<E>) {
  type V_ = HKT.Fix<'E', E>

  const Compactable = getCompactable(M)

  const wither_: P.WitherFn_<EitherF, V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.compact))
  }

  const wilt_: P.WiltFn_<EitherF, V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.separate))
  }

  return P.Witherable<EitherF, V_>({
    ...getFilterable(M),
    foldl_,
    foldr_,
    foldMap_,
    traverse_,
    wither_,
    wilt_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor = P.Functor<EitherF>({
  map_
})

export const flap_: <E, A, B>(fa: Either<E, (a: A) => B>, a: A) => Either<E, B> = P.flapF_<EitherF>(Functor)

/**
 * @dataFirst flap_
 */
export const flap: <A>(a: A) => <E, B>(fab: Either<E, (a: A) => B>) => Either<E, B> = P.flapF<EitherF>(Functor)

export const as_: <E, A, B>(fa: Either<E, A>, b: () => B) => Either<E, B> = P.asF_<EitherF>(Functor)

/**
 * @dataFirst as_
 */
export const as: <B>(b: () => B) => <E, A>(fa: Either<E, A>) => Either<E, B> = P.asF<EitherF>(Functor)

export const fcross_: <E, A, B>(fa: Either<E, A>, f: (a: A) => B) => Either<E, readonly [A, B]> =
  P.fcrossF_<EitherF>(Functor)

/**
 * @dataFirst fcross_
 */
export const fcross: <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>) => Either<E, readonly [A, B]> =
  P.fcrossF<EitherF>(Functor)

export const tupled: <E, A>(fa: Either<E, A>) => Either<E, readonly [A]> = P.tupledF(Functor)

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor = P.Bifunctor<EitherF>({
  mapLeft_,
  mapRight_: map_,
  bimap_
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt = P.Alt<EitherF>({
  map_,
  alt_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<EitherF>({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const mapN_     = P.mapNF_(SemimonoidalFunctor)
/**
 * @dataFirst mapN_
 */
export const mapN      = P.mapNF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)
export const crossS_   = P.crossSF_(SemimonoidalFunctor)
/**
 * @dataFirst crossS_
 */
export const crossS  = P.crossSF(SemimonoidalFunctor)
export const crossT_ = P.crossTF_(SemimonoidalFunctor)
/**
 * @dataFirst crossT_
 */
export const crossT = P.crossTF(SemimonoidalFunctor)

export const Apply = P.Apply<EitherF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const apS = P.apSF(Apply)
export const apT = P.apTF(Apply)

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonoidalFunctor = P.MonoidalFunctor<EitherF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<EitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Fail = P.Fail<EitherF>({
  fail: left
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad = P.Monad<EitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  chain_,
  flatten,
  pure,
  unit
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const ApplicativeExcept = P.ApplicativeExcept<EitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  catchAll_,
  fail: left
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadExcept = P.MonadExcept<EitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  chain_,
  flatten,
  catchAll_,
  fail: left
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable = P.Foldable<EitherF>({
  foldl_,
  foldMap_,
  foldr_
})

/**
 * @category Instances
 * @since 1.0.0
 */

export const Semialign = P.Semialign<EitherF>({
  map_,
  alignWith_
})

export const alignCombine_ = P.alignCombineF_<EitherF>({ map_, align_, alignWith_ })
/**
 * @dataFirst alignCombine_
 */
export const alignCombine = P.alignCombineF<EitherF>({ map_, align_, alignWith_ })
export const padZip_      = P.padZipF_<EitherF>({ map_, align_, alignWith_ })
/**
 * @dataFirst padZip_
 */
export const padZip      = P.padZipF<EitherF>({ map_, align_, alignWith_ })
export const padZipWith_ = P.padZipWithF_<EitherF>({ map_, align_, alignWith_ })
/**
 * @dataFirst padZipWith_
 */
export const padZipWith = P.padZipWithF<EitherF>({ map_, align_, alignWith_ })
export const zipAll_    = P.zipAllF_<EitherF>({ map_, align_, alignWith_ })
/**
 * @dataFirst zipAll_
 */
export const zipAll = P.zipAllF<EitherF>({ map_, align_, alignWith_ })

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable = P.Traversable<EitherF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

/*
 * -------------------------------------------------------------------------------------------------
 * Do
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Do
 * @since 1.0.0
 */
export const Do = P.Do(Monad)

/**
 * @category Do
 * @since 1.0.0
 */
const of: Either<never, {}> = right({})
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

/*
 * -------------------------------------------------------------------------------------------------
 * Validation
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplicativeValidation<E>(S: P.Semigroup<E>): P.Applicative<EitherF, HKT.Fix<'E', E>> {
  type FixE = HKT.Fix<'E', E>

  const crossWithV_: P.CrossWithFn_<EitherF, FixE> = (fa, fb, f) =>
    match_(
      fa,
      (e1) =>
        match_(
          fb,
          (e2) => left(S.combine_(e1, e2)),
          () => left(e1)
        ),
      (a) => match_(fb, left, (b) => right(f(a, b)))
    )

  const apV_: P.ApFn_<EitherF, FixE> = (fab, fa) =>
    match_(
      fab,
      (e1) =>
        match_(
          fa,
          (e2) => left(S.combine_(e1, e2)),
          () => left(e1)
        ),
      (f) => match_(fa, left, (a) => right(f(a)))
    )

  return P.Applicative({
    map_,
    crossWith_: crossWithV_,
    ap_: apV_,
    pure,
    unit
  })
}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getAltValidation<E>(S: P.Semigroup<E>): P.Alt<EitherF, HKT.Fix<'E', E>> {
  type FixE = HKT.Fix<'E', E>

  const altV_: P.AltFn_<EitherF, FixE> = (fa, that) =>
    match_(fa, (e1) => match_(that(), (e2) => left(S.combine_(e1, e2)), right), right)

  return P.Alt({
    map_,
    alt_: altV_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

const adapter: {
  <E, A>(_: Maybe<A>, onNothing: () => E): GenHKT<Either<E, A>, A>
  <A>(_: Maybe<A>): GenHKT<Either<NoSuchElementError, A>, A>
  <E, A>(_: Either<E, A>): GenHKT<Either<E, A>, A>
} = (_: any, __?: any) => {
  if (M.isMaybe(_)) {
    return new GenHKT(fromMaybe_(_, () => (__ ? __() : new NoSuchElementError('Either.gen'))))
  }
  return new GenHKT(_)
}

export const gen = genF(Monad, { adapter })

/*
 * -------------------------------------------------------------------------------------------------
 * Util
 * -------------------------------------------------------------------------------------------------
 */

export function traverseArray_<A, E, B>(
  as: NonEmptyArray<A>,
  f: (a: A, i: number) => Either<E, B>
): Either<E, NonEmptyArray<B>>
export function traverseArray_<A, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Either<E, B>
): Either<E, ReadonlyArray<B>>
export function traverseArray_<A, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Either<E, B>
): Either<E, ReadonlyArray<B>> {
  if (as.length === 0) {
    return right([])
  }

  const e = f(as[0], 0)
  if (e._tag === 'Left') {
    return e
  }
  const out: P.Mutable<NonEmptyArray<B>> = [e.right]
  for (let i = 1; i < as.length; i++) {
    const e = f(as[i], i)
    if (e._tag === 'Left') {
      return e
    }
    out.push(e.right)
  }
  return right(out)
}

export function traverseArray<A, E, B>(
  f: (a: A, i: number) => Either<E, B>
): (as: NonEmptyArray<A>) => Either<E, NonEmptyArray<B>>
export function traverseArray<A, E, B>(
  f: (a: A, i: number) => Either<E, B>
): (as: ReadonlyArray<A>) => Either<E, ReadonlyArray<B>>
export function traverseArray<A, E, B>(
  f: (a: A, i: number) => Either<E, B>
): (as: NonEmptyArray<A>) => Either<E, ReadonlyArray<B>> {
  return (as) => traverseArray_(as, f)
}

export function sequenceArray<E, A>(as: NonEmptyArray<Either<E, A>>): Either<E, NonEmptyArray<A>>
export function sequenceArray<E, A>(as: ReadonlyArray<Either<E, A>>): Either<E, ReadonlyArray<A>>
export function sequenceArray<E, A>(as: ReadonlyArray<Either<E, A>>): Either<E, ReadonlyArray<A>> {
  return traverseArray_(as, identity)
}

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(fa: T) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T =
  identity as any

export function widenE<E1>(): <E, A>(fa: Either<E, A>) => Either<E1 | E, A> {
  return identity
}

export function widenA<A1>(): <E, A>(fa: Either<E, A>) => Either<E, A1 | A> {
  return identity
}
