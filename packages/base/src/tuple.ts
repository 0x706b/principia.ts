import * as A from './Array/core'
import * as E from './Eq'
import { pipe } from './function'
import * as G from './Guard'
import * as _ from './internal/tuple'
import * as O from './Ord'
import * as S from './Show'

export const tuple = _.tuple

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<C extends ReadonlyArray<E.Eq<any>>>(...components: C): E.Eq<{ [K in keyof C]: E.TypeOf<C[K]> }> {
  return E.Eq((x, y) => components.every((E, i) => E.equals_(x[i], y[i])))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guard
 * -------------------------------------------------------------------------------------------------
 */

export function getStrictGuard<C extends ReadonlyArray<G.AnyGuard>>(
  ...components: C
): G.Guard<Readonly<{ [I in keyof C]: G.InputOf<C[I]> }>, Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }>> {
  return G.Guard((u): u is Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }> => {
    for (let i = 0; i < components.length; i++) {
      if (!components[i].is(u[i])) {
        return false
      }
    }
    return true
  })
}

export function getIndicesGuard<C extends ReadonlyArray<unknown>>(
  ...components: C
): G.Guard<ReadonlyArray<unknown>, { [I in keyof C]: unknown }> {
  return G.Guard((u): u is { [K in keyof C]: unknown } => u.length === components.length)
}

export function getGuard<C extends ReadonlyArray<G.AnyUGuard>>(
  ...components: C
): G.Guard<unknown, Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }>>
export function getGuard(...components: ReadonlyArray<G.AnyUGuard>): G.Guard<unknown, ReadonlyArray<any>> {
  return pipe(A.UnknownArrayGuard, G.compose(getIndicesGuard(...components)), G.compose(getStrictGuard(...components)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<C extends ReadonlyArray<S.Show<any>>>(
  ...components: C
): S.Show<{ [K in keyof C]: S.TypeOf<C[K]> }> {
  return S.Show(
    (t) =>
      `[${pipe(
        components,
        A.imap((i, S) => S.show(t[i])),
        A.join(', ')
      )}]`
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Ord
 * -------------------------------------------------------------------------------------------------
 */

export function getOrd<C extends ReadonlyArray<O.Ord<any>>>(
  ...components: C
): O.Ord<{ [K in keyof C]: O.TypeOf<C[K]> }> {
  return O.Ord({
    compare_: (x, y) => {
      let i = 0
      for (; i < components.length - 1; i++) {
        const r = components[i].compare_(x[i], y[i])
        if (r !== 0) {
          return r
        }
      }
      return components[i].compare_(x[i], y[i])
    },
    equals_: getEq(...components).equals_ as any
  })
}
