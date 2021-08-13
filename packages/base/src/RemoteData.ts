import type * as HKT from './HKT'
import type { Either } from './internal/Either'
import type { RemoteDataURI } from './Modules'
import type { Option } from './Option'
import type { Monoid, Predicate, Refinement } from './prelude'

import * as E from './Either'
import * as N from './number'
import * as O from './Option'
import * as P from './prelude'
import { flow, isObject, pipe, tuple } from './prelude'

type URI = [HKT.URI<RemoteDataURI>]

export type V = HKT.V<'E', '+'>

export const RemoteDataTypeId = Symbol.for('@principia/base/RemoteData')
export type RemoteDataTypeId = typeof RemoteDataTypeId

export class Initial {
  readonly _E!: () => never
  readonly _A!: () => never;
  readonly [RemoteDataTypeId]: RemoteDataTypeId = RemoteDataTypeId
  readonly _tag = 'Initial'
}

export class Loading {
  readonly _E!: () => never
  readonly _A!: () => never;
  readonly [RemoteDataTypeId]: RemoteDataTypeId = RemoteDataTypeId
  readonly _tag = 'Loading'
  constructor(readonly progress: Option<Progress>) {}
}

export class Success<A> {
  readonly _E!: () => never
  readonly _A!: () => A;
  readonly [RemoteDataTypeId]: RemoteDataTypeId = RemoteDataTypeId
  readonly _tag = 'Success'
  constructor(readonly value: A) {}
}

export class Failure<E> {
  readonly _E!: () => E
  readonly _A!: () => never;
  readonly [RemoteDataTypeId]: RemoteDataTypeId = RemoteDataTypeId
  readonly _tag = 'Failure'
  constructor(readonly error: E) {}
}

export interface Progress {
  readonly loaded: number
  readonly total: Option<number>
}

export type RemoteData<E, A> = Initial | Loading | Success<A> | Failure<E>

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function succeed<E = never, A = never>(value: A): RemoteData<E, A> {
  return new Success(value)
}

export function fail<E = never, A = never>(error: E): RemoteData<E, A> {
  return new Failure(error)
}

const _initial = new Initial()

export function initial<E = never, A = never>(): RemoteData<E, A> {
  return _initial
}

const _loading = new Loading(O.none())

export function loading<E = never, A = never>(): RemoteData<E, A> {
  return _loading
}

export function progress<E = never, A = never>(progress: Progress): RemoteData<E, A> {
  return new Loading(O.some(progress))
}

export function fromOption_<E = never, A = never>(option: Option<A>, error?: () => E): RemoteData<E, A> {
  return O.match_(option, () => (error ? fail(error()) : initial()), succeed)
}

export function fromOption<E = never>(error?: () => E): <A>(option: Option<A>) => RemoteData<E, A> {
  return (option) => fromOption_(option, error)
}

export function fromEither<E, A>(either: Either<E, A>): RemoteData<E, A> {
  return E.match_(either, fail, succeed)
}

export function fromPredicate_<E, A, B extends A>(
  value: A,
  refinement: Refinement<A, B>,
  onFalse: (value: A) => E
): RemoteData<E, B>
export function fromPredicate_<E, A>(value: A, predicate: Predicate<A>, onFalse: (value: A) => E): RemoteData<E, A>
export function fromPredicate_<E, A>(value: A, predicate: Predicate<A>, onFalse: (value: A) => E): RemoteData<E, A> {
  return predicate(value) ? succeed(value) : fail(onFalse(value))
}

export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (value: A) => E
): (value: A) => RemoteData<E, B>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (value: A) => E): (value: A) => RemoteData<E, A>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (value: A) => E): (value: A) => RemoteData<E, A> {
  return (value) => fromPredicate_(value, predicate, onFalse)
}

/*
 * -------------------------------------------------------------------------------------------------
 * guards
 * -------------------------------------------------------------------------------------------------
 */

export function isRemoteData<E, A>(u: unknown): u is RemoteData<E, A> {
  return isObject(u) && RemoteDataTypeId in u
}

export function isInitial<E = never, A = never>(rd: RemoteData<E, A>): rd is Initial {
  return rd._tag === 'Initial'
}

