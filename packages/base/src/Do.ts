import type { ToSFn, ToSFn_ } from './Functor'
import type { Monad } from './Monad'

import { flow, pipe, unsafeCoerce } from './function'
import { toSF, toSF_ } from './Functor'
import * as HKT from './HKT'

export interface Do<F extends HKT.HKT, C = HKT.None> extends Monad<F, C> {
  readonly chainS_: ChainSFn_<F, C>
  readonly pureS_: PureSFn_<F, C>
  readonly chainS: ChainSFn<F, C>
  readonly pureS: PureSFn<F, C>
  readonly toS_: ToSFn_<F, C>
  readonly toS: ToSFn<F, C>
}

export function Do<F extends HKT.HKT, C = HKT.None>(M: Monad<F, C>): Do<F, C>
export function Do<F>(M: Monad<HKT.F<F>>): Do<HKT.F<F>> {
  const chainS_: ChainSFn_<HKT.F<F>> = (fa, name, f) =>
    M.chain_(fa, (a) =>
      pipe(
        f(a),
        M.map((b) => Object.assign({}, a, { [name]: b } as any))
      )
    )
  return HKT.instance<Do<HKT.F<F>>>({
    ...M,
    chainS_: chainS_,
    chainS: (name, f) => (fa) => chainS_(fa, name, f),
    pureS_: (fa, name, f) => chainS_(fa, name, flow(f, M.pure)),
    pureS: (name, f) => (fa) => chainS_(fa, name, flow(f, M.pure)),
    toS_: toSF_(M),
    toS: toSF(M)
  })
}

export interface ChainSFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, BN extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
    f: (
      a: A
    ) => HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      HKT.Intro<F, 'I', I, I1>,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1>,
      HKT.Intro<F, 'E', E, E1>,
      A1
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    HKT.Mix<F, 'I', [I, I1]>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function chainSF_<F extends HKT.HKT, C = HKT.None>(F: Monad<F, C>): ChainSFn_<F, C>
export function chainSF_<F>(F: Monad<HKT.F<F>>): ChainSFn_<HKT.F<F>> {
  return (fa, name, f) =>
    F.chain_(fa, (a) =>
      pipe(
        f(a),
        F.map((b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
      )
    )
}

export interface ChainSFn<F extends HKT.HKT, C = HKT.None> {
  <BN extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    f: (a: A) => HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
  ): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K1, K>,
      HKT.Intro<F, 'Q', Q1, Q>,
      HKT.Intro<F, 'W', W1, W>,
      HKT.Intro<F, 'X', X1, X>,
      HKT.Intro<F, 'I', I1, I>,
      HKT.Intro<F, 'S', S1, S>,
      HKT.Intro<F, 'R', R1, R>,
      HKT.Intro<F, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    HKT.Mix<F, 'I', [I1, I]>,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function chainSF<F extends HKT.HKT, C = HKT.None>(F: Monad<F, C>): ChainSFn<F, C>
export function chainSF<F>(F: Monad<HKT.F<F>>): ChainSFn<HKT.F<F>> {
  return (name, f) =>
    F.chain((a) =>
      pipe(
        f(a),
        F.map((b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
      )
    )
}

export interface PureSFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, BN extends string, A1, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
    f: (a: A) => A1
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }>
}

export function pureSF_<F extends HKT.HKT, C = HKT.None>(F: Monad<F, C>): PureSFn_<F, C> {
  return (fa, name, f) =>
    F.chain_(fa, (a) =>
      pipe(
        f(a),
        F.pure,
        F.map((b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
      )
    )
}

export interface PureSFn<F extends HKT.HKT, C = HKT.None> {
  <BN extends string, A1, A>(name: Exclude<BN, keyof A>, f: (a: A) => A1): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }>
}

export function pureSF<F extends HKT.HKT, C = HKT.None>(F: Monad<F, C>): PureSFn<F, C>
export function pureSF<F>(F: Monad<HKT.F<F>>): PureSFn<HKT.F<F>> {
  return (name, f) =>
    F.chain((a) =>
      pipe(
        f(a),
        F.pure,
        F.map((b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
      )
    )
}
