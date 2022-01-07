import type { Sized } from '../Sized'
import type { EqConstraint, Gen, LengthConstraints } from './core'
import type { Conc } from '@principia/base/collection/immutable/Conc'
import type * as Eq from '@principia/base/Eq'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as C from '@principia/base/collection/immutable/Conc'
import { pipe } from '@principia/base/function'
import * as St from '@principia/base/Structural'

import * as G from './core'

export function conc<R, A>(
  g: Gen<R, A>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, Conc<A>> {
  const minLength = constraints.minLength || 0
  return constraints.maxLength
    ? G.chain_(G.int({ min: minLength, max: constraints.maxLength }), (n) => concN_(g, n))
    : G.small((n) => concN_(g, n), minLength)
}

export function concN_<R, A>(g: Gen<R, A>, n: number): Gen<R, Conc<A>> {
  return pipe(
    C.replicate(n, g),
    C.foldl(G.constant(C.empty()) as Gen<R, Conc<A>>, (gen, a) => G.crossWith_(gen, a, C.append_))
  )
}

export function concN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, Conc<A>> {
  return (g) => concN_(g, n)
}

export function uniqueConc_<R, A>(
  gen: Gen<R, A>,
  constraints: LengthConstraints & EqConstraint<A> = {}
): Gen<Has<Random> & Has<Sized> & R, Conc<A>> {
  const minLength = constraints.minLength || 0
  const eq        = constraints.eq || St.DefaultEq
  return constraints.maxLength
    ? G.bounded(minLength, constraints.maxLength, (n) => uniqueConcN_(eq)(gen, n))
    : G.small((n) => uniqueConcN_(eq)(gen, n), minLength)
}

export function uniqueConc<A>(
  constraints: LengthConstraints & EqConstraint<A> = {}
): <R>(gen: Gen<R, A>) => Gen<Has<Random> & Has<Sized> & R, Conc<A>> {
  return (gen) => uniqueConc_(gen, constraints)
}

export function uniqueConcN_<A>(E: Eq.Eq<A>): <R>(g: Gen<R, A>, n: number) => Gen<R, Conc<A>> {
  return <R>(g: Gen<R, A>, n: number) =>
    pipe(
      C.replicate(n, g),
      C.foldl(G.constant(C.empty()) as Gen<R, Conc<A>>, (gen, a) =>
        G.crossWith_(gen, a, (as, a) => (C.elem_(E)(as, a) ? as : C.append_(as, a)))
      )
    )
}

export function uniqueConcN<A>(E: Eq.Eq<A>): (n: number) => <R>(g: Gen<R, A>) => Gen<R, Conc<A>> {
  return (n) => (g) => uniqueConcN_(E)(g, n)
}
