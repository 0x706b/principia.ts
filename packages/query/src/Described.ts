export interface Described<A> {
  readonly value: A
  readonly description: string
}

export function Described<A>(value: A, description: string): Described<A> {
  return {
    value,
    description
  }
}
