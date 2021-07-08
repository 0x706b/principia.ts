import type * as HKT from './HKT'
import type * as P from './prelude'

import { PrematureGeneratorExitError } from './Error'
import * as L from './List/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

export class GenHKT<T, A> {
  constructor(readonly T: T) {}

  *[Symbol.iterator](): Generator<GenHKT<T, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any) => {
  return new GenHKT(_)
}

export function genF<
  F extends HKT.URIS,
  TC,
  Adapter = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(_: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>): GenHKT<
      HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
      A
    >
  }
>(
  M: P.Monad<F, TC>,
  config?: { adapter?: Adapter }
): <T extends GenHKT<HKT.Kind<F, TC, any, any, any, any, any, any, any, any, any, any>, any>, A0>(
  f: (i: Adapter) => Generator<T, A0, any>
) => HKT.Kind<
  F,
  TC,
  HKT.Infer<F, TC, 'N', T['T']>,
  HKT.Infer<F, TC, 'K', T['T']>,
  HKT.Infer<F, TC, 'Q', T['T']>,
  HKT.Infer<F, TC, 'W', T['T']>,
  HKT.Infer<F, TC, 'X', T['T']>,
  HKT.Infer<F, TC, 'I', T['T']>,
  HKT.Infer<F, TC, 'S', T['T']>,
  HKT.Infer<F, TC, 'R', T['T']>,
  HKT.Infer<F, TC, 'E', T['T']>,
  A0
>
export function genF<F>(
  F: P.Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
    }
  }
): <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  return <T extends GenHKT<HKT.HKT<F, any>, any>, A>(
    f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<T, A, any>
  ): HKT.HKT<F, A> => {
    return F.chain_(F.pure(undefined), () => {
      const iterator = f((config?.adapter ? config.adapter : adapter) as any)
      const state    = iterator.next()

      function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): HKT.HKT<F, A> {
        if (state.done) {
          return F.pure(state.value)
        }
        return F.chain_(state.value.T, (val) => {
          const next = iterator.next(val)
          return run(next)
        })
      }

      return run(state)
    })
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * GenLazy
 * -------------------------------------------------------------------------------------------------
 */

export class GenLazyHKT<T, A> {
  constructor(readonly T: () => T) {}

  *[Symbol.iterator](): Generator<GenLazyHKT<T, A>, A, any> {
    return yield this
  }
}

const lazyAdapter = (_: () => any) => {
  return new GenLazyHKT(_)
}

export function genWithHistoryF<
  F extends HKT.URIS,
  TC,
  Adapter = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(_: () => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>): GenLazyHKT<
      HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
      A
    >
  }
>(
  M: P.Monad<F>,
  config?: { adapter?: Adapter }
): <T extends GenLazyHKT<HKT.Kind<F, TC, any, any, any, any, any, any, any, any, any, any>, any>, A0>(
  f: (i: Adapter) => Generator<T, A0, any>
) => HKT.Kind<
  F,
  TC,
  HKT.Infer<F, TC, 'N', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'K', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'Q', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'W', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'X', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'I', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'S', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'R', ReturnType<T['T']>>,
  HKT.Infer<F, TC, 'E', ReturnType<T['T']>>,
  A0
>
export function genWithHistoryF<F>(
  F: P.Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>
    }
  }
): <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: { <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  return <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
    f: (i: { <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
  ): HKT.HKT<F, AEff> => {
    return F.chain_(F.pure(undefined), () => {
      function run(replayStack: L.List<any>): HKT.HKT<F, AEff> {
        const iterator = f((config?.adapter ? config.adapter : lazyAdapter) as any)
        let state      = iterator.next()
        L.forEach_(replayStack, (a) => {
          if (state.done) {
            throw new PrematureGeneratorExitError('GenHKT.genWithHistoryF')
          }
          state = iterator.next(a)
        })
        if (state.done) {
          return F.pure(state.value)
        }
        return F.chain_(state.value.T(), (val) => {
          return run(L.append_(replayStack, val))
        })
      }
      return run(L.empty())
    })
  }
}
