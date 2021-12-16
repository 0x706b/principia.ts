import type { Fold, FoldMin } from '../Fold'

export function makeFold<S, A>(F: FoldMin<S, A>): Fold<S, A> {
  return {
    foldMap_: F.foldMap_,
    foldMap: (M) => (f) => (s) => F.foldMap_(M)(s, f)
  }
}
