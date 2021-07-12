import type * as HKT from './HKT'
import type { ZStateURI } from './Modules'

import * as P from './prelude'
import * as Z from './Z'

export interface ZState<S, A> extends Z.Z<never, S, S, unknown, never, A> {}

export type V = HKT.V<'S', '_'>

/*
 * -------------------------------------------------------------------------------------------------
 * State
 * -------------------------------------------------------------------------------------------------
 */

export const get: <S>() => ZState<S, S> = Z.get

export const put: <S>(s: S) => ZState<S, void> = Z.put

export const modify: <S, A>(f: (s: S) => readonly [A, S]) => ZState<S, A> = Z.modify

export const gets: <S, A>(f: (s: S) => A) => ZState<S, A> = Z.gets

export const getsM: <S, A>(f: (s: S) => ZState<S, A>) => ZState<S, A> = Z.getsZ

export const execute_: <S, A>(ma: ZState<S, A>, s: S) => S = Z.runState_

export const execute: <S>(s: S) => <A>(ma: ZState<S, A>) => S = Z.runState

export const evaluate_: <S, A>(ma: ZState<S, A>, s: S) => A = Z.runStateResult_

export const evaluate: <S>(s: S) => <A>(ma: ZState<S, A>) => A = Z.runStateResult

export const run_: <S, A>(ma: ZState<S, A>, s: S) => readonly [S, A] = Z.run_

export const run: <S>(s: S) => <A>(ma: ZState<S, A>) => readonly [S, A] = Z.run

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <S = never, A = never>(a: A) => ZState<S, A> = Z.pure

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export const cross_: <S, A, B>(fa: ZState<S, A>, fb: ZState<S, B>) => ZState<S, readonly [A, B]> = Z.cross_

export const cross: <S, B>(fb: ZState<S, B>) => <A>(fa: ZState<S, A>) => ZState<S, readonly [A, B]> = Z.cross

export const crossWith_: <S, A, B, C>(fa: ZState<S, A>, fb: ZState<S, B>, f: (a: A, b: B) => C) => ZState<S, C> =
  Z.crossWith_

export const crossWith: <S, A, B, C>(fb: ZState<S, B>, f: (a: A, b: B) => C) => (fa: ZState<S, A>) => ZState<S, C> =
  Z.crossWith

export const crossSecond_: <S, A, B>(fa: ZState<S, A>, fb: ZState<S, B>) => ZState<S, B> = Z.crossSecond_

export const crossSecond: <S, B>(fb: ZState<S, B>) => <A>(fa: ZState<S, A>) => ZState<S, B> = Z.crossSecond

export const crossFirst_: <S, A, B>(fa: ZState<S, A>, fb: ZState<S, B>) => ZState<S, A> = Z.crossFirst_

export const crossFirst: <S, B>(fb: ZState<S, B>) => <A>(fa: ZState<S, A>) => ZState<S, A> = Z.crossFirst

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export const unit: <S>() => ZState<S, void> = Z.unit

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const ap_: <S, A, B>(fab: ZState<S, (a: A) => B>, fa: ZState<S, A>) => ZState<S, B> = Z.ap_

export const ap: <S, A>(fa: ZState<S, A>) => <B>(fab: ZState<S, (a: A) => B>) => ZState<S, B> = Z.ap

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export const map_: <S, A, B>(fa: ZState<S, A>, f: (a: A) => B) => ZState<S, B> = Z.map_

export const map: <A, B>(f: (a: A) => B) => <S>(fa: ZState<S, A>) => ZState<S, B> = Z.map

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export const chain_: <S, A, B>(ma: ZState<S, A>, f: (a: A) => ZState<S, B>) => ZState<S, B> = Z.chain_

export const chain: <S, A, B>(f: (a: A) => ZState<S, B>) => (ma: ZState<S, A>) => ZState<S, B> = Z.chain

export const flatten: <S, A>(mma: ZState<S, ZState<S, A>>) => ZState<S, A> = Z.flatten

export const tap_: <S, A, B>(ma: ZState<S, A>, f: (a: A) => ZState<S, B>) => ZState<S, A> = Z.tap_

export const tap: <S, A, B>(f: (a: A) => ZState<S, B>) => (ma: ZState<S, A>) => ZState<S, A> = Z.tap

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

type URI = [HKT.URI<ZStateURI>]

export const Functor = P.Functor<URI, V>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({ map_, cross_, crossWith_ })

export const crossFlat_ = P.crossFlatF_<URI, V>({ map_, cross_, crossWith_ })
export const crossFlat  = P.crossFlatF<URI, V>({ map_, cross_, crossWith_ })

export const Apply = P.Apply<URI, V>({ map_, cross_, crossWith_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({ map_, cross_, crossWith_, unit })

export const Applicative = P.Applicative<URI, V>({ map_, cross_, crossWith_, unit, pure })

export const Monad = P.Monad<URI, V>({ map_, cross_, crossWith_, unit, pure, chain_, flatten })

export const MonadState = P.MonadState<URI, V>({
  map_,
  cross_,
  crossWith_,
  unit,
  pure,
  chain_,
  flatten,
  get,
  gets,
  put,
  modify
})
