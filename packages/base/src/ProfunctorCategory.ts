import type { FunctorMin } from './Functor'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface ProfunctorCategory<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly dimap_: DimapIFn_<F, C>
  readonly dimap: DimapIFn<F, C>
  readonly lmap_: LMapIFn_<F, C>
  readonly lmap: LMapIFn<F, C>
}

export type ProfunctorCategoryMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> &
  (
    | {
        readonly dimap_: DimapIFn_<F, C>
      }
    | { readonly lmap_: LMapIFn_<F, C> }
    | { readonly dimap_: DimapIFn_<F, C>, readonly lmap_: LMapIFn_<F, C> }
  )

export function ProfunctorCategory<F extends HKT.HKT, C = HKT.None>(
  F: ProfunctorCategoryMin<F, C>
): ProfunctorCategory<F, C> {
  let dimap_: DimapIFn_<F, C>
  let lmap_: LMapIFn_<F, C>
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
  return HKT.instance<ProfunctorCategory<F, C>>({
    ...Functor(F),
    dimap_,
    dimap: (f, g) => (fa) => dimap_(fa, f, g),
    lmap_,
    lmap: (f) => (fa) => lmap_(fa, f)
  })
}

export interface DimapIFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, U, B>(
    fa: HKT.Kind<F, TC, K, Q, W, X, U, S, R, E, A>,
    f: (i: I) => U,
    g: (A: A) => B
  ): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface DimapIFn<F extends HKT.HKT, TC = HKT.None> {
  <I, U, A, B>(f: (i: I) => U, g: (a: A) => B): <K, Q, W, X, S, R, E>(
    fa: HKT.Kind<F, TC, K, Q, W, X, U, S, R, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface LMapIFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, U>(fa: HKT.Kind<F, TC, K, Q, W, X, U, S, R, E, A>, f: (i: I) => U): HKT.Kind<
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

export interface LMapIFn<F extends HKT.HKT, TC = HKT.None> {
  <I, U>(f: (i: I) => U): <K, Q, W, X, S, R, E, A>(
    fa: HKT.Kind<F, TC, K, Q, W, X, U, S, R, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
}
