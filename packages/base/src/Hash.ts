export interface Hash<A> {
  readonly hash: (a: A) => number
}

export function Hash<A>(hash: (a: A) => number): Hash<A> {
  return { hash }
}
