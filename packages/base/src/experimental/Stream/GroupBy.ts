import type { GroupBy, Stream } from './core'

export function filter_<R, E, K, V>(gb: GroupBy<R, E, K, V>, f: (k: K) => boolean): GroupBy<R, E, K, V> {
  return gb.filter(f)
}

export function filter<K>(f: (k: K) => boolean): <R, E, V>(gb: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V> {
  return (gb) => gb.filter(f)
}

export function first_<R, E, K, V>(gb: GroupBy<R, E, K, V>, n: number): GroupBy<R, E, K, V> {
  return gb.first(n)
}

export function first(n: number): <R, E, K, V>(gb: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V> {
  return (gb) => gb.first(n)
}

export function merge_<R, E, K, V, R1, E1, A>(
  gb: GroupBy<R, E, K, V>,
  f: (k: K, s: Stream<unknown, E, V>) => Stream<R1, E1, A>
): Stream<R & R1, E | E1, A> {
  return gb.apply(f)
}

export function merge<E, K, V, R1, E1, A>(
  f: (k: K, s: Stream<unknown, E, V>) => Stream<R1, E1, A>
): <R>(gb: GroupBy<R, E, K, V>) => Stream<R & R1, E | E1, A> {
  return (gb) => gb.apply(f)
}
