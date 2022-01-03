import type * as HKT from './HKT'
import type { Monad } from './Monad'
import type { SafeFunction } from './SafeFunction'

import { pipe } from './function'
import { MonadState } from './MonadState'
import * as F from './SafeFunction'

export interface StateT<F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  readonly type: SafeFunction<
    this['S'],
    HKT.Kind<
      F,
      C,
      this['K'],
      this['Q'],
      this['W'],
      this['X'],
      this['I'],
      HKT.Low<F, 'S'>,
      this['R'],
      this['E'],
      readonly [this['A'], this['S']]
    >
  >

  readonly variance: {
    readonly K: HKT.VarianceOf<F, 'K'>
    readonly Q: HKT.VarianceOf<F, 'Q'>
    readonly W: HKT.VarianceOf<F, 'W'>
    readonly X: HKT.VarianceOf<F, 'X'>
    readonly I: HKT.VarianceOf<F, 'I'>
    readonly S: '_'
    readonly R: HKT.VarianceOf<F, 'R'>
    readonly E: HKT.VarianceOf<F, 'E'>
  }
}

export function getStateT<F extends HKT.HKT, C = HKT.None>(M: Monad<F, C>): MonadState<StateT<F>, C>
export function getStateT<F>(M: Monad<HKT.F<F>>): MonadState<StateT<HKT.F<F>>> {
  const map_: MonadState<StateT<HKT.F<F>>>['map_'] = (fa, f) => pipe(fa, F.composef(M.map(([a, s]) => [f(a), s])))

  const chain_: MonadState<StateT<HKT.F<F>>>['chain_'] = (ma, f) => pipe(ma, F.composef(M.chain(([a, s1]) => f(a)(s1))))

  const crossWith_: MonadState<StateT<HKT.F<F>>>['crossWith_'] = (fa, fb, f) =>
    pipe(
      fa,
      F.composef(
        M.chain(([a, s1]) =>
          pipe(
            fb(s1),
            M.map(([b, s2]) => [f(a, b), s2])
          )
        )
      )
    )

  return MonadState<StateT<HKT.F<F>>>({
    map_,
    crossWith_,
    chain_,
    pure: (a) => F.single((s) => M.pure([a, s])),
    get: () => F.single((s) => M.pure([s, s])),
    put: (s) => F.single(() => M.pure([undefined, s])),
    modify: (f) => F.single((s) => M.pure(f(s))),
    gets: (f) => F.single((s) => M.pure([f(s), s]))
  })
}
