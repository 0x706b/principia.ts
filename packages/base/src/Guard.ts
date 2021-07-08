import type * as P from './prelude'

import { memoize, pipe } from './function'

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

const UnknownArray: Guard<unknown, ReadonlyArray<unknown>> = Guard((u): u is ReadonlyArray<unknown> => Array.isArray(u))

/**
 * @category Primitives
 * @since 1.0.0
 * @internal
 */
const UnknownRecord: Guard<unknown, Readonly<Record<PropertyKey, any>>> = {
  is: (i): i is Record<PropertyKey, unknown> => i != null && typeof i === 'object' && !Array.isArray(i)
}

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export interface Guard<I, A extends I> {
  is: (i: I) => i is A
}

export type AnyGuard = Guard<any, any>

export type AnyUGuard = Guard<unknown, any>

export type TypeOf<G> = G extends Guard<any, infer A> ? A : never

export type InputOf<G> = G extends Guard<infer I, any> ? I : never

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function Guard<I, A extends I>(is: (u: I) => u is A): Guard<I, A> {
  return { is }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function literal<A extends readonly [P.Primitive, ...Array<P.Primitive>]>(
  ...values: A
): Guard<unknown, A[number]> {
  return {
    is: (u): u is A[number] => values.findIndex((a) => a === u) !== -1
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function refine<I, A extends I, B extends A>(
  refinement: P.Refinement<A, B>
): (from: Guard<I, A>) => Guard<I, B> {
  return (from) => ({
    is: (u): u is B => from.is(u) && refinement(u)
  })
}

export function nullable<I, A extends I>(or: Guard<I, A>): Guard<null | I, null | A> {
  return {
    is: (u): u is null | A => u === null || or.is(u)
  }
}

export function union<Members extends ReadonlyArray<AnyGuard>>(...members: Members): Guard<unknown, Members[number]> {
  return Guard((u): u is Members[number] => members.some((m) => m.is(u)))
}

export function sum<T extends string>(tag: T) {
  return <Members extends Record<string, AnyGuard>>(members: Members): Guard<unknown, Members[keyof Members]> =>
    pipe(
      UnknownRecord,
      refine((r): r is any => {
        const v = r[tag] as keyof Members
        if (v in members) {
          return members[v].is(r)
        }
        return false
      })
    )
}

export function lazy<A>(f: () => Guard<unknown, A>): Guard<unknown, A> {
  const get = memoize<void, Guard<unknown, A>>(f)
  return {
    is: (u): u is A => get().is(u)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<I, A extends I>(me: Guard<I, A>, that: () => Guard<I, A>): Guard<I, A> {
  return {
    is: (i): i is A => me.is(i) || that().is(i)
  }
}

export function alt<I, A extends I>(that: () => Guard<I, A>): (me: Guard<I, A>) => Guard<I, A> {
  return (me) => alt_(me, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function zero<I, A extends I>(): Guard<I, A> {
  return {
    is: (_): _ is A => false
  }
}

export function compose_<I, A extends I, B extends A>(from: Guard<I, A>, to: Guard<A, B>): Guard<I, B> {
  return {
    is: (i): i is B => from.is(i) && to.is(i)
  }
}

export function compose<I, A extends I, B extends A>(to: Guard<A, B>): (from: Guard<I, A>) => Guard<I, B> {
  return (from) => compose_(from, to)
}

export function id<A>(): Guard<A, A> {
  return {
    is: (_): _ is A => true
  }
}

export { GuardURI } from './Modules'
