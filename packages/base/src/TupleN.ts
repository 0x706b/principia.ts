import * as St from './Structural'

export class TupleN<C extends ReadonlyArray<unknown>> implements Iterable<C[number]>, St.Hashable, St.Equatable {
  readonly _tag = 'Tuple'
  constructor(readonly components: C) {}

  get [St.$hash](): number {
    return St.hashArray(this.components)
  }
  [St.$equals](that: unknown): boolean {
    return (
      isTuple(that) &&
      this.components.length === that.components.length &&
      this.components.every((v, i) => St.equals(v, that.components[i]))
    )
  }
  [Symbol.iterator](): IterableIterator<C[number]> {
    return this.components[Symbol.iterator]()
  }

  get<I extends keyof C>(i: I): C[I] {
    return this.components[i]
  }
}

export function isTuple(u: unknown): u is TupleN<unknown[]> {
  return u instanceof TupleN
}

export function tuple<C extends ReadonlyArray<unknown>>(...components: C): TupleN<C> {
  return new TupleN(components)
}

export function get_<C extends ReadonlyArray<unknown>, I extends keyof C>(tuple: TupleN<C>, i: I): C[I] {
  return tuple.get(i)
}

export function get<C extends ReadonlyArray<unknown>, I extends keyof C>(i: I): (tuple: TupleN<C>) => C[I] {
  return (tuple) => get_(tuple, i)
}

export function toComponents<C extends ReadonlyArray<unknown>>(tuple: TupleN<C>): C {
  return tuple.components
}

export function fromComponents<C extends ReadonlyArray<unknown>>(components: C): TupleN<C> {
  return new TupleN(components)
}

export function updateAt_<C extends ReadonlyArray<unknown>, I extends keyof C & number, B>(
  tuple: TupleN<C>,
  i: I,
  f: (a: C[I]) => B
): TupleN<{ [J in keyof C]: J extends `${I}` ? B : C[J] }> {
  const length  = tuple.components.length
  const mut_out = Array(length)

  for (let j = 0; j < length; j++) {
    if (j === i) {
      mut_out[j] = f(tuple.components[j])
    } else {
      mut_out[j] = tuple.components[j]
    }
  }
  return new TupleN(mut_out) as any
}

export function updateAt<C extends ReadonlyArray<unknown>, I extends keyof C & number, B>(
  i: I,
  f: (a: C[I]) => B
): (tuple: TupleN<C>) => TupleN<{ [J in keyof C]: J extends `${I}` ? B : C[J] }> {
  return (tuple) => updateAt_(tuple, i, f)
}
