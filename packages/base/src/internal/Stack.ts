export interface Stack<A> {
  readonly value: A
  readonly previous?: Stack<A>
}

export function makeStack<A>(value: A, previous?: Stack<A>): Stack<A> {
  return {
    value,
    previous
  }
}
