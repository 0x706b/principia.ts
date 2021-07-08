import type { ToSFn, ToSFn_ } from './Functor'
import type { Monad } from './Monad'

import { flow, pipe } from './function'
import { toSF, toSF_ } from './Functor'
import * as HKT from './HKT'

export interface Do<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
  readonly chainS_: ChainSFn_<F, C>
  readonly pureS_: PureSFn_<F, C>
  readonly chainS: ChainSFn<F, C>
  readonly pureS: PureSFn<F, C>
  readonly toS_: ToSFn_<F, C>
  readonly toS: ToSFn<F, C>
}

export function Do<F extends HKT.URIS, C = HKT.Auto>(M: Monad<F, C>): Do<F, C>
export function Do<F>(M: Monad<HKT.UHKT<F>>): Do<HKT.UHKT<F>> {
  const chainS_: ChainSFn_<HKT.UHKT<F>> = (fa, name, f) =>
    M.chain_(fa, (a) =>
      pipe(
        f(a),
        M.map((b) => Object.assign({}, a, { [name]: b } as any))
      )
    )
  return HKT.instance<Do<HKT.UHKT<F>>>({
    ...M,
    chainS_: chainS_,
    chainS: (name, f) => (fa) => chainS_(fa, name, f),
    pureS_: (fa, name, f) => chainS_(fa, name, flow(f, M.pure)),
    pureS: (name, f) => (fa) => chainS_(fa, name, flow(f, M.pure)),
    toS_: toSF_(M),
    toS: toSF(M)
  })
}

export interface ChainSFn_<F extends HKT.URIS, C = HKT.Auto> {
  <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    BN extends string,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    A
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
    f: (
      a: A
    ) => HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      A1
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function chainSF_<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): ChainSFn_<F, C> {
  return (fa, name, f) =>
    F.chain_(fa, (a) =>
      pipe(
        f(a),
        F.map((b) => Object.assign({}, a, { [name]: b }))
      )
    )
}

export interface ChainSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    f: (a: A) => HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function chainSF<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): ChainSFn<F, C> {
  return (name, f) =>
    F.chain((a) =>
      pipe(
        f(a),
        F.map((b) => Object.assign({}, a, { [name]: b }))
      )
    )
}

export interface PureSFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, BN extends string, A1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => A1
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }>
}

export function pureSF_<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): PureSFn_<F, C> {
  return (fa, name, f) =>
    F.chain_(fa, (a) =>
      pipe(
        f(a),
        F.pure,
        F.map((b) => Object.assign({}, a, { [name]: b }))
      )
    )
}

export interface PureSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, A1, A>(name: Exclude<BN, keyof A>, f: (a: A) => A1): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }>
}

export function pureSF<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): PureSFn<F, C> {
  return (name, f) =>
    F.chain((a) =>
      pipe(
        f(a),
        F.pure,
        F.map((b) => Object.assign({}, a, { [name]: b }))
      )
    )
}
