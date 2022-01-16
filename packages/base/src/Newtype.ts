import type * as HKT from './HKT'

import { unsafeCoerce } from './function'

export interface Newtype<URI, A, C = HKT.None> extends HKT.HKT {
  readonly _URI: URI
  readonly _A: A
  readonly _C: C
}

export interface NewtypeHKT extends HKT.HKT {
  readonly type: Newtype<any, any>
}

export interface NewtypeIso<N extends NewtypeHKT, C = N['type']['_C']> {
  get: {
    /**
     * @optimize identity
     */
    <
      K extends HKT.GetExtends<C, 'K', any>,
      Q extends HKT.GetExtends<C, 'Q', any>,
      W extends HKT.GetExtends<C, 'W', any>,
      X extends HKT.GetExtends<C, 'X', any>,
      I extends HKT.GetExtends<C, 'I', any>,
      S extends HKT.GetExtends<C, 'S', any>,
      R extends HKT.GetExtends<C, 'E', any>,
      E extends HKT.GetExtends<C, 'E', any>,
      A extends HKT.GetExtends<C, 'A', any>
    >(
      _: HKT.Kind<N, N['type']['_C'], K, Q, W, X, I, S, R, E, A>['_A']
    ): HKT.Kind<N, HKT.None, K, Q, W, X, I, S, R, E, A>
  }
  reverseGet: {
    /**
     * @optimize identity
     */
    <
      K extends HKT.GetExtends<C, 'K', any>,
      Q extends HKT.GetExtends<C, 'Q', any>,
      W extends HKT.GetExtends<C, 'W', any>,
      X extends HKT.GetExtends<C, 'X', any>,
      I extends HKT.GetExtends<C, 'I', any>,
      S extends HKT.GetExtends<C, 'S', any>,
      R extends HKT.GetExtends<C, 'E', any>,
      E extends HKT.GetExtends<C, 'E', any>,
      A extends HKT.GetExtends<C, 'A', any>
    >(
      _: HKT.Kind<N, HKT.None, K, Q, W, X, I, S, R, E, A>
    ): HKT.Kind<N, HKT.None, K, Q, W, X, I, S, R, E, A>['_A']
  }
}

export const newtype = <N extends NewtypeHKT>(): NewtypeIso<N> => ({
  get: unsafeCoerce,
  reverseGet: unsafeCoerce
})
