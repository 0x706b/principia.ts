export interface IterableCollection<A> extends Iterable<A> {
  readonly _IterableCollection: unique symbol
}

/**
 * @optimize identity
 */
export function wrap<A>(_: Iterable<A>): IterableCollection<A> {
  // @ts-expect-error Property '_IterableCollection' is missing in type 'Iterable<A>' but required in type 'IterableCollection<A>'. (Branded Type)
  return _
}
