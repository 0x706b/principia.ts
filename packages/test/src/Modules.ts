import type { Gen } from './Gen/core'

export const GenURI = 'Gen'
export type GenURI = typeof GenURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [GenURI]: Gen<R, A>
  }
}
