import type { Fold } from './Fold'

export interface Getter<S, A> extends Fold<S, A> {
  readonly get: GetFn<S, A>
}

export interface GetterMin<S, A> {
  readonly get: GetFn<S, A>
}

export function Getter<S, A>(_: GetterMin<S, A>): Getter<S, A> {
  return {
    get: _.get,
    foldMap_: (_M) => (s, f) => f(_.get(s)),
    foldMap: (_M) => (f) => (s) => f(_.get(s))
  }
}

export interface GetFn<S, A> {
  (s: S): A
}
