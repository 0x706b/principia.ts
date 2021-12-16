import type { Getter, GetterMin } from '../Getter'

export function makeGetter<S, A>(G: GetterMin<S, A>): Getter<S, A> {
  return {
    get: G.get,
    foldMap_: (_M) => (s, f) => f(G.get(s)),
    foldMap: (_M) => (f) => (s) => f(G.get(s))
  }
}
