import type * as HKT from './HKT'

import * as P from './prelude'
import * as Z from './Z'

export interface ZState<S, A> extends Z.Z<never, S, S, unknown, never, A> {}

/*
 * -------------------------------------------------------------------------------------------------
 * State
 * -------------------------------------------------------------------------------------------------
 */

export const get: <S>() => ZState<S, S> = Z.get

export const put: <S>(s: S) => ZState<S, void> = Z.put

export const modify: <S, A>(f: (s: S) => readonly [A, S]) => ZState<S, A> = Z.modify

export const gets: <S, A>(f: (s: S) => A) => ZState<S, A> = Z.gets

export const getsZ: <S, A>(f: (s: S) => ZState<S, A>) => ZState<S, A> = Z.getsZ

export const execute_: <S, A>(ma: ZState<S, A>, s: S) => S = Z.runState_

/**
 * @dataFirst execute
 */
export const execute: <S>(s: S) => <A>(ma: ZState<S, A>) => S = Z.runState

export const evaluate_: <S, A>(ma: ZState<S, A>, s: S) => A = Z.runStateResult_

/**
 * @dataFirst evaluate_
 */
export const evaluate: <S>(s: S) => <A>(ma: ZState<S, A>) => A = Z.runStateResult

export const run_: <S, A>(ma: ZState<S, A>, s: S) => readonly [S, A] = Z.run_

/**
 * @dataFirst run_
 */
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

/**
 * @dataFirst cross_
 */
export const cross: <S, B>(fb: ZState<S, B>) => <A>(fa: ZState<S, A>) => ZState<S, readonly [A, B]> = Z.cross

export const crossWith_: <S, A, B, C>(fa: ZState<S, A>, fb: ZState<S, B>, f: (a: A, b: B) => C) => ZState<S, C> =
  Z.crossWith_

/**
 * @dataFirst crossWith_
 */
export const crossWith: <S, A, B, C>(fb: ZState<S, B>, f: (a: A, b: B) => C) => (fa: ZState<S, A>) => ZState<S, C> =
  Z.crossWith

export const crossSecond_: <S, A, B>(fa: ZState<S, A>, fb: ZState<S, B>) => ZState<S, B> = Z.crossSecond_

/**
 * @dataFirst crossSecond_
 */
export const crossSecond: <S, B>(fb: ZState<S, B>) => <A>(fa: ZState<S, A>) => ZState<S, B> = Z.crossSecond

export const crossFirst_: <S, A, B>(fa: ZState<S, A>, fb: ZState<S, B>) => ZState<S, A> = Z.crossFirst_

/**
 * @dataFirst crossFirst_
 */
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

/**
 * @dataFirst ap_
 */
export const ap: <S, A>(fa: ZState<S, A>) => <B>(fab: ZState<S, (a: A) => B>) => ZState<S, B> = Z.ap

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export const map_: <S, A, B>(fa: ZState<S, A>, f: (a: A) => B) => ZState<S, B> = Z.map_

/**
 * @dataFirst map_
 */
export const map: <A, B>(f: (a: A) => B) => <S>(fa: ZState<S, A>) => ZState<S, B> = Z.map

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export const chain_: <S, A, B>(ma: ZState<S, A>, f: (a: A) => ZState<S, B>) => ZState<S, B> = Z.chain_

/**
 * @dataFirst chain_
 */
export const chain: <S, A, B>(f: (a: A) => ZState<S, B>) => (ma: ZState<S, A>) => ZState<S, B> = Z.chain

export const flatten: <S, A>(mma: ZState<S, ZState<S, A>>) => ZState<S, A> = Z.flatten

export const tap_: <S, A, B>(ma: ZState<S, A>, f: (a: A) => ZState<S, B>) => ZState<S, A> = Z.tap_

/**
 * @dataFirst tap_
 */
export const tap: <S, A, B>(f: (a: A) => ZState<S, B>) => (ma: ZState<S, A>) => ZState<S, A> = Z.tap

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export interface ZStateF extends HKT.HKT {
  readonly type: ZState<this['S'], this['A']>
  readonly variance: {
    S: '_'
    A: '+'
  }
}

export const Functor = P.Functor<ZStateF>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<ZStateF>({ map_, cross_, crossWith_ })

export const Apply = P.Apply<ZStateF>({ map_, cross_, crossWith_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<ZStateF>({ map_, cross_, crossWith_, unit })

export const Applicative = P.Applicative<ZStateF>({ map_, cross_, crossWith_, unit, pure })

export const Monad = P.Monad<ZStateF>({ map_, cross_, crossWith_, unit, pure, chain_, flatten })

export const MonadState = P.MonadState<ZStateF>({
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
