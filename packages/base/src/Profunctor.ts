import type { FunctorMin } from './Functor'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Profunctor<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly dimap_: DimapFn_<F, C>
  readonly dimap: DimapFn<F, C>
  readonly lmap_: LMapFn_<F, C>
  readonly lmap: LMapFn<F, C>
}

export type ProfunctorMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> &
  (
    | {
        readonly dimap_: DimapFn_<F, C>
      }
    | { readonly lmap_: LMapFn_<F, C> }
    | { readonly dimap_: DimapFn_<F, C>, readonly lmap_: LMapFn_<F, C> }
  )

export function Profunctor<F extends HKT.HKT, C = HKT.None>(F: ProfunctorMin<F, C>): Profunctor<F, C> {
  let dimap_: DimapFn_<F, C>
  let lmap_: LMapFn_<F, C>
  if ('dimap_' in F) {
    dimap_ = F.dimap_
  } else {
    dimap_ = (fa, f, g) => F.map_(F.lmap_(fa, f), g)
  }
  if ('lmap_' in F) {
    lmap_ = F.lmap_
  } else {
    lmap_ = (fa, f) => F.dimap_(fa, f, identity)
  }
  return HKT.instance<Profunctor<F, C>>({
    ...Functor(F),
    dimap_,
    dimap: (f, g) => (fa) => dimap_(fa, f, g),
    lmap_,
    lmap: (f) => (fa) => lmap_(fa, f)
  })
}

export interface DimapFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, U, B>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, U, E, A>,
    f: (r: R) => U,
    g: (A: A) => B
  ): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface DimapFn<F extends HKT.HKT, TC = HKT.None> {
  <R, U, A, B>(f: (r: R) => U, g: (a: A) => B): <K, Q, W, X, I, S, E>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, U, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface LMapFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, U>(fa: HKT.Kind<F, TC, K, Q, W, X, I, S, U, E, A>, f: (r: R) => U): HKT.Kind<
    F,
    TC,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >
}

export interface LMapFn<F extends HKT.HKT, TC = HKT.None> {
  <R, U>(f: (r: R) => U): <K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, U, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
}
