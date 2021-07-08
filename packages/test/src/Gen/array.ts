import type { Sized } from '../Sized'
import type { EqConstraint, Gen, LengthConstraints } from './core'
import type * as Eq from '@principia/base/Eq'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'

import { chunkN_, uniqueChunk_, uniqueChunkN_ } from './chunk'
import * as G from './core'

export function array<R, A>(
  g: Gen<R, A>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, ReadonlyArray<A>> {
  const minLength = constraints.minLength || 0
  return constraints.maxLength
    ? G.chain_(G.int({ min: minLength, max: constraints.maxLength }), (n) => arrayN_(g, n))
    : G.small((n) => arrayN_(g, n), minLength)
}

export function arrayN_<R, A>(g: Gen<R, A>, n: number): Gen<R, ReadonlyArray<A>> {
  return pipe(chunkN_(g, n), G.map(C.toArray))
}

export function arrayN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, ReadonlyArray<A>> {
  return (g) => arrayN_(g, n)
}

export function uniqueArray_<R, A>(
  gen: Gen<R, A>,
  constraints: LengthConstraints & EqConstraint<A> = {}
): Gen<Has<Random> & Has<Sized> & R, ReadonlyArray<A>> {
  return pipe(uniqueChunk_(gen, constraints), G.map(C.toArray))
}

export function uniqueArray<A>(
  constraints: LengthConstraints & EqConstraint<A> = {}
): <R>(gen: Gen<R, A>) => Gen<Has<Random> & Has<Sized> & R, ReadonlyArray<A>> {
  return (gen) => uniqueArray_(gen, constraints)
}

export function uniqueArrayN_<A>(E: Eq.Eq<A>): <R>(g: Gen<R, A>, n: number) => Gen<R, ReadonlyArray<A>> {
  return <R>(g: Gen<R, A>, n: number) => pipe(uniqueChunkN_(E)(g, n), G.map(C.toArray))
}

export function uniqueArrayN<A>(E: Eq.Eq<A>): (n: number) => <R>(g: Gen<R, A>) => Gen<R, ReadonlyArray<A>> {
  return (n) => (g) => uniqueArrayN_(E)(g, n)
}
