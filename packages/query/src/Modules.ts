import type { Result } from './internal/Result'

export const ResultURI = 'Result'
export type ResultURI = typeof ResultURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [ResultURI]: Result<R, E, A>
  }
}
