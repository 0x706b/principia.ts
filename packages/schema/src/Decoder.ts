import type { AnyUParser, LiteralP, Parser, SumP } from './Parser'
import type * as S from './Schemable'
import type { InputOfPrism } from './util'
import type * as HKT from '@principia/base/HKT'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

import * as A from '@principia/base/Array'
import { Either } from '@principia/base/Either'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as HS from '@principia/base/HashSet'
import * as O from '@principia/base/Option'
import * as P from '@principia/base/prelude'
import { isBoolean, isNumber, isObject } from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import * as Set from '@principia/base/Set'
import { isString } from '@principia/base/string'
import * as Th from '@principia/base/These'

import * as Pa from './internal/Parse'
import { DecoderSURI } from './Modules'
import * as PE from './ParseError'
import * as Pr from './Parser'
import { to } from './Schema'
import { isUnknownRecord } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

/**
 * `Decoder<I, E, A>` is able to convert an input of type I into an output of type A, collecting warnings of type E.
 * Some of these warnings may be unrecoverable errors, in which case the `Decoder` will fail with `Left`
 *
 * Generally `Decoder` is used to parse external communication with unknown value (i.e. a parsed JSON object)
 */
export interface Decoder<I, E, A> extends Parser<I, E, A> {}

export type V = HKT.V<'I', '-'> & HKT.V<'E', '+'>

/**
 * A `Decoder` where the input is `unknown`
 */
export interface UDecoder<E, A> extends Decoder<unknown, E, A> {}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

export type AnyD = Decoder<any, any, any>
export type AnyUD = UDecoder<any, any>

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

