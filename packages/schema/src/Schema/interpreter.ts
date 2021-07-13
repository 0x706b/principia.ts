import type { AnyKind, Kind, Schemable, URIS } from '../Schemable'
import type { ChunkS } from './chunk'
import type {
  AndThenS,
  AnyS,
  AnySOf,
  AnyUSOf,
  ArrayS,
  BooleanS,
  ConstrainS,
  ConstructorS,
  DecoderS,
  EncoderS,
  EqS,
  GenS,
  GuardS,
  IdentityS,
  IntersectS,
  LazyS,
  LiteralS,
  MapApiS,
  MapConstructorErrorS,
  MapDecoderErrorS,
  MapOutputS,
  NamedS,
  NullableS,
  NumberS,
  PartialS,
  RecordS,
  RefineS,
  Schema,
  StringS,
  StructS,
  SumS,
  TagS,
  TupleS,
  UnionS,
  UnknownS,
  WithDefaultS
} from './core'
import type { DateMsS, DateStringS } from './date'
import type { NewtypeIsoS, NewtypePrismS } from './newtype'
import type { AnyPropertyWithInstance, AnyUPOf, PropertiesS } from './properties'
import type { TaggedUnionS } from './taggedUnion'
import type { Newtype } from '@principia/base/Newtype'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as MHM from '@principia/base/MutableHashMap'
import * as NA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import { cacheThunk } from '../util'
import { hasContinuation, SchemaContinuation } from './core'
import { SchemaIntegrationError } from './SchemaIntegrationError'

type Restrict0<R, S> = S extends R
  ? R extends S
    ? unknown
    : S
  : S extends StructS<infer Props> | PartialS<infer Props> | SumS<any, infer Props>
  ? unknown extends Restrict0<R, Props[keyof Props]>
    ? unknown
    : S
  : S extends TupleS<infer C> | UnionS<infer C> | IntersectS<infer C>
  ? unknown extends Restrict0<R, C[number]>
    ? unknown
    : S
  : S extends
      | RefineS<infer F, any, any, any>
      | NullableS<infer F>
      | ArrayS<infer F>
      | RecordS<infer F>
      | MapDecoderErrorS<infer F, any>
  ? unknown extends Restrict0<R, F>
    ? unknown
    : S
  : S extends AndThenS<infer F, infer T>
  ? unknown extends Restrict0<R, F | T>
    ? unknown
    : S
  : S

export type Restrict<R, S> = unknown extends Restrict0<R, S> ? never : S

type ConcreteOf<U extends URIS> =
  | UnknownS
  | StringS
  | NumberS
  | BooleanS
  | DateStringS
  | DateMsS
  | NullableS<AnySOf<U>>
  | WithDefaultS<AnySOf<U>>
  | StructS<Record<string, AnyUSOf<U>>>
  | PartialS<Record<string, AnyUSOf<U>>>
  | ArrayS<AnyUSOf<U>>
  | ChunkS<AnyUSOf<U>>
  | RecordS<AnyUSOf<U>>
  | TupleS<ReadonlyArray<AnyUSOf<U>>>
  | UnionS<NonEmptyArray<AnyUSOf<U>>>
  | IntersectS<NonEmptyArray<AnySOf<U>>>
  | SumS<string, Record<string, AnyUSOf<U>>>
  | RefineS<AnySOf<U>, unknown, unknown, unknown>
  | ConstrainS<AnySOf<U>, unknown, unknown>
  | MapDecoderErrorS<AnySOf<U>, unknown>
  | MapConstructorErrorS<AnySOf<U>, unknown>
  | AndThenS<AnySOf<U>, AnySOf<U>>
  | MapOutputS<AnySOf<U>, unknown>
  | IdentityS<URIS, any>
  | DecoderS<AnySOf<U>, unknown, unknown>
  | EncoderS<AnySOf<U>, unknown>
  | GuardS<AnySOf<U>>
  | GenS<AnySOf<U>>
  | EqS<AnySOf<U>>
  | ConstructorS<AnySOf<U>, unknown, unknown>
  | MapApiS<AnySOf<U>, unknown>
  | LazyS<AnySOf<U>>
  | NamedS<AnySOf<U>, string>
  | PropertiesS<Record<string, AnyUPOf<U>>>
  | LiteralS<NonEmptyArray<string>>
  | TaggedUnionS<Record<string, AnyUSOf<U>>>
  | NewtypeIsoS<AnySOf<U>, Newtype<any, any>>
  | NewtypePrismS<AnySOf<U>, Newtype<any, any>>
  | TagS<string>

export function concrete<U extends URIS>(s: AnyS): asserts s is ConcreteOf<U> {
  //
}

export type Interpreter = (
  interpreters: ReadonlyArray<Interpreter>
) => <U extends URIS>(S: Schemable<U>) => <U1 extends URIS>(schema: AnySOf<U1>) => O.Option<AnyKind<U>>

const CACHE = MHM.hashMap<URIS, WeakMap<AnyS, any>>()

