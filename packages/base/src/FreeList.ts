import type { Stack } from './util/support/Stack'

import * as P from './prelude'
import { makeStack } from './util/support/Stack'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Empty {
  readonly _tag: 'Empty'
}

export interface Element<A> {
  readonly _tag: 'Element'
  readonly value: A
}

export interface Combine<A> {
  readonly _tag: 'Combine'
  readonly left: FreeList<A>
  readonly right: FreeList<A>
}

export interface Filter<A> {
  readonly _tag: 'Filter'
  readonly fa: FreeList<A>
  readonly f: P.Predicate<A>
}

export interface Map<A> {
  readonly _tag: 'Map'
  readonly fa: FreeList<A>
  readonly f: (a: A) => A
}

export type FreeList<A> = Element<A> | Combine<A> | Filter<A> | Map<A> | Empty

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function Combine<A>(left: FreeList<A>, right: FreeList<A>): FreeList<A> {
  return {
    _tag: 'Combine',
    left,
    right
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function Element<A>(a: A): FreeList<A> {
  return {
    _tag: 'Element',
    value: a
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function Empty<A>(): FreeList<A> {
  return {
    _tag: 'Empty'
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: FreeList<A>, f: P.Refinement<A, B>): FreeList<B>
export function filter_<A>(fa: FreeList<A>, f: P.Predicate<A>): FreeList<A>
export function filter_<A>(fa: FreeList<A>, f: P.Predicate<A>): FreeList<A> {
  return {
    _tag: 'Filter',
    fa,
    f
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function filter<A, B extends A>(f: P.Refinement<A, B>): (fa: FreeList<A>) => FreeList<B>
export function filter<A>(f: P.Predicate<A>): (fa: FreeList<A>) => FreeList<A>
export function filter<A>(f: P.Predicate<A>): (fa: FreeList<A>) => FreeList<A> {
  return (fa) => ({
    _tag: 'Filter',
    fa,
    f
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export function match_<A, R>(
  f: FreeList<A>,
  patterns: {
    Empty: () => R
    Element: (value: A) => R
    Filter: (fa: FreeList<A>, f: P.Predicate<A>) => R
    Map: (fa: FreeList<A>, f: (a: A) => A) => R
    Combine: (l: FreeList<A>, r: FreeList<A>) => R
  }
): R {
  switch (f._tag) {
    case 'Empty':
      return patterns.Empty()
    case 'Element':
      return patterns.Element(f.value)
    case 'Combine':
      return patterns.Combine(f.left, f.right)
    case 'Filter':
      return patterns.Filter(f.fa, f.f)
    case 'Map':
      return patterns.Map(f.fa, f.f)
  }
}

/**
 * @category Destructors
 * @since 1.0.0
 */
export function match<A, R>(patterns: {
  Empty: () => R
  Element: (value: A) => R
  Filter: (fa: FreeList<A>, f: P.Predicate<A>) => R
  Map: (fa: FreeList<A>, f: (a: A) => A) => R
  Combine: (l: FreeList<A>, r: FreeList<A>) => R
}): (f: FreeList<A>) => R {
  return (f) => match_(f, patterns)
}

type Ops<A> = Filter<A> | Map<A>

/**
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/system/src/FreeAssociative/index.ts
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toArray<A>(fs: FreeList<A>): ReadonlyArray<A> {
  const as: Array<A>                        = []
  let current: FreeList<A> | undefined      = fs
  let stack: Stack<FreeList<A>> | undefined = undefined
  let ops: Stack<Ops<A>> | undefined        = undefined

  while (current !== undefined) {
    switch (current._tag) {
      case 'Empty': {
        current = undefined
        break
      }
      case 'Element': {
        if (ops !== undefined) {
          let op: Stack<Ops<A>> | undefined = ops
          let drop                          = false
          let a                             = current.value
          while (op !== undefined && !drop) {
            switch (op.value._tag) {
              case 'Filter': {
                if (!op.value.f(a)) {
                  drop = true
                }
                break
              }
              case 'Map': {
                a = op.value.f(a)
                break
              }
            }
            op = op.previous
          }
          if (!drop) {
            as.push(a)
          }
        } else {
          as.push(current.value)
        }
        current = undefined
        break
      }
      case 'Filter': {
        ops     = makeStack(current, ops)
        current = current.fa
        break
      }
      case 'Map': {
        ops     = makeStack(current, ops)
        current = current.fa
        break
      }
      case 'Combine': {
        const p: any = stack
        stack        = makeStack(current.right, p)
        current      = current.left
        break
      }
    }

    if (current === undefined) {
      if (stack !== undefined) {
        current = stack.value
        stack   = stack.previous
      }
    }
  }

  return as
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A>(fa: FreeList<A>, f: (a: A) => A): FreeList<A> {
  return {
    _tag: 'Map',
    fa,
    f
  }
}

export function map<A>(f: (a: A) => A): (fa: FreeList<A>) => FreeList<A> {
  return (fa) => ({
    _tag: 'Map',
    fa,
    f
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function append_<A>(fs: FreeList<A>, a: A): FreeList<A> {
  return Combine(fs, Element(a))
}

export function append<A>(a: A): (fs: FreeList<A>) => FreeList<A> {
  return (fs) => append_(fs, a)
}

export function prepend_<A>(fs: FreeList<A>, a: A): FreeList<A> {
  return Combine(Element(a), fs)
}

export function prepend<A>(a: A): (fs: FreeList<A>) => FreeList<A> {
  return (fs) => prepend_(fs, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<A = never>(): P.Semigroup<FreeList<A>> {
  return P.Semigroup(Combine)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<A = never>(): P.Monoid<FreeList<A>> {
  return P.Monoid(getSemigroup<A>().combine_, Empty())
}