export interface stringD extends UDecoder<PE.StringLE, string> {
  readonly _tag: 'stringD'
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: stringD = {
  _tag: 'stringD',
  label: 'string',
  parse: Pa.fromPredicateFail(isString, (i) => PE.leafE(PE.stringE(i)))
}

export interface numberD extends UDecoder<PE.InfinityLE | PE.NaNLE | PE.NumberLE, number> {
  readonly _tag: 'numberD'
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: numberD = {
  _tag: 'numberD',
  label: 'number',
  parse: (u) =>
    typeof u === 'number'
      ? isNaN(u)
        ? Th.both(PE.leafE(PE.nanE), u)
        : !isFinite(u)
        ? Th.both(PE.leafE(PE.infinityE), u)
        : Th.right(u)
      : Th.left(PE.leafE(PE.numberE(u)))
}

export interface booleanD extends UDecoder<PE.BooleanLE, boolean> {
  readonly _tag: 'booleanD'
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: booleanD = {
  _tag: 'booleanD',
  label: 'boolean',
  parse: Pa.fromPredicateFail(isBoolean, (u) => PE.leafE(PE.booleanE(u)))
}

export interface bigintUD extends UDecoder<PE.StringLE | PE.BigIntLE, bigint> {
  readonly _tag: 'bigintFromStringD'
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigint: bigintUD = {
  _tag: 'bigintFromStringD',
  label: 'bigint',
  parse: (u) => {
    if (typeof u !== 'string') {
      return Th.left(PE.leafE(PE.stringE(u)))
    } else {
      try {
        return Th.right(BigInt(u))
      } catch (_) {
        return Th.left(PE.leafE(PE.bigIntE(u)))
      }
    }
  }
}

/*
 * -------------------------------------------
 * unknown containters
 * -------------------------------------------
 */

export interface UnknownArrayUD extends Decoder<unknown, PE.UnknownArrayLE, ReadonlyArray<unknown>> {
  readonly _tag: 'UnknownArrayUD'
}

/**
 * @category unknown containers
 * @since 1.0.0
 */
export const UnknownArray: UnknownArrayUD = {
  _tag: 'UnknownArrayUD',
  label: 'Array<unknown>',
  parse: Pa.fromPredicateFail(Array.isArray, (u) => PE.leafE(PE.unknownArrayE(u)))
}

export interface UnknownNonEmptyArrayUD
  extends UDecoder<PE.UnknownArrayLE | PE.EmptyLE<ReadonlyArray<unknown>>, NonEmptyArray<unknown>> {
  readonly _tag: 'NonEmptyArrayUD'
}

/**
 * @category unknown containers
 * @since 1.0.0
 */
export const UnknownNonEmptyArray: UnknownNonEmptyArrayUD = {
  _tag: 'NonEmptyArrayUD',
  label: 'NonEmptyArray<unknown>',
  parse: (u) =>
    Array.isArray(u)
      ? u.length > 0
        ? Th.right(u as any)
        : Th.left(PE.leafE(PE.emptyE(u)))
      : Th.left(PE.leafE(PE.unknownArrayE(u)))
}

export interface UnknownRecordUD extends UDecoder<PE.UnknownRecordLE, Record<PropertyKey, unknown>> {
  readonly _tag: 'UnknownRecordUD'
}

/**
 * @category unknown containers
 * @since 1.0.0
 */
export const UnknownRecord: UnknownRecordUD = {
  _tag: 'UnknownRecordUD',
  label: 'Record<string, unknown>',
  parse: Pa.fromPredicateFail(isUnknownRecord, (u) => PE.leafE(PE.unknownRecordE(u)))
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export interface DateStringD extends Pr.Parser<unknown, PE.StringLE | PE.DateFromStringLE, Date> {}
export const dateString: DateStringD = Pr.parser((u: unknown) => {
  if (!isString(u)) {
    return Th.left(PE.leafE(PE.stringE(u)))
  }
  const ms = Date.parse(u)
  return isNaN(ms) ? pipe(PE.dateFromStringE(u), PE.leafE, Th.left) : Th.right(new Date(ms))
}, 'DateFromString')

export interface DateMsD extends Pr.Parser<unknown, PE.NumberLE | PE.DateFromMsLE, Date> {}
export const dateMs: DateMsD = Pr.parser((u: unknown) => {
  if (!isNumber(u)) {
    return Th.left(PE.leafE(PE.numberE(u)))
  }
  return u >= -8_640_000_000_000_000 || u <= 8_640_000_000_000_000
    ? Th.right(new Date(u))
    : pipe(PE.dateFromMsE(u), PE.leafE, Th.left)
}, 'DateFromMs')

export interface NoneD extends Pr.MapP<Pr.StructP<{ _tag: LiteralP<['None']> }>, O.None> {}
export const None: NoneD = pipe(
  Pr.struct({
    _tag: Pr.literal('None')
  }),
  Pr.map(() => O.none() as O.None)
)

export interface SomeD<D> extends Pr.MapP<Pr.StructP<{ _tag: LiteralP<['Some']>, value: D }>, O.Some<TypeOf<D>>> {}
export function Some<D extends AnyUParser>(value: D): SomeD<D> {
  return pipe(
    Pr.struct({
      _tag: Pr.literal('Some'),
      value
    }),
    Pr.map(({ value }) => O.some(value) as O.Some<TypeOf<D>>)
  )
}

export function Option<D extends AnyUParser>(value: D): SumP<'_tag', { None: NoneD, Some: SomeD<D> }> {
  return Pr.sum('_tag')({
    None,
    Some: Some(value)
  })
}

export interface LeftD<D> extends Pr.MapP<Pr.StructP<{ _tag: LiteralP<['Left']>, left: D }>, E.Left<TypeOf<D>>> {}
export function Left<D extends AnyUParser>(left: D): LeftD<D> {
  return pipe(
    Pr.struct({
      _tag: Pr.literal('Left'),
      left
    }),
    Pr.map(({ left }) => E.left(left) as E.Left<TypeOf<D>>)
  )
}

export interface RightD<D> extends Pr.MapP<Pr.StructP<{ _tag: LiteralP<['Right']>, right: D }>, E.Right<TypeOf<D>>> {}
export function Right<D extends AnyUParser>(right: D): RightD<D> {
  return pipe(
    Pr.struct({
      _tag: Pr.literal('Right'),
      right
    }),
    Pr.map(({ right }) => E.right(right) as E.Right<TypeOf<D>>)
  )
}

export function Either<L extends AnyUParser, R extends AnyUParser>(
  left: L,
  right: R
): SumP<'_tag', { Left: LeftD<L>, Right: RightD<R> }> {
  return Pr.sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

export function SetFromArray<D extends AnyD>(item: D, E: P.Eq<TypeOf<D>>) {
  return pipe(Pr.array(item), Pr.map(Set.fromArray(E)))
}

export function HashSetFromArray<D extends AnyD>(item: D, H: P.Hash<TypeOf<D>>, E: P.Eq<TypeOf<D>>) {
  return pipe(
    Pr.array(item),
    Pr.map((is) =>
      pipe(
        HS.make({ ...H, ...E }),
        HS.mutate((set) => {
          for (let i = 0; i < is.length; i++) {
            HS.add_(set, is[i])
          }
        })
      )
    )
  )
}

export const Schemable: S.Schemable<DecoderSURI> = {
  URI: DecoderSURI,
  identity: () => Pr.id(),
  unknown: Pr.id(),
  literal: Pr.literal,
  string,
  number,
  boolean,
  bigint,
  dateString: dateString,
  dateMs: dateMs,
  nullable: Pr.nullable,
  struct: (properties) => Pr.struct(properties),
  partial: (properties) => Pr.partial(properties),
  array: (item) => Pr.array(item),
  chunk: (item) => Pr.chunk(item),
  record: (codomain) => Pr.record(codomain),
  tuple: (components) => Pr.tuple(...components),
  sum: (tag) => (members) => Pr.sum(tag)(members),
  lazy: (f, id) => Pr.lazy(f, id),
  andThen: (ia, ab) => Pr.andThen_(ia, ab),
  custom: (_) => _[DecoderSURI],
  refine: (D, _, refinement, error, warn, label) => Pr.refine_(D, refinement, error, warn, label),
  constrain: (D, _, predicate, error, warn, label) => Pr.constrain_(D, predicate, error, warn, label),
  intersect: (members) => Pr.intersectAll(members),
  union: (members) => Pr.union(...members),
  configure: (D, _, config) => config[DecoderSURI](D),
  mapDecodeError: (D, _, f) => Pr.mapLeft_(D, f),
  withDecoder: (_, __, D) => D,
  withDefault_: (D, _, def) => Pr.withDefault_(D, def),
  taggedUnion: (decoders, schema) => {
    const label = pipe(
      decoders,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return Pr.parser((u): Th.These<PE.UnknownRecordLE | PE.TagLE | PE.CompoundE<any>, any> => {
      if (!isObject(u)) {
        return Th.left(PE.leafE(PE.unknownRecordE(u)))
      }

      if (schema.tag._tag === 'Some') {
        const tagv = schema.tag.value
        if (!(tagv.key in u) || !isString(u[tagv.key]) || !(u[tagv.key] in tagv.index)) {
          return Th.left(PE.leafE(PE.tagE(tagv.key, tagv.values)))
        } else {
          return pipe(
            decoders[tagv.index[u[tagv.key]]].parse(u),
            Th.mapLeft((e) => PE.unionE([PE.memberE(tagv.index[u[tagv.key]], e)]))
          )
        }
      }
      const errors: Array<PE.MemberE<string, any>> = []
      let res: any
      let isBoth = false
      for (const k in decoders) {
        const de = decoders[k].parse(u)
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
    for (const key in properties) {
      const prop    = properties[key]
      const decoder = prop.instance
      if (prop._optional === 'required') {
        required[key] = decoder
        if (prop._def._tag === 'Some') {
          const def = prop._def.value
          switch (def[0]) {
            case 'both': {
              defaults[key] = def[1]
              break
            }
            case 'decoder': {
              defaults[key] = def[1]
              break
            }
          }
        }
      } else {
        optional[key] = decoder
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

    return Pr.parser(
      (
        ur
      ): Th.These<
        PE.CompositionE<
          | PE.UnknownRecordLE
          | PE.MissingKeysE<string>
          | PE.UnexpectedKeysLE
          | PE.CompoundE<PE.RequiredKeyE<string, any> | PE.OptionalKeyE<string, any>>
        >,
        any
      > => {
        // UnknownRecord
        if (!isObject(ur)) {
          return Th.left(PE.compositionE([PE.leafE(PE.unknownRecordE(ur))]))
        }

        // RequireKeys
        const missingKeys = [] as Array<string>
        for (const k in required) {
          if (!(k in ur) && !(k in defaults)) {
            missingKeys.push(k)
          }
        }
        if (A.isNonEmpty(missingKeys)) {
          return Th.left(PE.compositionE([PE.missingKeysE(missingKeys)]))
        }

        const unexpectedKeys = [] as Array<string>
        const es             = [] as Array<PE.OptionalKeyE<string, unknown> | PE.RequiredKeyE<string, unknown>>
        const result         = {} as Record<keyof typeof properties, any>
        let isBoth           = true
        for (const k in ur) {
          if (!(k in required) && !(k in optional)) {
            unexpectedKeys.push(k)
          }
        }

        for (const k in properties) {
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

        const error = A.isNonEmpty(es)
          ? A.isNonEmpty(unexpectedKeys)
            ? PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys)), PE.structE(es)])
            : PE.compositionE([PE.structE(es)])
          : A.isNonEmpty(unexpectedKeys)
          ? PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys))])
          : undefined

        return error ? (isBoth ? Th.both(error, result) : Th.left(error)) : Th.right(result)
      },
      label
    )
  },
  named: (D, _, name) => Pr.named_(D, name),
  newtypeIso: (D, iso) => Pr.map_(D, iso.get),
  newtypePrism: (D, prism) =>
    Pr.andThen_(
      D,
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

const _for = P.flow(to(Schemable), (_) => _.parse)
export { _for as for }

export { DecoderSURI }
