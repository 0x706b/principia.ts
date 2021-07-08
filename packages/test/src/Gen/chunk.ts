import type { Sized } from '../Sized'
import type { EqConstraint, Gen, LengthConstraints } from './core'
import type { Chunk } from '@principia/base/Chunk'
import type * as Eq from '@principia/base/Eq'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as St from '@principia/base/Structural'

import * as G from './core'

export function chunk<R, A>(
  g: Gen<R, A>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, Chunk<A>> {
  const minLength = constraints.minLength || 0
  return constraints.maxLength
    ? G.chain_(G.int({ min: minLength, max: constraints.maxLength }), (n) => chunkN_(g, n))
    : G.small((n) => chunkN_(g, n), minLength)
}

export function chunkN_<R, A>(g: Gen<R, A>, n: number): Gen<R, Chunk<A>> {
  return pipe(
    C.replicate(n, g),
    C.foldl(G.constant(C.empty()) as Gen<R, Chunk<A>>, (gen, a) => G.crossWith_(gen, a, C.append_))
  )
}

export function chunkN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, Chunk<A>> {
  return (g) => chunkN_(g, n)
}

export function uniqueChunk_<R, A>(
  gen: Gen<R, A>,
  constraints: LengthConstraints & EqConstraint<A> = {}
): Gen<Has<Random> & Has<Sized> & R, Chunk<A>> {
  const minLength = constraints.minLength || 0
  const eq        = constraints.eq || St.DefaultEq
  return constraints.maxLength
    ? G.bounded(minLength, constraints.maxLength, (n) => uniqueChunkN_(eq)(gen, n))
    : G.small((n) => uniqueChunkN_(eq)(gen, n), minLength)
}

export function uniqueChunk<A>(
  constraints: LengthConstraints & EqConstraint<A> = {}
): <R>(gen: Gen<R, A>) => Gen<Has<Random> & Has<Sized> & R, Chunk<A>> {
  return (gen) => uniqueChunk_(gen, constraints)
}

export function uniqueChunkN_<A>(E: Eq.Eq<A>): <R>(g: Gen<R, A>, n: number) => Gen<R, Chunk<A>> {
  return <R>(g: Gen<R, A>, n: number) =>
    pipe(
      C.replicate(n, g),
      C.foldl(G.constant(C.empty()) as Gen<R, Chunk<A>>, (gen, a) =>
        G.crossWith_(gen, a, (as, a) => (C.elem_(E)(as, a) ? as : C.append_(as, a)))
      )
    )
}

export function uniqueChunkN<A>(E: Eq.Eq<A>): (n: number) => <R>(g: Gen<R, A>) => Gen<R, Chunk<A>> {
  return (n) => (g) => uniqueChunkN_(E)(g, n)
}