export const defaultInterpreter: Interpreter =
  (interpreters) =>
  <U extends URIS>(S: Schemable<U>) => {
    const toS = makeTo(...interpreters)(S)
    return (schema) => {
      concrete<U>(schema)
      let instance: Kind<U, any, any, any, any, any, any> | undefined = undefined
      switch (schema._tag) {
        case 'Unknown': {
          instance = S.unknown
          break
        }
        case 'String': {
          instance = S.string
          break
        }
        case 'Number': {
          instance = S.number
          break
        }
        case 'Boolean': {
          instance = S.boolean
          break
        }
        case 'Literal': {
          instance = S.literal(schema.literals[0], ...schema.literals.slice(1))
          break
        }
        case 'DateString': {
          instance = S.dateString
          break
        }
        case 'DateMs': {
          instance = S.dateMs
          break
        }
        case 'Tag': {
          instance = S.literal(schema.tag)
          break
        }
        case 'Nullable': {
          instance = S.nullable(toS(schema.or), schema.or)
          break
        }
        case 'Refine': {
          instance = S.refine(toS(schema.from), schema.from, schema.refinement, schema.error, schema.warn, schema.label)
          break
        }
        case 'Constrain': {
          instance = S.constrain(
            toS(schema.from),
            schema.from,
            schema.predicate,
            schema.error,
            schema.warn,
            schema.label
          )
          break
        }
        case 'Array': {
          instance = S.array(toS(schema.item), schema.item)
          break
        }
        case 'Chunk': {
          instance = S.chunk(toS(schema.item), schema.item)
          break
        }
        case 'Record': {
          instance = S.record(toS(schema.codomain), schema.codomain)
          break
        }
        case 'Struct': {
          instance = S.struct(R.map_(schema.properties, toS), schema.properties)
          break
        }
        case 'Partial': {
          instance = S.partial(R.map_(schema.properties, toS), schema.properties)
          break
        }
        case 'Tuple': {
          instance = S.tuple(A.map_(schema.components, toS), schema.components)
          break
        }
        case 'Intersect': {
          instance = S.intersect(NA.map_(schema.members, toS), schema.members)
          break
        }
        case 'Sum': {
          instance = S.sum(schema.tag)(R.map_(schema.members, toS), schema.members)
          break
        }
        case 'Union': {
          const s  = NA.map_(schema.members, toS)
          instance = S.union(s, schema.members)
          break
        }
        case 'AndThen': {
          instance = S.andThen(toS(schema.prev), toS(schema.next), schema.prev, schema.next)
          break
        }
        case 'MapDecoderError': {
          if (S.mapDecodeError) {
            instance = S.mapDecodeError(toS(schema.fa), schema.fa, schema.mapError)
          }
          break
        }
        case 'MapOutput': {
          if (S.mapOutput) {
            instance = S.mapOutput(toS(schema.fa), schema.fa, schema.f)
          }
          break
        }
        case 'Identity': {
          instance = S.identity<any, any>(schema.ids)
          break
        }
        case 'Decoder': {
          if (S.withDecoder) {
            instance = S.withDecoder(toS(schema.schema), schema.schema, schema.parser)
          }
          break
        }
        case 'Encoder': {
          if (S.withEncoder) {
            instance = S.withEncoder(toS(schema.schema), schema.schema, schema.encoder)
          }
          break
        }
        case 'Guard': {
          if (S.withGuard) {
            instance = S.withGuard(toS(schema.schema), schema.schema, schema.guard)
          }
          break
        }
        case 'Gen': {
          if (S.withGen) {
            instance = S.withGen(toS(schema.schema), schema.schema, schema.gen)
          }
          break
        }
        case 'Eq': {
          if (S.withEq) {
            instance = S.withEq(toS(schema.schema), schema.schema, schema.eq)
          }
          break
        }
        case 'Constructor': {
          if (S.withConstructor) {
            instance = S.withConstructor(toS(schema.schema), schema.schema, schema.ctor)
          }
          break
        }
        case 'WithDefault': {
          if (S.withDefault_) {
            instance = S.withDefault_(toS(schema.or), schema.or, schema.def)
          }
          break
        }
        case 'Lazy': {
          const ls = cacheThunk(schema.schema)
          instance = S.lazy(() => toS(ls()), schema.id, ls)
          break
        }
        case 'Properties': {
          const ps = R.map_(
            schema.properties,
            (p): AnyPropertyWithInstance<any> =>
              ({
                ...p,
                instance: toS(p._schema)
              } as any)
          )
          instance = S.properties(ps)
          break
        }
        case 'TaggedUnion': {
          // @ts-expect-error
          instance = S.taggedUnion(R.map_(schema.members, toS), schema)
          break
        }
        case 'Named': {
          if (S.named) {
            instance = S.named(toS(schema.schema), schema.schema, schema.name)
          }
          break
        }
        case 'NewtypeIso': {
          instance = S.newtypeIso(toS(schema.schema), schema.iso, schema.schema)
          break
        }
        case 'NewtypePrism': {
          instance = S.newtypePrism(toS(schema.schema), schema.prism, schema.schema)
          break
        }
      }
      if (instance) {
        return O.some(instance)
      }
      if (hasContinuation(schema)) {
        return O.some(toS(schema[SchemaContinuation]))
      } else {
        return O.none()
      }
    }
  }

export function makeTo(...interpreters: ReadonlyArray<Interpreter>) {
  return <U extends URIS>(S: Schemable<U>) => {
    const map: WeakMap<AnyS, AnyKind<U>> = pipe(
      CACHE.get(S.URI),
      O.getOrElse(() => {
        const m = new WeakMap<AnyS, AnyKind<any>>()
        CACHE.set(S.URI, m)
        return m
      })
    )
    return <U1 extends URIS, In, CIn, Err, CErr, Type, Out, Api>(
      schema: U extends U1 ? Schema<U1, In, CIn, Err, CErr, Type, Out, Api> : never
    ): Kind<U, In, CIn, Err, CErr, Type, Out> => {
      if (map.has(schema)) {
        return map.get(schema)!
      }
      for (let i = 0; i < interpreters.length; i++) {
        const interpreted = interpreters[i](interpreters)(S)(schema)
        if (interpreted._tag === 'Some') {
          map.set(schema, interpreted.value)
          return interpreted.value
        }
      }
      throw new SchemaIntegrationError(S.URI, schema)
    }
  }
}

export const to = makeTo(defaultInterpreter)
