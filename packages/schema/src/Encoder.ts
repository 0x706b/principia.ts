import type * as S from './Schemable'
import type { Chunk } from '@principia/base/Chunk'
import type * as HKT from '@principia/base/HKT'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type * as O from '@principia/base/Option'
import type { UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import * as HS from '@principia/base/HashSet'
import * as HR from '@principia/base/HeterogeneousRecord'
import * as NA from '@principia/base/NonEmptyArray'
import * as P from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import * as Set from '@principia/base/Set'

import * as G from './Guard'
import { EncoderSURI } from './Modules'
import { EncoderS, Schema, to } from './Schema'
import { cacheThunk } from './util'

export interface Encoder<A, O> {
  readonly encode: (a: A) => O
}

export function Encoder<A, O>(encode: (a: A) => O): Encoder<A, O> {
  return { encode }
}

export type InputOf<E> = E extends Encoder<infer A, any> ? A : never
export type OutputOf<E> = E extends Encoder<any, infer O> ? O : never

export type AnyEncoder = Encoder<any, any>

export type V = HKT.V<'I', '-'>

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

export const string = id<string>()

export const number = id<number>()

export const boolean = id<boolean>()

export const bigint: Encoder<bigint, string> = Encoder((n) => n.toString(10))

/*
 * -------------------------------------------
 * unknown containers
 * -------------------------------------------
 */

export const UnknownArray = id<ReadonlyArray<unknown>>()

export const UnknownRecord = id<Record<string, unknown>>()

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function id<A>(): Encoder<A, A> {
  return Encoder(identity)
}

export function andThen_<A, O, O1>(ia: Encoder<A, O>, ab: Encoder<O, O1>): Encoder<A, O1> {
  return Encoder(flow(ia.encode, ab.encode))
}

export function andThen<O, O1>(ab: Encoder<O, O1>): <A>(ia: Encoder<A, O>) => Encoder<A, O1> {
  return (ia) => Encoder(flow(ia.encode, ab.encode))
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<I, A, I0>(fa: Encoder<I, A>, f: (i0: I0) => I): Encoder<I0, A> {
  return Encoder(flow(f, fa.encode))
}

export function contramap<A0, A>(f: (a0: A0) => A): <O>(fa: Encoder<A, O>) => Encoder<A0, O> {
  return (fa) => Encoder(flow(f, fa.encode))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, O, O1>(fa: Encoder<A, O>, f: (o: O) => O1): Encoder<A, O1> {
  return Encoder(flow(fa.encode, f))
}

export function map<O, O1>(f: (o: O) => O1): <A>(fa: Encoder<A, O>) => Encoder<A, O1> {
  return (fa) => Encoder(flow(fa.encode, f))
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export function nullable<A, O>(or: Encoder<A, O>): Encoder<A | null, O | null> {
  return Encoder((a) => (a === null ? null : or.encode(a)))
}

export function optional<A, O>(or: Encoder<A, O>): Encoder<O.Option<A>, O | null> {
  return Encoder((oa) => (oa._tag === 'None' ? null : or.encode(oa.value)))
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export function struct<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<{ readonly [K in keyof P]: InputOf<P[K]> }, { [K in keyof P]: OutputOf<P[K]> }> {
  return Encoder((a) => {
    const r = {} as any
    for (const k in properties) {
      r[k] = properties[k].encode(a[k])
    }
    return r
  })
}

/*
 * -------------------------------------------
 * partial
 * -------------------------------------------
 */

export function partial<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<{ readonly [K in keyof P]?: InputOf<P[K]> }, { [K in keyof P]?: OutputOf<P[K]> }> {
  return Encoder((a) => {
    const r = {} as any
    for (const k in properties) {
      const v = a[k]
      if (v === undefined) {
        r[k] = undefined
      } else {
        r[k] = properties[k].encode(v)
      }
    }
    return r
  })
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export function record<A, O>(codomain: Encoder<A, O>): Encoder<Record<string, A>, Record<string, O>> {
  return Encoder(R.map(codomain.encode))
}

/*
 * -------------------------------------------
 * array
 * -------------------------------------------
 */

export function array<A, O>(item: Encoder<A, O>): Encoder<ReadonlyArray<A>, Array<O>> {
  // @ts-expect-error
  return Encoder(A.map(item.encode))
}

/*
 * -------------------------------------------
 * chunk
 * -------------------------------------------
 */

export function chunk<A, O>(item: Encoder<A, O>): Encoder<Chunk<A>, Array<O>> {
  return Encoder((as) => {
    const out: Array<O> = Array(as.length)
    let i               = 0
    for (const a of as) {
      out[i] = item.encode(a)
      i++
    }
    return out
  })
}

/*
 * -------------------------------------------
 * tuple
 * -------------------------------------------
 */

export function tuple<C extends ReadonlyArray<Encoder<any, any>>>(
  ...components: C
): Encoder<{ readonly [K in keyof C]: InputOf<C[K]> }, { [K in keyof C]: OutputOf<C[K]> }> {
  return Encoder((as) => {
    const r: Array<any> = []
    for (let i = 0; i < components.length; i++) {
      r.push(components[i].encode(as[i]))
    }
    return P.unsafeCoerce(r)
  })
}

/*
 * -------------------------------------------
 * intersect
 * -------------------------------------------
 */

export function intersectAll<M extends NonEmptyArray<Encoder<any, Record<string, any>>>>(
  members: M
): Encoder<UnionToIntersection<InputOf<M[keyof M]>>, UnionToIntersection<OutputOf<M[keyof M]>>> {
  return Encoder((a) => P.unsafeCoerce(HR.intersect(...A.map_(members, (E) => E.encode(a)))))
}

export function intersect<M extends NonEmptyArray<Encoder<any, Record<string, any>>>>(
  ...members: M
): Encoder<UnionToIntersection<InputOf<M[keyof M]>>, UnionToIntersection<OutputOf<M[keyof M]>>> {
  return intersectAll(members)
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

type EnsureTag<T extends string, M extends Record<string, AnyEncoder>> = {
  [K in keyof M]: Encoder<any, { [tag in T]: K }>
}

export function sum<T extends string>(
  tag: T
): <M extends Record<string, AnyEncoder>>(
  members: M & EnsureTag<T, M>
) => Encoder<InputOf<M[keyof M]>, OutputOf<M[keyof M]>> {
  return (members) => Encoder((a) => members[a[tag]].encode(a))
}

/*
 * -------------------------------------------
 * lazy
 * -------------------------------------------
 */

export function lazy<A, O>(f: () => Encoder<A, O>): Encoder<A, O> {
  const le = cacheThunk(f)
  return Encoder((a) => le().encode(a))
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const dateToString: Encoder<Date, string> = Encoder((d) => d.toISOString())

export const dateToMs: Encoder<Date, number> = Encoder((d) => d.getTime())

export interface EncodedNone {
  readonly _tag: 'None'
}

export interface EncodedSome<A> {
  readonly _tag: 'Some'
  readonly value: A
}

export type EncodedOption<A> = EncodedNone | EncodedSome<A>

export const None: Encoder<O.None, EncodedNone> = struct({
  _tag: id<'None'>()
})

export function Some<A, O>(value: Encoder<A, O>): Encoder<O.Some<A>, EncodedSome<O>> {
  return struct({
    _tag: id<'Some'>(),
    value
  })
}

export function Option<A, O>(value: Encoder<A, O>): Encoder<O.Option<A>, EncodedOption<O>> {
  return sum('_tag')({
    None,
    Some: Some(value)
  })
}

export interface EncodedLeft<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface EncodedRight<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type EncodedEither<E, A> = EncodedLeft<E> | EncodedRight<A>

export function Left<A, O>(left: Encoder<A, O>): Encoder<E.Left<A>, EncodedLeft<O>> {
  return struct({
    _tag: id<'Left'>(),
    left
  })
}

export function Right<A, O>(right: Encoder<A, O>): Encoder<E.Right<A>, EncodedRight<O>> {
  return struct({
    _tag: id<'Right'>(),
    right
  })
}

export function Either<LA, LO, RA, RO>(
  left: Encoder<LA, LO>,
  right: Encoder<RA, RO>
): Encoder<E.Either<LA, RA>, EncodedEither<LO, RO>> {
  return sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

export function SetToArray<E extends AnyEncoder>(
  item: E,
  O: P.Ord<InputOf<E>>
): Encoder<ReadonlySet<InputOf<E>>, ReadonlyArray<OutputOf<E>>> {
  const toArrayO = Set.toArray(O)
  return Encoder((a: ReadonlySet<InputOf<E>>) => pipe(toArrayO(a), A.map(item.encode)))
}

export function HashSetToArray<E extends AnyEncoder>(item: E, O: P.Ord<InputOf<E>>) {
  const toArrayO = HS.toArray(O)
  return Encoder((a: HS.HashSet<InputOf<E>>) => pipe(toArrayO(a), A.map(item.encode)))
}

export const Schemable: S.Schemable<EncoderSURI> = {
  URI: EncoderSURI,
  identity: () => id(),
  unknown: id(),
  literal: () => id(),
  string,
  number,
  boolean,
  bigint,
  dateString: Encoder((d) => d.toISOString()),
  dateMs: Encoder((d) => d.getTime()),
  nullable: optional,
  struct: (properties) => struct(properties),
  partial: (properties) => partial(properties),
  array: (item) => array(item),
  chunk: (item) => chunk(item),
  record: (codomain) => record(codomain),
  tuple: (components) => tuple(...components),
  sum: (tag) => (members) => sum(tag)(members),
  lazy: (f) => lazy(f),
  andThen: (_, ab) => ab,
  custom: (_) => _[EncoderSURI],
  refine: (E) => E,
  constrain: (E) => E,
  intersect: (members) => intersectAll(members),
  union: (members, schemas) => {
    const guards = NA.map_(schemas, G.getFor)

    console.log(guards)
    return Encoder((a) => {
      let encoder: Encoder<any, any> | undefined = undefined
      for (let i = 0; i < guards.length; i++) {
        if (guards[i].is(a)) {
          encoder = members[i]
        }
      }
      if (!encoder) {
        throw new Error('bug: unable to encode union')
      }
      return encoder.encode(a)
    })
  },
  configure: (E, _, config) => config[EncoderSURI](E),
  withEncoder: (_, __, E) => E,
  taggedUnion: (encoders, schema) =>
    Encoder((a) => {
      if (schema.tag._tag === 'Some') {
        const tagv = schema.tag.value
        return encoders[tagv.index[a[tagv.key]]].encode(a)
      }
      for (const k in encoders) {
        if (schema.guards[k].is(a)) {
          return encoders[k].encode(a)
        }
      }
      throw new Error("bug: can't find any valid encoder")
    }),
  // @ts-expect-error
  properties: (properties) => {
    const [required, optional] = R.partitionMap_(properties, (prop) =>
      prop._optional === 'required' ? E.left(prop.instance) : E.right(prop.instance)
    )
    return intersect(struct(required), partial(optional))
  },
  newtypeIso: (E, iso) => contramap_(E, iso.reverseGet),
  newtypePrism: (E, prism) => contramap_(E, prism.reverseGet)
}

export const getFor = to(Schemable)

const _for = flow(to(Schemable), (_) => _.encode)
export { _for as for }

export { EncoderSURI }
