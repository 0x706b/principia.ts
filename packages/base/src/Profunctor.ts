import type { FunctorMin } from './Functor'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Profunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly dimap_: DimapFn_<F, C>
  readonly dimap: DimapFn<F, C>
  readonly lmap_: LMapFn_<F, C>
  readonly lmap: LMapFn<F, C>
}

export type ProfunctorMin<F extends HKT.URIS, C = HKT.Auto> = FunctorMin<F, C> &
  (
    | {
        readonly dimap_: DimapFn_<F, C>
      }
    | { readonly lmap_: LMapFn_<F, C> }
    | { readonly dimap_: DimapFn_<F, C>, readonly lmap_: LMapFn_<F, C> }
  )

export function Profunctor<F extends HKT.URIS, C = HKT.Auto>(F: ProfunctorMin<F, C>): Profunctor<F, C> {
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

export interface DimapFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, U, B>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, U, E, A>,
    f: (r: R) => U,
    g: (A: A) => B
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, B>
}

export interface DimapFn<F extends HKT.URIS, TC = HKT.Auto> {
  <R, U, A, B>(f: (r: R) => U, g: (a: A) => B): <N extends string, K, Q, W, X, I, S, E>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, U, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, B>
}

export interface LMapFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, U>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, U, E, A>,
    f: (r: R) => U
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
}

export interface LMapFn<F extends HKT.URIS, TC = HKT.Auto> {
  <R, U>(f: (r: R) => U): <N extends string, K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, U, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
}
