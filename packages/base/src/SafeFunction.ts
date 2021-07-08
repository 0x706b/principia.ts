import { flow } from './function'

export interface SafeFunction<I, A> {
  (_: I): A
}

/**
 * A unary function that can compose in constant stack space with amortized
 * linear time application (in the number of constituent functions).
 *
 * A port of `AndThen` from `cats`
 */
export abstract class SafeFunction<I, A> {
  readonly _U!: 'SafeFunction'
  readonly _I!: (_: I) => void
  readonly _A!: () => A
}

const MAX_STACK_DEPTH = 128

export class Single<A, B> extends SafeFunction<A, B> {
  readonly _tag = 'Single'
  constructor(readonly f: (a: A) => B, readonly index: number) {
    super()
  }
}

export class Concat<A, B, C> extends SafeFunction<A, C> {
  readonly _tag = 'Concat'
  constructor(readonly f: SafeFunction<A, B>, readonly g: SafeFunction<B, C>) {
    super()
  }
}

export function single<A, B>(f: (a: A) => B, index?: number): SafeFunction<A, B> {
  const _ = new Single(f, index ?? 0)
  return Object.assign(run(_), _)
}

export function concat<A, B, C>(f: SafeFunction<A, B>, g: SafeFunction<B, C>): SafeFunction<A, C> {
  const _ = new Concat(f, g)
  return Object.assign(run(_), _)
}

export function andThen_<A, B, C>(ab: SafeFunction<A, B>, bc: (b: B) => C): SafeFunction<A, C> {
  concrete(ab)
  if (ab._tag === 'Single' && ab.index < MAX_STACK_DEPTH) {
    return single(flow(ab.f, bc), ab.index + 1)
  }
  if (ab._tag === 'Concat') {
    concrete(ab.g)
    if (ab.g._tag === 'Single' && ab.g.index < MAX_STACK_DEPTH) {
      return concat(ab.f, single(flow(ab.g.f, bc), ab.g.index + 1))
    }
  }
  return concat(ab, single(bc, 0))
}

export function andThen<B, C>(bc: (b: B) => C): <A>(ab: SafeFunction<A, B>) => SafeFunction<A, C> {
  return (ab) => andThen_(ab, bc)
}

export function pipeTo_<A, B, C>(ab: SafeFunction<A, B>, bc: SafeFunction<B, C>): SafeFunction<A, C> {
  concrete(ab)
  concrete(bc)
  if (ab._tag === 'Single') {
    if (bc._tag === 'Single') {
      if (ab.index + bc.index < MAX_STACK_DEPTH) {
        return single(flow(ab.f, bc.f), ab.index + bc.index + 1)
      } else {
        return concat(ab, bc)
      }
    }
    if (bc._tag === 'Concat') {
      const bcl = concreteId(bc.f)
      if (bcl._tag === 'Single' && ab.index + bcl.index < MAX_STACK_DEPTH) {
        return concat(single(flow(ab.f, bcl.f), ab.index + bcl.index + 1), bc.g)
      }
    }
    return concat(ab, bc)
  }
  const abg = concreteId(ab.g)
  if (abg._tag === 'Single') {
    if (bc._tag === 'Single') {
      if (abg.index + bc.index < MAX_STACK_DEPTH) {
        return concat(ab.f, single(flow(abg.f, bc.f), abg.index + bc.index + 1))
      } else {
        return concat(ab, bc)
      }
    }
    if (bc._tag === 'Concat') {
      const bcl = concreteId(bc.f)
      if (bcl._tag === 'Single' && abg.index + bcl.index < MAX_STACK_DEPTH) {
        return concat(ab.f, concat(single(flow(abg.f, bcl.f), abg.index + bcl.index + 1), bc.g))
      }
    }
    return concat(ab, bc)
  }
  return concat(ab, bc)
}

export function pipeTo<B, C>(bc: SafeFunction<B, C>): <A>(ab: SafeFunction<A, B>) => SafeFunction<A, C> {
  return (ab) => pipeTo_(ab, bc)
}

function rotateAccum<A, B, C>(left: SafeFunction<A, B>, right: SafeFunction<B, C>): SafeFunction<A, C> {
  let current = concreteId(left)
  // eslint-disable-next-line no-constant-condition
  while (1) {
    if (current._tag === 'Single') {
      return concat(current, right)
    } else {
      // eslint-disable-next-line no-param-reassign
      right   = concat(current.g, right)
      current = concreteId(current.f)
    }
  }
  throw new Error('BUG')
}

function concrete<A, B>(_: SafeFunction<A, B>): asserts _ is Single<A, B> | Concat<A, any, B> {
  //
}

function concreteId<A, B>(_: SafeFunction<A, B>): Single<A, B> | Concat<A, any, B> {
  return _ as any
}

function run<A, B>(sf: SafeFunction<A, B>): (input: A) => B
function run<A, B>(sf: SafeFunction<A, B>): (input: A) => any {
  return (input) => {
    let current = concreteId(sf)
    // eslint-disable-next-line no-constant-condition
    while (1) {
      switch (current._tag) {
        case 'Single': {
          return current.f(input)
        }
        case 'Concat': {
          const f = concreteId(current.f)
          if (f._tag === 'Single') {
            current = concreteId(current.g)
            // eslint-disable-next-line no-param-reassign
            input = f.f(input)
          } else {
            current = concreteId(rotateAccum(current.f, current.g))
          }
        }
      }
    }
  }
}
