import type * as HKT from './HKT'

import { identity } from './function'
import * as P from './prelude'

export interface Store<S, A> {
  readonly peek: (s: S) => A
  readonly pos: S
}

export interface StoreF extends HKT.HKT {
  readonly type: Store<this['S'], this['A']>
  readonly variance: {
    S: '_'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

export function seek_<S, A>(wa: Store<S, A>, s: S): Store<S, A> {
  return {
    peek: wa.peek,
    pos: s
  }
}

/**
 * @dataFirst seek_
 */
export function seek<S>(s: S): <A>(wa: Store<S, A>) => Store<S, A> {
  return (wa) => seek_(wa, s)
}

export function seeks_<S, A>(wa: Store<S, A>, f: P.Endomorphism<S>): Store<S, A> {
  return {
    peek: wa.peek,
    pos: f(wa.pos)
  }
}

/**
 * @dataFirst seeks
 */
export function seeks<S>(f: P.Endomorphism<S>): <A>(wa: Store<S, A>) => Store<S, A> {
  return (wa) => seeks_(wa, f)
}

export function peeks_<S, A>(wa: Store<S, A>, f: P.Endomorphism<S>): A {
  return wa.peek(f(wa.pos))
}

/**
 * @dataFirst peeks
 */
export function peeks<S>(f: P.Endomorphism<S>): <A>(wa: Store<S, A>) => A {
  return (wa) => peeks_(wa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<S, A, B>(fa: Store<S, A>, f: (a: A) => B): Store<S, B> {
  return {
    peek: (s) => f(fa.peek(s)),
    pos: fa.pos
  }
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <S>(fa: Store<S, A>) => Store<S, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<S, A, B>(wa: Store<S, A>, f: (wa: Store<S, A>) => B): Store<S, B> {
  return {
    peek: (s) => f({ peek: wa.peek, pos: s }),
    pos: wa.pos
  }
}

/**
 * @dataFirst extend_
 */
export function extend<S, A, B>(f: (wa: Store<S, A>) => B): (wa: Store<S, A>) => Store<S, B> {
  return (wa) => extend_(wa, f)
}

export function extract<S, A>(wa: Store<S, A>): A {
  return wa.peek(wa.pos)
}

export function duplicate<S, A>(wa: Store<S, A>): Store<S, Store<S, A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor: P.Functor<StoreF> = P.Functor({
  map_
})

export const Comonad: P.Comonad<StoreF> = P.Comonad({
  map_,
  extend_,
  extract
})
