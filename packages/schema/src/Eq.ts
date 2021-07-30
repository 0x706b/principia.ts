import type * as S from './Schemable'
import type { Chunk } from '@principia/base/Chunk'
import type { Option } from '@principia/base/Option'
import type { UnionToIntersection } from '@principia/base/prelude'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import * as _ from '@principia/base/Eq'
import * as HR from '@principia/base/HeterogeneousRecord'
import * as NA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import { flow } from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import { DefaultEq } from '@principia/base/Structural/Equatable'
import * as tup from '@principia/base/tuple'

import * as G from './Guard'
import { EqSURI } from './Modules'
import { to } from './Schema'
import { cacheThunk } from './util'

type Eq<A> = _.Eq<A>

export type TypeOf<E> = E extends Eq<infer A> ? A : never

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

const strict: Eq<unknown> = _.strict

export const string: Eq<string> = strict

export const number: Eq<number> = strict

export const boolean: Eq<boolean> = strict

export const bigint: Eq<bigint> = strict

/*
 * -------------------------------------------
 * unknown containers
 * -------------------------------------------
 */

export const UnknownArray: Eq<ReadonlyArray<unknown>> = A.UnknownArrayEq

export const UnknownRecord: Eq<Record<string, any>> = R.UnknownRecordEq

/*
 * -------------------------------------------
 * nullable
 * -------------------------------------------
 */

export function nullable<A>(or: Eq<A>): Eq<Option<A>> {
  return O.getEq(or)
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export function requireKeys<P extends Record<string, any>>(struct: P): Eq<{ [K in keyof P]: unknown }> {
  return HR.getKeysEq(struct)
}

export function struct<P extends Record<string, Eq<any>>>(struct: P): Eq<{ readonly [K in keyof P]: TypeOf<P[K]> }> {
  return HR.getEq(struct)
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export function record<A>(codomain: Eq<A>): Eq<Record<string, A>> {
  return R.getEq(codomain)
}

/*
 * -------------------------------------------
 * array
 * -------------------------------------------
 */

export function array<A>(item: Eq<A>): Eq<ReadonlyArray<A>> {
  return A.getEq(item)
}

/*
 * -------------------------------------------
 * chunk
 * -------------------------------------------
 */

export function chunk<A>(item: Eq<A>): Eq<Chunk<A>> {
  return _.Eq((x, y) => C.corresponds_(x, y, item.equals_))
}

/*
 * -------------------------------------------
 * tuple
 * -------------------------------------------
 */

export function tuple<C extends ReadonlyArray<Eq<any>>>(
  ...components: C
): Eq<{ readonly [K in keyof C]: TypeOf<C[K]> }> {
  // @ts-expect-error
  return tup.getEq(...components)
}

/*
 * -------------------------------------------
 * partial
 * -------------------------------------------
 */

export function partial<P extends Record<string, Eq<any>>>(struct: P): Eq<{ readonly [K in keyof P]?: TypeOf<P[K]> }> {
  return HR.getPartialEq(struct)
}

/*
 * -------------------------------------------
 * intersect
 * -------------------------------------------
 */

export function intersectAll<M extends ReadonlyArray<Eq<Record<string, any>>>>(
  members: M
): Eq<UnionToIntersection<TypeOf<M[number]>>> {
  return _.Eq((x: any, y: any) => {
    for (let i = 0; i < members.length; i++) {
      if (!members[i].equals_(x, y)) {
        return false
      }
    }
    return true
  })
}

export function intersect<M extends ReadonlyArray<Eq<Record<string, any>>>>(
  ...members: M
): Eq<UnionToIntersection<TypeOf<M[number]>>> {
  return intersectAll(members)
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

export type EnsureTag<T extends string, M> = { [K in keyof M]: Eq<{ [_ in T]: K }> }

export function sum<T extends string>(
  tag: T
): <M extends Record<string, Eq<any>>>(members: M & EnsureTag<T, M>) => Eq<TypeOf<M[keyof M]>> {
  return (members) =>
    _.Eq((x, y) => {
      const vx = x[tag]
      const vy = y[tag]
      if (vx !== vy) {
        return false
      }
      return members[vx].equals_(x, y)
    })
}

/*
 * -------------------------------------------
 * lazy
 * -------------------------------------------
 */

export function lazy<A>(f: () => Eq<A>): Eq<A> {
  const leq = cacheThunk(f)
  return _.Eq((x, y) => leq().equals_(x, y))
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const date: Eq<Date> = _.Eq((x, y) => x.getTime() === y.getTime())

export const Schemable: S.Schemable<EqSURI> = {
  URI: EqSURI,
  identity: (ids) => (EqSURI in ids ? ids[EqSURI]! : DefaultEq),
  unknown: strict,
  literal: () => strict,
  string,
  number,
  boolean,
  bigint,
  nullable,
  dateString: _.contramap_(string, (d) => d.toISOString()),
  dateMs: _.contramap_(number, (d) => d.getTime()),
  struct: (properties) => struct(properties),
  partial: (properties) => partial(properties),
  array: (item) => array(item),
  chunk: (item) => chunk(item),
  record: (codomain) => record(codomain),
  tuple: (components) => tuple(...components),
  sum: (tag) => (members) => sum(tag)(members),
  lazy: (f) => lazy(f),
  andThen: (_, ab) => ab,
  custom: (_) => _[EqSURI],
  refine: (E) => E,
  constrain: (E) => E,
  intersect: (members) => intersectAll(members),
  union: (members, schemas) => {
    const guards = NA.map_(schemas, G.getFor)
    return _.Eq((x, y) => {
      let eq: Eq<any> | undefined = undefined
      for (let i = 0; i < guards.length; i++) {
        const guard = guards[i]
        if (guard.is(x) && guard.is(y)) {
          eq = members[i]
        }
      }
      if (!eq) {
        for (let i = 0; i < members.length; i++) {
          const eq = members[i]
          if (eq.equals_(x, y)) {
            return true
          }
        }
        return false
      }
      return eq.equals_(x, y)
    })
  },
  configure: (E, _, config) => config[EqSURI](E),
  withEq: (_, __, E) => E,
  properties: (properties) => {
    const [required, optional] = R.partitionMap_(properties, (prop) =>
      prop._optional === 'required' ? E.left(prop.instance) : E.right(prop.instance)
    )
    return intersect(struct(required), partial(optional))
  },
  taggedUnion: (eqs, schema) =>
    _.Eq((x, y) => {
      if (O.isSome(schema.tag)) {
        const tagv = schema.tag.value
        return eqs[tagv.index[x[tagv.key]]].equals_(x, y)
      }
      for (const k in eqs) {
        if (schema.guards[k].is(x) && schema.guards[k].is(y)) {
          return eqs[k].equals_(x, y)
        }
      }
      return false
    }),
  newtypeIso: (E, iso) => _.contramap_(E, iso.reverseGet),
  newtypePrism: (E, prism) => _.contramap_(E, prism.reverseGet)
}

export const getFor = to(Schemable)

const _for = flow(to(Schemable), (_) => _.equals_)
export { _for as for }

export { EqSURI } from './Modules'
export * from '@principia/base/Eq'