export function isLoading<E = never, A = never>(rd: RemoteData<E, A>): rd is Loading {
  return rd._tag === 'Loading'
}

export function isSuccess<E = never, A = never>(rd: RemoteData<E, A>): rd is Success<A> {
  return rd._tag === 'Success'
}

export function isFailure<E = never, A = never>(rd: RemoteData<E, A>): rd is Failure<E> {
  return rd._tag === 'Failure'
}

/*
 * -------------------------------------------------------------------------------------------------
 * match
 * -------------------------------------------------------------------------------------------------
 */

export function match_<E, A, B, C, D, F>(
  rd: RemoteData<E, A>,
  onInitial: () => B,
  onLoading: (progress: Option<Progress>) => C,
  onFailure: (error: E) => D,
  onSuccess: (value: A) => F
): B | C | D | F {
  switch (rd._tag) {
    case 'Initial':
      return onInitial()
    case 'Loading':
      return onLoading(rd.progress)
    case 'Failure':
      return onFailure(rd.error)
    case 'Success':
      return onSuccess(rd.value)
  }
}

export function match<E, A, B, C, D, F>(
  onInitial: () => B,
  onLoading: (progress: Option<Progress>) => C,
  onFailure: (error: E) => D,
  onSuccess: (value: A) => F
): (rd: RemoteData<E, A>) => B | C | D | F {
  return (rd) => match_(rd, onInitial, onLoading, onFailure, onSuccess)
}

export function matchNone_<E, A, B, C, D>(
  rd: RemoteData<E, A>,
  onNone: (progress: Option<Progress>) => B,
  onFailure: (error: E) => C,
  onSuccess: (value: A) => D
): B | C | D {
  return match_(rd, () => onNone(O.none()), onNone, onFailure, onSuccess)
}

export function matchNone<E, A, B, C, D>(
  onNone: (progress: Option<Progress>) => B,
  onFailure: (error: E) => C,
  onSuccess: (value: A) => D
): (rd: RemoteData<E, A>) => B | C | D {
  return (rd) => matchNone_(rd, onNone, onFailure, onSuccess)
}

export function matchRemoteData_<E, A, E1, B, E2, C>(
  fa: RemoteData<E, A>,
  onError: (error: E) => RemoteData<E1, B>,
  onSuccess: (value: A) => RemoteData<E2, C>
): RemoteData<E1 | E2, B | C> {
  switch (fa._tag) {
    case 'Failure': {
      return onError(fa.error)
    }
    case 'Success': {
      return onSuccess(fa.value)
    }
    default: {
      return fa
    }
  }
}

