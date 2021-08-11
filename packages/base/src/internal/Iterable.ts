export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
}

export function empty<A>(): Iterable<A> {
  return never
}

export function iterable<A>(iterator: () => Iterator<A>): Iterable<A> {
  return {
    [Symbol.iterator]() {
      return iterator()
    }
  }
}

export function append_<A>(ia: Iterable<A>, element: A): Iterable<A> {
  return iterable(function* () {
    yield* ia
    yield element
  })
}

export function append<A>(element: A): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => append_(ia, element)
}
