import type * as HKT from './HKT'
import type { StateInURI, StateOutURI } from './Modules'
import type { Monad } from './Monad'
import type { SafeFunction } from './SafeFunction'

import { pipe } from './function'
import { MonadState } from './MonadState'
import * as F from './SafeFunction'

export type V<C> = HKT.CleanParam<C, 'S'> & HKT.V<'S', '_'>

export interface StateIn<S, A> extends SafeFunction<S, A> {}

export type StateOut<S, A> = readonly [A, S]

export type StateTURI<F extends HKT.URIS> = [HKT.URI<StateInURI>, ...F, HKT.URI<StateOutURI>]

export function getStateT<F extends HKT.URIS, C = HKT.Auto>(M: Monad<F, C>): MonadState<StateTURI<F>, V<C>>
export function getStateT<F>(M: Monad<HKT.UHKT<F>>): MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> {
  const map_: MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>>['map_'] = (fa, f) =>
    pipe(fa, F.andThen(M.map(([a, s]) => [f(a), s])))

  const chain_: MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>>['chain_'] = (ma, f) =>
    pipe(ma, F.andThen(M.chain(([a, s1]) => f(a)(s1))))

  const crossWith_: MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>>['crossWith_'] = (fa, fb, f) =>
    pipe(
      fa,
      F.andThen(
        M.chain(([a, s1]) =>
          pipe(
            fb(s1),
            M.map(([b, s2]) => [f(a, b), s2])
          )
        )
      )
    )

  return MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>>({
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
