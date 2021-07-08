import { flow } from './function'

const MAX_STACK_DEPTH = 128

export interface Single<I, A> {
  readonly _tag: 'Single'
  readonly f: (i: I) => A
  readonly index: number
}

export interface Concat<I, A, B> {
  readonly _tag: 'Concat'
  readonly f: SafeFunction<I, A>
  readonly g: SafeFunction<A, B>
}

export type SafeFunction<I, A> = Single<I, A> | Concat<I, any, A>

export type CallableSafeFunction<I, A> = SafeFunction<I, A> & ((input: I) => A)

export function single<I, A>(f: (i: I) => A, index?: number): CallableSafeFunction<I, A> {
  const _: SafeFunction<I, A> = {
    _tag: 'Single',
    f,
    index: index ?? 0
  }

  return Object.assign(function run(input: I): A {
    return run_(_, input)
  }, _)
}

export function concat<I, A, B>(f: SafeFunction<I, A>, g: SafeFunction<A, B>): CallableSafeFunction<I, B> {
  const _: SafeFunction<I, B> = {
    _tag: 'Concat',
    f,
    g
  }

  return Object.assign(function run(input: I): B {
    return run_(_, input)
  }, _)
}

export function andThen_<A, B, C>(ab: SafeFunction<A, B>, bc: (b: B) => C): CallableSafeFunction<A, C> {
  if (ab._tag === 'Single' && ab.index < MAX_STACK_DEPTH) {
    return single(flow(ab.f, bc), ab.index + 1)
  }
  if (ab._tag === 'Concat') {
    if (ab.g._tag === 'Single' && ab.g.index < MAX_STACK_DEPTH) {
      return concat(ab.f, single(flow(ab.g.f, bc), ab.g.index + 1))
    }
  }
  return concat(ab, single(bc, 0))
}

export function andThen<B, C>(bc: (b: B) => C): <A>(ab: SafeFunction<A, B>) => CallableSafeFunction<A, C> {
  return (ab) => andThen_(ab, bc)
}

export function pipeTo_<A, B, C>(ab: SafeFunction<A, B>, bc: SafeFunction<B, C>): CallableSafeFunction<A, C> {
  if (ab._tag === 'Single') {
    if (bc._tag === 'Single') {
      if (ab.index + bc.index < MAX_STACK_DEPTH) {
        return single(flow(ab.f, bc.f), ab.index + bc.index + 1)
      } else {
        return concat(ab, bc)
      }
    }
    if (bc._tag === 'Concat') {
      const bcl = bc.f
      if (bcl._tag === 'Single' && ab.index + bcl.index < MAX_STACK_DEPTH) {
        return concat(single(flow(ab.f, bcl.f), ab.index + bcl.index + 1), bc.g)
      }
    }
    return concat(ab, bc)
  }
  const abg = ab.g
  if (abg._tag === 'Single') {
    if (bc._tag === 'Single') {
      if (abg.index + bc.index < MAX_STACK_DEPTH) {
        return concat(ab.f, single(flow(abg.f, bc.f), abg.index + bc.index + 1))
      } else {
        return concat(ab, bc)
      }
    }
    if (bc._tag === 'Concat') {
      const bcl = bc.f
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

export function run_<I, A>(sf: SafeFunction<I, A>, input: I): A
export function run_<I, A>(sf: SafeFunction<I, A>, input: I): any {
  let current = sf
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (current._tag) {
      case 'Single': {
        return current.f(input)
      }
      case 'Concat': {
        const f = current.f
        if (f._tag === 'Single') {
          current = current.g
          // eslint-disable-next-line no-param-reassign
          input = f.f(input)
        } else {
          current = rotateAccum(current.f, current.g)
        }
      }
    }
  }
}

function rotateAccum<A, B, C>(left: SafeFunction<A, B>, right: SafeFunction<B, C>): SafeFunction<A, C> {
  let current = left
  // eslint-disable-next-line no-constant-condition
  while (1) {
    if (current._tag === 'Single') {
      return concat(current, right)
    } else {
      // eslint-disable-next-line no-param-reassign
      right   = concat(current.g, right)
      current = current.f
    }
  }
  throw new Error('BUG')
}
