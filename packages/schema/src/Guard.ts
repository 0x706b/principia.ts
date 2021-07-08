import type { Schema } from './Schema/core'
import type * as S from './Schemable'
import type { TypeOfPrism } from './util'
import type { Chunk } from '@principia/base/Chunk'
import type * as _ from '@principia/base/Guard'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { Predicate, Refinement } from '@principia/base/prelude'
import type { Primitive, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import * as N from '@principia/base/number'
import * as O from '@principia/base/Option'
import { flow, isArray, isObject, unsafeCoerce } from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import * as str from '@principia/base/string'

import { GuardSURI } from './Modules'
import { to } from './Schema'
import { cacheThunk } from './util'

export type Guard<A> = _.Guard<unknown, A>

export type TypeOf<G> = G extends Guard<infer A> ? A : never

export function Guard<A>(is: (u: unknown) => u is A): Guard<A> {
  return { is }
}

export function literal<L extends NonEmptyArray<Primitive>>(...literals: L): Guard<L[number]> {
  return Guard((u): u is L[number] => A.exists_(literals, (l) => l === u))
}

export const string: Guard<string> = str.Guard

export const number: Guard<number> = N.Guard

export const boolean: Guard<boolean> = B.Guard

export const bigint: Guard<bigint> = Guard((u: unknown): u is bigint => typeof u === 'bigint')

export const UnknownArray: Guard<ReadonlyArray<unknown>> = A.UnknownArrayGuard

export const UnknownRecord: Guard<Record<string, unknown>> = R.UnknownRecordGuard

export function refine<A, B extends A>(guard: Guard<A>, refinement: Refinement<A, B>): Guard<B>
export function refine<A>(guard: Guard<A>, predicate: Predicate<A>): Guard<A>
export function refine<A>(guard: Guard<A>, predicate: Predicate<A>): Guard<A> {
  return Guard((u): u is A => guard.is(u) && predicate(u))
}

export function nullable<A>(guard: Guard<A>): Guard<Option<A>> {
  return O.getGuard(guard)
}

export function requireKeys<P extends Record<string, any>>(struct: P): Guard<{ [K in keyof P]: unknown }> {
  return Guard((u): u is { [K in keyof P]: unknown } => {
    if (!isObject(u)) {
      return false
    }
    for (const key in struct) {
      if (!(key in u)) {
        return false
      }
    }
    return true
  })
}

export function struct<P extends Record<string, Guard<any>>>(
  struct: P
): Guard<{ readonly [K in keyof P]: TypeOf<P[K]> }> {
  return Guard((u): u is { readonly [K in keyof P]: TypeOf<P[K]> } => {
    if (!isObject(u)) {
      return false
    }
    for (const key in struct) {
      if (!struct[key].is(u[key as string])) {
        return false
      }
    }
    return true
  })
}

export function partial<P extends Record<string, Guard<any>>>(
  struct: P
): Guard<{ readonly [K in keyof P]?: TypeOf<P[K]> }> {
  return Guard((u): u is { readonly [K in keyof P]?: TypeOf<P[K]> } => {
    if (!isObject(u)) {
      return false
    }
    for (const key in struct) {
      if (u[key as string] === undefined) {
        continue
      }

      if (!struct[key].is(u[key as string])) {
        return false
      }
    }
    return true
  })
}

export function record<A>(codomain: Guard<A>): Guard<Record<string, A>> {
  return Guard((u): u is Record<string, A> => {
    if (!isObject(u)) {
      return false
    }
    for (const key in u) {
      if (!codomain.is(u[key])) {
        return false
      }
    }
    return true
  })
}

export function array<A>(item: Guard<A>): Guard<ReadonlyArray<A>> {
  return Guard((u): u is ReadonlyArray<A> => {
    if (!isArray(u)) {
      return false
    }
    for (let i = 0; i < u.length; i++) {
      if (!item.is(u[i])) {
        return false
      }
    }
    return true
  })
}

export function chunk<A>(item: Guard<A>): Guard<Chunk<A>> {
  return Guard((u): u is Chunk<A> => {
    if (!C.isChunk(u)) {
      return false
    }
    for (const a of u) {
      if (!item.is(a)) {
        return false
      }
    }
    return true
  })
}

export function tuple<C extends ReadonlyArray<Guard<any>>>(...components: C): Guard<{ [K in keyof C]: TypeOf<C[K]> }> {
  return Guard((u): u is { readonly [K in keyof C]: TypeOf<C[K]> } => {
    if (!isArray(u)) {
      return false
    }
    for (let i = 0; i < components.length; i++) {
      if (!components[i].is(u[i])) {
        return false
      }
    }
    return true
  })
}

export type EnsureTag<T extends string, M> = { [K in keyof M]: Guard<{ [_ in T]: K }> }

export function sum<T extends string>(tag: T) {
  return <M extends Record<string, Guard<Record<string, any>>>>(
    members: M & EnsureTag<T, M>
  ): Guard<TypeOf<M[keyof M]>> =>
    Guard((u): u is TypeOf<M[keyof M]> => {
      if (!isObject(u)) {
        return false
      }
      const v = u[tag as string]
      if (v in members) {
        return members[v].is(u)
      }
      return false
    })
}

export function intersectAll<M extends ReadonlyArray<Guard<any>>>(
  members: M
): Guard<UnionToIntersection<TypeOf<M[keyof M]>>> {
  return Guard((u): u is UnionToIntersection<TypeOf<M[keyof M]>> => {
    for (let i = 0; i < members.length; i++) {
      if (!members[i].is(u)) {
        return false
      }
    }
    return true
  })
}

export function intersect<M extends ReadonlyArray<Guard<any>>>(
  ...members: M
): Guard<UnionToIntersection<TypeOf<M[keyof M]>>> {
  return intersectAll(members)
}

export function unionAll<M extends ReadonlyArray<Guard<any>>>(members: M): Guard<TypeOf<M[keyof M]>> {
  return Guard((u): u is TypeOf<M[keyof M]> => {
    for (let i = 0; i < members.length; i++) {
      if (members[i].is(u)) {
        return true
      }
    }
    return false
  })
}

export function union<M extends ReadonlyArray<Guard<any>>>(...members: M): Guard<TypeOf<M[keyof M]>> {
  return unionAll(members)
}

export function lazy<A>(f: () => Guard<A>): Guard<A> {
  const lg = cacheThunk(f)
  return Guard((u): u is A => lg().is(u))
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const date: Guard<Date> = Guard((u): u is Date => u instanceof Date)

export const Schemable: S.Schemable<GuardSURI> = {
  URI: GuardSURI,
  identity: (ids) => (GuardSURI in ids ? ids[GuardSURI]! : Guard((u: unknown): u is any => true)),
  unknown: Guard((_): _ is unknown => true),
  literal,
  string,
  number,
  boolean,
  bigint,
  nullable,
  dateString: date,
  dateMs: date,
  struct: (properties) => struct(properties),
  partial: (properties) => partial(properties),
  array: (item) => array(item),
  chunk: (item) => chunk(item),
  record: (codomain) => record(codomain),
  tuple: (components) => tuple(...components),
  sum: (tag) => (members) => sum(tag)(members),
  lazy: (f) => lazy(f),
  compose: (_, ab) => ab,
  custom: (_) => _[GuardSURI],
  refine: (G, _, refinement) => refine(G, refinement),
  constrain: (G, _, predicate) => refine(G, predicate),
  intersect: (members) => intersectAll(members),
  union: (members) => unionAll(members),
  configure: (G, _, config) => config[GuardSURI](G),
  withGuard: (_, __, G) => G,
  // @ts-expect-error
  properties: (properties) => {
    const [required, optional] = R.partitionMap_(properties, (prop) =>
      prop._optional === 'required' ? E.left(prop.instance) : E.right(prop.instance)
    )
    return intersect(struct(required), partial(optional))
  },
  taggedUnion: (guards, schema) =>
    Guard((u): u is any => {
      return O.match_(
        schema.tag,
        () => {
          for (const k in guards) {
            if (guards[k].is(u)) {
              return true
            }
          }
          return false
        },
        (tag) => {
          if (!isObject(u) || !(tag.key in u) || typeof u[tag.key] !== 'string' || !(u[tag.key] in tag.index)) {
            return false
          } else {
            return guards[tag.index[u[tag.key]]].is(u)
          }
        }
      )
    }),
  newtypeIso: (guard) => unsafeCoerce(guard),
  newtypePrism: (guard, prism) =>
    Guard((u): u is TypeOfPrism<typeof prism> => guard.is(u) && prism.getOption(u)._tag === 'Some')
}

export const getFor = to(Schemable)

const _for = flow(to(Schemable), (_) => _.is)
export { _for as for }

export { GuardSURI } from './Modules'
