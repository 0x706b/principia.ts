import type * as P from './prelude'

export interface FoldMapFn_<S, A> {
  <M>(M: P.Monoid<M>): (s: S, f: (a: A) => M) => M
}

export interface FoldMapFn<S, A> {
  <M>(M: P.Monoid<M>): (f: (a: A) => M) => (s: S) => M
}

export interface Fold<S, A> {
  readonly foldMap_: FoldMapFn_<S, A>
  readonly foldMap: FoldMapFn<S, A>
}

export interface FoldMin<S, A> {
  readonly foldMap_: FoldMapFn_<S, A>
}

export function Fold<S, A>(_: FoldMin<S, A>): Fold<S, A> {
  return {
    foldMap_: _.foldMap_,
    foldMap: (M) => (f) => (s) => _.foldMap_(M)(s, f)
  }
}
