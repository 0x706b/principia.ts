import * as HKT from './HKT'

export interface FunctorWithIndex<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly imap: MapWithIndexFn<F, C>
  readonly imap_: MapWithIndexFn_<F, C>
}

export type FunctorWithIndexMin<F extends HKT.HKT, C = HKT.None> = {
  readonly imap_: MapWithIndexFn_<F, C>
}

export function FunctorWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FunctorWithIndexMin<F, C>
): FunctorWithIndex<F, C> {
  return HKT.instance<FunctorWithIndex<F, C>>({
    imap_: F.imap_,
    imap: (f) => (fa) => F.imap_(fa, f)
  })
}

export interface MapWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B>(f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>) => B): <W, Q, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, W, Q, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, W, Q, X, I, S, R, E, B>
}

export interface MapWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, W, Q, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, W, Q, X, I, S, R, E, A>,
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>) => B
  ): HKT.Kind<F, C, K, W, Q, X, I, S, R, E, B>
}