export function matchRemoteData<E, A, E1, B, E2, C>(
  onError: (error: E) => RemoteData<E1, B>,
  onSuccess: (value: A) => RemoteData<E2, C>
): (fa: RemoteData<E, A>) => RemoteData<E1 | E2, B | C> {
  return (fa) => matchRemoteData_(fa, onError, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure = succeed

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

function combineLoadings<E, A>(fa: Loading, fb: Loading): RemoteData<E, A> {
  if (O.isSome(fa.progress) && O.isSome(fb.progress)) {
    const progressA = fa.progress.value
    const progressB = fb.progress.value
    if (O.isNone(progressA.total) || O.isNone(progressB.total)) {
      return progress({
        loaded: progressA.loaded + progressB.loaded,
        total: O.none()
      })
    }
    const totalA = progressA.total.value
    const totalB = progressB.total.value
    const total  = totalA + totalB
    const loaded = (progressA.loaded * totalA + progressB.loaded * totalB) / (total ^ 2)
    return progress({
      loaded,
      total: O.some(total)
    })
  }
  return O.isNone(fa.progress) ? fb : O.isNone(fb.progress) ? fa : loading()
}

export function ap_<E, A, E1, B>(fab: RemoteData<E, (a: A) => B>, fa: RemoteData<E1, A>): RemoteData<E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<E1, A>(fa: RemoteData<E1, A>): <E, B>(fab: RemoteData<E1, (a: A) => B>) => RemoteData<E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function crossWith_<E, A, E1, B, C>(
  fa: RemoteData<E, A>,
  fb: RemoteData<E1, B>,
  f: (a: A, b: B) => C
): RemoteData<E | E1, C> {
  switch (fa._tag) {
    case 'Initial':
      return isFailure(fb) ? fb : initial()
    case 'Loading':
      return isLoading(fb) ? combineLoadings(fa, fb) : isSuccess(fb) ? fa : fb
    case 'Failure':
      return isFailure(fb) ? fb : fa
    case 'Success':
      return isSuccess(fb) ? succeed(f(fa.value, fb.value)) : fb
  }
}

export function crossWith<A, E1, B, C>(
  fb: RemoteData<E1, B>,
  f: (a: A, b: B) => C
): <E>(fa: RemoteData<E, A>) => RemoteData<E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<E, A, E1, B>(fa: RemoteData<E, A>, fb: RemoteData<E1, B>): RemoteData<E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<E1, B>(
  fb: RemoteData<E1, B>
): <E, A>(fa: RemoteData<E, A>) => RemoteData<E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossFirst_<E, A, E1, B>(fa: RemoteData<E, A>, fb: RemoteData<E1, B>): RemoteData<E | E1, A> {
  return crossWith_(fa, fb, (a) => a)
}

export function crossFirst<E1, B>(fb: RemoteData<E1, B>): <E, A>(fa: RemoteData<E, A>) => RemoteData<E | E1, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<E, A, E1, B>(fa: RemoteData<E, A>, fb: RemoteData<E1, B>): RemoteData<E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<E1, B>(fb: RemoteData<E1, B>): <E, A>(fa: RemoteData<E, A>) => RemoteData<E | E1, B> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<E, A, E1, B>(pab: RemoteData<E, A>, f: (error: E) => E1, g: (value: A) => B): RemoteData<E1, B> {
  return pipe(pab, mapLeft(f), map(g))
}

export function bimap<E, A, E1, B>(
  f: (error: E) => E1,
  g: (value: A) => B
): (pab: RemoteData<E, A>) => RemoteData<E1, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<E, A, E1>(pab: RemoteData<E, A>, f: (error: E) => E1): RemoteData<E1, A> {
  return pab._tag === 'Failure' ? fail(f(pab.error)) : pab
}

export function mapLeft<E, E1>(f: (error: E) => E1): <A>(pab: RemoteData<E, A>) => RemoteData<E1, A> {
  return (pab) => mapLeft_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<E, A>(EE: P.Eq<E>, EA: P.Eq<A>): P.Eq<RemoteData<E, A>> {
  return P.Eq((x, y) =>
    pipe(
      x,
      match(
        () => isInitial(y),
        () => isLoading(y),
        (error) => isFailure(y) && EE.equals_(error, y.error),
        (value) => isSuccess(y) && EA.equals_(value, y.value)
      )
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<E, A, B>(fa: RemoteData<E, A>, b: B, f: (b: B, a: A) => B): B {
  return match_(
    fa,
    () => b,
    () => b,
    () => b,
    (a) => f(b, a)
  )
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: RemoteData<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<E, A, B>(fa: RemoteData<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isSuccess(fa) ? f(fa.value, b) : b
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: RemoteData<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: Monoid<M>): <E, A>(fa: RemoteData<E, A>, f: (value: A) => M) => M {
  return (fa, f) => (isSuccess(fa) ? f(fa.value) : M.nat)
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (value: A) => M) => <E>(fa: RemoteData<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: RemoteData<E, A>, f: (a: A) => B): RemoteData<E, B> {
  return fa._tag === 'Success' ? succeed(f(fa.value)) : fa
}

export function map<A, B>(f: (a: A) => B): <E>(fa: RemoteData<E, A>) => RemoteData<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<E, A, E1, B>(ma: RemoteData<E, A>, f: (a: A) => RemoteData<E1, B>): RemoteData<E | E1, B> {
  return ma._tag === 'Success' ? f(ma.value) : ma
}

export function chain<A, E1, B>(f: (a: A) => RemoteData<E1, B>): <E>(ma: RemoteData<E, A>) => RemoteData<E | E1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<E, E1, A>(mma: RemoteData<E, RemoteData<E1, A>>): RemoteData<E | E1, A> {
  return chain_(mma, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

export function catchAll_<E, A, E1, B>(
  ma: RemoteData<E, A>,
  f: (error: E) => RemoteData<E1, B>
): RemoteData<E1, A | B> {
  return ma._tag === 'Failure' ? f(ma.error) : ma
}

export function catchAll<E, E1, B>(
  f: (error: E) => RemoteData<E1, B>
): <A>(ma: RemoteData<E, A>) => RemoteData<E1, A | B> {
  return (ma) => catchAll_(ma, f)
}

export function catchSome_<E, A, E1, B>(
  ma: RemoteData<E, A>,
  f: (error: E) => Option<RemoteData<E1, B>>
): RemoteData<E | E1, A | B> {
  return catchAll_(
    ma,
    flow(
      f,
      O.getOrElse<RemoteData<E | E1, A | B>>(() => ma)
    )
  )
}

export function catchSome<E, E1, B>(
  f: (error: E) => Option<RemoteData<E1, B>>
): <A>(ma: RemoteData<E, A>) => RemoteData<E | E1, A | B> {
  return (ma) => catchSome_(ma, f)
}

export function either<E, A>(ma: RemoteData<E, A>): RemoteData<never, Either<E, A>> {
  return pipe(ma, map(E.right), catchAll(flow(E.left, succeed)))
}

export function subsumeEither<E, E1, A>(ma: RemoteData<E, Either<E1, A>>): RemoteData<E | E1, A> {
  return chain_(ma, E.match(fail, succeed))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getMonoid<E, A>(ME: P.Monoid<E>, MA: P.Monoid<A>): P.Monoid<RemoteData<E, A>> {
  const S = getSemigroup(ME, MA)
  return P.Monoid(S.combine_, initial())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getSemigroup<E, A>(SE: P.Semigroup<E>, SA: P.Semigroup<A>): P.Semigroup<RemoteData<E, A>> {
  return P.Semigroup((x, y) =>
    pipe(
      x,
      match(
        () => y,
        () => (isInitial(y) ? x : isLoading(y) ? combineLoadings(x as Loading, y) : y),
        (error) => (isFailure(y) ? fail(SE.combine_(error, y.error)) : isSuccess(y) ? y : x),
        (value) => (isSuccess(y) ? succeed(SA.combine_(value, y.value)) : x)
      )
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

const showOptionNumber = O.getShow(N.Show).show

export function getShow<E, A>(SE: P.Show<E>, SA: P.Show<A>): P.Show<RemoteData<E, A>> {
  return P.Show(
    match(
      () => 'Initial()',
      O.match(
        () => 'Loading()',
        (progress) => `Loading({ loaded: ${progress.loaded}, total: ${showOptionNumber(progress.total)} })`
      ),
      (error) => `Failure(${SE.show(error)})`,
      (value) => `Success(${SA.show(value)})`
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapAFn_<URI, V> = (A) => (ta, f) => isSuccess(ta) ? A.map_(f(ta.value), succeed) : A.pure(ta)

export const mapA: P.MapAFn<URI, V> = (A) => {
  const mapAA_ = mapA_(A)
  return (f) => (ta) => mapAA_(ta, f)
}

export const sequence: P.SequenceFn<URI, V> = (A) => {
  const mapAA_ = mapA_(A)
  return (ta) => mapAA_(ta, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): RemoteData<never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function elem_<A>(E: P.Eq<A>): <E>(fa: RemoteData<E, A>, a: A) => boolean {
  return (fa, a) => fa._tag === 'Success' && E.equals_(a, fa.value)
}

export function elem<A>(E: P.Eq<A>): (a: A) => <E>(fa: RemoteData<E, A>) => boolean {
  return (a) => (fa) => elem_(E)(fa, a)
}

export function exists_<E, A>(fa: RemoteData<E, A>, predicate: P.Predicate<A>): boolean {
  return fa._tag === 'Success' && predicate(fa.value)
}

export function exists<A>(predicate: P.Predicate<A>): <E>(fa: RemoteData<E, A>) => boolean {
  return (fa) => exists_(fa, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI, V>({ map_ })

export const Bifunctor = P.Bifunctor<URI, V>({ bimap_, mapLeft_, mapRight_: map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, V>({
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

export const Foldable = P.Foldable<URI, V>({
  foldl_,
  foldr_,
  foldMap_
})

export const Traversable = P.Traversable<URI, V>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  mapA_
})
