import type { IdP, Parser } from './Parser'
import type * as S from './Schemable'
import type { InputOfPrism } from './util'
import type * as HKT from '@principia/base/HKT'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as Th from '@principia/base/These'
import { isString } from '@principia/base/util/predicates'

import { ConstructorSURI } from './Modules'
import * as PE from './ParseError'
import * as Pr from './Parser'
import { tagsFromProps, to } from './Schema'

/**
 * `Constructor<I, E, A>` is able to convert an input of type I into an output of type A, collecting warnings of type E.
 * Some of these warnings may be unrecoverable errors, in which case the `Constructor` will fail with `Left`
 *
 * Generally `Constructor` is used to parse a known input value
 */
export interface Constructor<I, E, A> extends Parser<I, E, A> {}

export type AnyConstructor = Constructor<any, any, any>

export type InputOf<C> = C extends Constructor<infer I, any, any> ? I : never
export type ErrorOf<C> = C extends Constructor<any, infer E, any> ? E : never
export type TypeOf<C> = C extends Constructor<any, any, infer A> ? A : never

export type V = HKT.V<'I', '-'> & HKT.V<'E', '+'>

export interface stringC extends IdP<string> {}
export const string: stringC = pipe(Pr.id<string>(), Pr.withLabel('string'))

export interface numberC extends IdP<number> {}
export const number: numberC = pipe(Pr.id<number>(), Pr.withLabel('number'))

export interface booleanC extends IdP<boolean> {}
export const boolean: booleanC = pipe(Pr.id<boolean>(), Pr.withLabel('boolean'))

export interface bigintC extends IdP<bigint> {}
export const bigint: bigintC = pipe(Pr.id<bigint>(), Pr.withLabel('bigint'))

