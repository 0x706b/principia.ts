import type * as S from './Schemable'
import type { Has } from '@principia/base/Has'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Random } from '@principia/base/Random'
import type { _A, _R, Primitive } from '@principia/base/util/types'
import type { Sized } from '@principia/test/Sized'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as G from '@principia/test/Gen'

import { GenSURI } from './Modules'
import { to } from './Schema'

export type Gen<A> = G.Gen<Has<Random> & Has<Sized>, A>

export type EnvOf<G> = _R<G>

export type TypeOf<G> = _A<G>

export type AnyGen = Gen<any>

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

export function literal<L extends NonEmptyArray<Primitive>>(...literals: L): Gen<L[number]> {
  return pipe(literals, A.map(G.constant), (gens) => G.oneOf(...gens))
}

export const string: Gen<string> = G.string(G.printableChar)

export const number: Gen<number> = G.double()

export const boolean: Gen<boolean> = G.boolean

export const bigint: Gen<bigint> = G.anyBigInt

/*
 * -------------------------------------------
 * nullable
 * -------------------------------------------
 */

export function nullable<A>(or: Gen<A>): Gen<A | null> {
  return G.oneOf(or, G.constant(null))
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export function requireKeys<P extends Record<PropertyKey, unknown>>(properties: P): Gen<Record<keyof P, unknown>> {
  // @ts-expect-error
  return pipe(
    properties,
    R.map((_) => G.anything()),
    G.struct
  )
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export function record<A>(codomain: Gen<A>): Gen<Record<string, A>> {
  return G.dictionary(string, codomain)
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

type EnsureTag<T extends string, M extends Record<string, G.Gen<any, any>>> = M &
  {
    [K in keyof M]: G.Gen<any, { [tag in T]: K }>
  }

export function sum<T extends string>(
  _: T
): <M extends Record<string, AnyGen>>(members: EnsureTag<T, M>) => Gen<TypeOf<M[keyof M]>> {
  return (members) => G.oneOf(...Object.values(members)) as any
}

/*
 * -------------------------------------------
 * lazy
 * -------------------------------------------
 */

export function lazy<A>(f: () => Gen<A>): Gen<A> {
  return G.defer(f)
}

export const Schemable: S.Schemable<GenSURI> = {
  URI: GenSURI,
  identity: (ids) => (GenSURI in ids ? ids[GenSURI]! : (G.anything() as Gen<any>)),
  unknown: G.anything(),
  literal,
  string,
  number,
  boolean,
  bigint,
  dateString: G.date(),
  dateMs: G.date(),
  nullable: G.option,
  struct: (properties) => G.struct(properties) as any,
  partial: (properties) => G.partial(properties) as any,
  array: (item) => G.array(item),
  chunk: (item) => G.chunk(item),
  record: (codomain) => record(codomain),
  tuple: (components) => G.tuple(...components) as any,
  sum: (tag) => (members) => sum(tag)(members) as any,
  lazy: (f) => lazy(f),
  compose: (_, ab) => ab,
  custom: (_) => _[GenSURI],
  refine: (Gen, _, refinement) => G.filter_(Gen, refinement),
  constrain: (Gen, _, predicate) => G.filter_(Gen, predicate),
  intersect: (members) => G.intersectAll(members) as any,
  union: (members) => G.oneOf(...members) as any,
  configure: (C, _, config) => config[GenSURI](C),
  withGen: (_, __, G) => G,
  properties: (properties) => {
    const [required, optional] = R.partitionMap_(properties, (prop) =>
      prop._optional === 'required' ? E.left(prop.instance) : E.right(prop.instance)
    )
    return G.intersect(G.struct(required), G.partial(optional)) as any
  },
  taggedUnion: (gens) => G.oneOf(...R.collect_(gens, (_, a) => a)),
  newtypeIso: (gen, iso) => G.map_(gen, iso.get),
  newtypePrism: (gen, prism) =>
    pipe(
      gen,
      G.map(prism.getOption),
      G.filter(O.isSome),
      G.map((n) => n.value)
    )
}

export const getFor = to(Schemable)

const _for = getFor
export { _for as for }

export { GenSURI } from './Modules'
export * from '@principia/test/Gen'