export const Schemable: S.Schemable<ConstructorSURI> = {
  URI: ConstructorSURI,
  identity: (ids) => (ConstructorSURI in ids ? ids[ConstructorSURI]! : Pr.id()),
  unknown: Pr.id(),
  literal: Pr.fromLiteral,
  string,
  number,
  boolean,
  bigint,
  dateString: Pr.id(),
  dateMs: Pr.id(),
  nullable: Pr.optional,
  struct: (properties) => Pr.fromStruct(properties),
  partial: (properties) => Pr.fromPartial(properties),
  array: (item) => pipe(item, Pr.fromArray, Pr.contramap(A.from)),
  chunk: (item) => Pr.fromChunk(item),
  record: (codomain) => Pr.fromRecord(codomain),
  tuple: (components) => Pr.fromTuple(...components),
  sum: (tag) => (members) => Pr.fromSum(tag)(members),
  lazy: (f, id) => Pr.lazy(f, id),
  andThen: (_, ab) => ab,
  custom: (_) => _[ConstructorSURI],
  refine: (C, _, refinement, error, warn, label) => Pr.refine_(C, refinement, error, warn, label),
  constrain: (C, _, predicate, error, warn, label) => Pr.constrain_(C, predicate, error, warn, label),
  intersect: (members) => Pr.intersectAll(members),
  union: (members) => Pr.union(...members),
  configure: (C, _, config) => config[ConstructorSURI](C),
  mapConstructError: (C, _, f) => Pr.mapLeft_(C, f),
  withConstructor: (_, __, C) => C,
  taggedUnion: (constructors, schema) => {
    const label = pipe(
      constructors,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return Pr.parser((i): Th.These<PE.TagLE | PE.CompoundE<any>, any> => {
      if (schema.tag._tag === 'Some') {
        const tagv = schema.tag.value
        if (!(tagv.key in i) || !isString(i[tagv.key]) || !(i[tagv.key] in tagv.index)) {
          return Th.left(PE.leafE(PE.tagE(tagv.key, tagv.values)))
        } else {
          return pipe(
            constructors[tagv.index[i[tagv.key]]].parse(i),
            Th.mapLeft((e) => PE.unionE([PE.memberE(tagv.index[i[tagv.key]], e)]))
          )
        }
      }

      const errors: Array<PE.MemberE<string, any>> = []
      let res: any

      let isBoth = false
      for (const k in constructors) {
        const de = constructors[k].parse(i)
        if (Th.isRight(de)) {
          res = de.right
          break
        } else if (Th.isBoth(de)) {
          isBoth = true
          res    = de.right
          errors.push(PE.memberE(k, de.left))
          break
        } else {
          errors.push(PE.memberE(k, de.left))
        }
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.both(PE.unionE(errors), res)
          : Th.left(PE.unionE(errors))
        : Th.right(res)
    }, label)
  },
  // @ts-expect-error
  properties: (properties) => {
    const required = {} as Record<string, Parser<unknown, unknown, unknown>>
    const optional = {} as Record<string, Parser<unknown, unknown, unknown>>
    const defaults = {} as Record<string, () => unknown>
    const tags     = tagsFromProps(properties)
    for (const key in properties) {
      const prop        = properties[key]
      const constructor = prop.instance
      if (prop._optional === 'required') {
        required[key] = constructor
        if (prop._def._tag === 'Some') {
          const def = prop._def.value
          switch (def[0]) {
            case 'both': {
              defaults[key] = def[1]
              break
            }
            case 'constructor': {
              defaults[key] = def[1]
              break
            }
          }
        }
      } else {
        optional[key] = constructor
      }
    }
    const label = `{ ${pipe(
      properties,
      R.foldl([] as string[], (b, a, k) => {
        if (k in optional) {
          b.push(`${k}?: ${optional[k].label}`)
        } else {
          if (k in defaults) {
            b.push(`${k}?: ${required[k].label}`)
          } else {
            b.push(`${k}: ${required[k].label}`)
          }
        }
        return b
      }),
      A.join(', ')
    )} }`

    return Pr.parser((ur): Th.These<PE.CompoundE<PE.RequiredKeyE<string, any> | PE.OptionalKeyE<string, any>>, any> => {
      const es     = [] as Array<PE.OptionalKeyE<string, unknown> | PE.RequiredKeyE<string, unknown>>
      const result = { ...tags } as Record<keyof typeof properties, any>
      let isBoth   = true

      for (const k in properties) {
        if (k in tags) {
          continue
        }
        if (k in required) {
          if (!(k in ur) && k in defaults) {
            result[k] = defaults[k]()
            continue
          }
          const de = required[k].parse(ur[k as string])
          Th.match_(
            de,
            (error) => {
              isBoth = false
              es.push(PE.requiredKeyE(k, error))
            },
            (a) => {
              result[k] = a
            },
            (w, a) => {
              es.push(PE.requiredKeyE(k, w))
              result[k] = a
            }
          )
        } else {
          if (!(k in ur)) {
            continue
          }
          if (ur[k as string] === undefined) {
            result[k] = undefined
            continue
          }
          const de = optional[k].parse(ur[k as string])
          Th.match_(
            de,
            (error) => {
              isBoth = false
              es.push(PE.optionalKeyE(k, error))
            },
            (a) => {
              result[k] = a
            },
            (w, a) => {
              es.push(PE.optionalKeyE(k, w))
              result[k] = a
            }
          )
        }
      }

      return A.isNonEmpty(es) ? (isBoth ? Th.both(PE.structE(es), result) : Th.left(PE.structE(es))) : Th.right(result)
    }, label)
  },
  named: (C, _, name) => Pr.named_(C, name),
  newtypeIso: (C, iso) => Pr.map_(C, iso.get),
  newtypePrism: (C, prism) =>
    Pr.andThen_(
      C,
      Pr.parser(
        (a: InputOfPrism<typeof prism>) =>
          O.match_(
            prism.getOption(a),
            () => Th.left(PE.leafE(PE.newtypePrismE(a))),
            (n) => Th.right(n)
          ),
        'Newtype'
      )
    )
}

export const getFor = to(Schemable)

const _for = flow(to(Schemable), (_) => _.parse)
export { _for as for }
