import type { Maybe, Nothing } from '@principia/base/Maybe'
import type { Newtype } from '@principia/base/Newtype'
import type { Eq, Predicate } from '@principia/base/prelude'
import type { Refinement } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'
import type { Iso } from '@principia/optics/Iso'
import type { Prism } from '@principia/optics/Prism'
import type { DecoderSURI } from '@principia/schema/Decoder'
import type { Encoder, EncoderSURI } from '@principia/schema/Encoder'
import type { EqSURI } from '@principia/schema/Eq'
import type { Gen, GenSURI } from '@principia/schema/Gen'
import type { Guard, GuardSURI } from '@principia/schema/Guard'
import type { ConstructorSURI } from '@principia/schema/Modules'
import type { Parser } from '@principia/schema/Parser'
import type * as s from '@principia/schema/Schema'
import type { URIS } from '@principia/schema/Schemable'

declare global {
  export const Schema: SchemaStaticOps
  export interface Schema<U extends URIS, In, CIn, Err, CErr, Type, Out, Api>
    extends s.Schema<U, In, CIn, Err, CErr, Type, Out, Api> {}
}

declare module '@principia/schema/Schema/core' {
  interface Schema<U, In, CIn, Err, CErr, Type, Out, Api> extends SchemaOps {}
}

export interface SchemaStaticOps {
  /**
   * @rewriteStatic unknown from "@principia/schema/Schema"
   */
  unknown: typeof s.unknown
  /**
   * @rewriteStatic string from "@principia/schema/Schema"
   */
  string: typeof s.string
  /**
   * @rewriteStatic number from "@principia/schema/Schema"
   */
  number: typeof s.number
  /**
   * @rewriteStatic boolean from "@principia/schema/Schema"
   */
  boolean: typeof s.boolean
  /**
   * @rewriteStatic literal from "@principia/schema/Schema"
   */
  literal: typeof s.literal
  /**
   * @rewriteStatic identity from "@principia/schema/Schema"
   */
  identity: typeof s.identity
  /**
   * @rewriteStatic tag from "@principia/schema/Schema"
   */
  tag: typeof s.tag
  /**
   * @rewriteStatic brand from "@principia/schema/Schema"
   */
  brand: typeof s.brand
  /**
   * @rewriteStatic struct from "@principia/schema/Schema"
   */
  struct: typeof s.struct
  /**
   * @rewriteStatic partial from "@principia/schema/Schema"
   */
  partial: typeof s.partial
  /**
   * @rewriteStatic array from "@principia/schema/Schema"
   */
  array: typeof s.array
  /**
   * @rewriteStatic record from "@principia/schema/Schema"
   */
  record: typeof s.record
  /**
   * @rewriteStatic tuple from "@principia/schema/Schema"
   */
  tuple: typeof s.tuple
  /**
   * @rewriteStatic union from "@principia/schema/Schema"
   */
  union: typeof s.union
  /**
   * @rewriteStatic intersect from "@principia/schema/Schema"
   */
  intersect: typeof s.intersect
  /**
   * @rewriteStatic sum from "@principia/schema/Schema"
   */
  sum: typeof s.sum
  /**
   * @rewriteStatic lazy from "@principia/schema/Schema"
   */
  lazy: typeof s.lazy
  /**
   * @rewriteStatic chunk from "@principia/schema/Schema"
   */
  chunk: typeof s.chunk
  /**
   * @rewriteStatic dateString from "@principia/schema/Schema"
   */
  dateString: typeof s.dateString
  /**
   * @rewriteStatic dateMs from "@principia/schema/Schema"
   */
  dateMs: typeof s.dateMs
  /**
   * @rewriteStatic intersectLazy from "@principia/schema/Schema"
   */
  intersectLazy: typeof s.intersectLazy
  /**
   * @rewriteStatic properties from "@principia/schema/Schema"
   */
  properties: typeof s.properties
  /**
   * @rewriteStatic taggedUnion from "@principia/schema/Schema"
   */
  taggedUnion: typeof s.taggedUnion
}

export interface SchemaOps {
  /**
   * @rewrite prop from "@principia/schema/Schema"
   */
  prop<S extends s.AnyS>(this: S): s.Property<S, 'required', Nothing>
  /**
   * @rewrite refine_ from "@principia/schema/Schema"
   */
  // @ts-expect-error
  refine<S extends s.AnyS, W, E, B extends s.TypeOf<S>>(
    this: S,
    // @ts-expect-error
    refinement: Refinement<s.TypeOf<S>, B>,
    error: (a: s.TypeOf<S>) => E,
    warn: (a: B) => Maybe<W>,
    label?: string
    // @ts-expect-error
  ): s.RefineS<S, W, E, B>
  /**
   * @rewrite constrain_ from "@principia/schema/Schema"
   */
  refine<S extends s.AnyS, W, E>(
    this: S,
    predicate: Predicate<s.TypeOf<S>>,
    error: (a: s.TypeOf<S>) => E,
    warn: (a: s.TypeOf<S>) => Maybe<W>,
    label?: string
  ): s.ConstrainS<S, W, E>
  /**
   * @rewrite nullable from "@principia/schema/Schema"
   */
  nullable<S extends s.AnyS>(this: S): s.NullableS<S>
  /**
   * @rewrite withDefault_ from "@principia/schema/Schema"
   */
  withDefault<S extends s.AnyS>(this: S, def: () => s.TypeOf<S>): s.WithDefaultS<S>
  /**
   * @rewrite array from "@principia/schema/Schema"
   */
  array<S extends s.AnyS>(this: S): s.ArrayS<S>
  /**
   * @rewrite record from "@principia/schema/Schema"
   */
  record<S extends s.AnyS>(this: S): s.RecordS<S>
  /**
   * @rewrite mapOutput_ from "@principia/schema/Schema"
   */
  mapOutput<S extends s.AnyS, O>(this: S, f: (o: s.OutputOf<S>) => O): s.MapOutputS<S, O>
  /**
   * @rewrite mapDecoderError_ from "@principia/schema/Schema"
   */
  mapDecodeError<S extends s.AnyS, E>(this: S, f: (e: s.ErrorOf<S>) => E): s.MapDecoderErrorS<S, E>
  /**
   * @rewrite mapConstructorError_ from "@principia/schema/Schema"
   */
  mapConstructorError<S extends s.AnyS, E>(this: S, f: (e: s.CErrorOf<S>) => E): s.MapConstructorErrorS<S, E>
  /**
   * @rewrite andThen_ from "@principia/schema/Schema"
   */
  andThen<From extends s.AnyS, To extends s.AnyS>(this: From, that: To): s.AndThenS<From, To>
  /**
   * @rewrite decoder_ from "@principia/schema/Schema"
   */
  withDecoder<S extends s.AnyS, I, E>(
    this: S,
    decoder: Parser<I, E, s.TypeOf<S>>
  ): s.Schema<s.URISIn<S> | DecoderSURI, I, s.CInputOf<S>, E, s.CErrorOf<S>, s.TypeOf<S>, s.OutputOf<S>, s.ApiOf<S>>
  /**
   * @rewrite decode_ from "@principia/schema/Schema"
   */
  withDecode<S extends s.AnyS, I, E>(
    this: S,
    parse: (i: I) => These<E, s.TypeOf<S>>
  ): s.Schema<s.URISIn<S> | DecoderSURI, I, s.CInputOf<S>, E, s.CErrorOf<S>, s.TypeOf<S>, s.OutputOf<S>, s.ApiOf<S>>
  /**
   * @rewrite encoder_ from "@principia/schema/Schema"
   */
  withEncoder<S extends s.AnyS, O>(
    this: S,
    encoder: Encoder<s.TypeOf<S>, O>
  ): s.Schema<
    s.URISIn<S> | EncoderSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    O,
    s.ApiOf<S>
  >
  /**
   * @rewrite encode_ from "@principia/schema/Schema"
   */
  withEncode<S extends s.AnyS, O>(
    this: S,
    encode: (a: s.TypeOf<S>) => O
  ): s.Schema<
    s.URISIn<S> | EncoderSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    O,
    s.ApiOf<S>
  >
  /**
   * @rewrite guard_ from "@principia/schema/Schema"
   */
  withGuard<S extends s.AnyS>(
    this: S,
    guard: Guard<s.TypeOf<S>>
  ): s.Schema<
    s.URISIn<S> | GuardSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    s.OutputOf<S>,
    s.ApiOf<S>
  >
  /**
   * @rewrite is_ from "@principia/schema/Schema"
   */
  withIs<S extends s.AnyS>(
    this: S,
    is: (u: unknown) => u is s.TypeOf<S>
  ): s.Schema<
    s.URISIn<S> | GuardSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    s.OutputOf<S>,
    s.ApiOf<S>
  >
  /**
   * @rewrite gen_ from "@principia/schema/Schema"
   */
  withGen<S extends s.AnyS>(
    this: S,
    gen: Gen<s.TypeOf<S>>
  ): s.Schema<
    s.URISIn<S> | GenSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    s.OutputOf<S>,
    s.ApiOf<S>
  >
  /**
   * @rewrite eq_ from "@principia/schema/Schema"
   */
  withEq<S extends s.AnyS>(
    this: S,
    eq: Eq<s.TypeOf<S>>
  ): s.Schema<
    s.URISIn<S> | EqSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    s.OutputOf<S>,
    s.ApiOf<S>
  >
  /**
   * @rewrite equals_ from "@principia/schema/Schema"
   */
  withEquals<S extends s.AnyS>(
    this: S,
    equals: (x: s.TypeOf<S>, y: s.TypeOf<S>) => boolean
  ): s.Schema<
    s.URISIn<S> | EqSURI,
    s.InputOf<S>,
    s.CInputOf<S>,
    s.ErrorOf<S>,
    s.CErrorOf<S>,
    s.TypeOf<S>,
    s.OutputOf<S>,
    s.ApiOf<S>
  >
  /**
   * @rewrite constructor_ from "@principia/schema/Schema"
   */
  withConstructor<S extends s.AnyS, CI, CE>(
    this: S,
    ctor: Parser<CI, CE, s.TypeOf<S>>
  ): s.Schema<s.URISIn<S> | ConstructorSURI, s.InputOf<S>, CI, s.ErrorOf<S>, CE, s.TypeOf<S>, s.OutputOf<S>, s.ApiOf<S>>
  /**
   * @rewrite create_ from "@principia/schema/Schema"
   */
  withCreate<S extends s.AnyS, CI, CE>(
    this: S,
    parse: (i: CI) => These<CE, s.TypeOf<S>>
  ): s.Schema<s.URISIn<S> | ConstructorSURI, s.InputOf<S>, CI, s.ErrorOf<S>, CE, s.TypeOf<S>, s.OutputOf<S>, s.ApiOf<S>>
  /**
   * @rewrite mapApi_ from "@principia/schema/Schema"
   */
  mapApi<S extends s.AnyS, Y>(
    this: S,
    f: (api: s.ApiOf<S>) => Y
  ): s.Schema<s.URISIn<S>, s.InputOf<S>, s.CInputOf<S>, s.ErrorOf<S>, s.CErrorOf<S>, s.TypeOf<S>, s.OutputOf<S>, Y>
  /**
   * @rewrite named_ from "@principia/schema/Schema"
   */
  named<S extends s.AnyS, Name extends string>(this: S, name: Name): s.NamedS<S, Name>
  /**
   * @rewrite chunk from "@principia/schema/Schema"
   */
  chunk<S extends s.AnyUS>(this: S): s.ChunkS<S>
  /**
   * @rewrite newtypeIso from "@principia/schema/Schema"
   */
  newtype<S extends s.AnyS, N extends Newtype<any, s.TypeOf<S>>>(this: S, iso: Iso<s.TypeOf<S>, N>): s.NewtypeIsoS<S, N>
  /**
   * @rewrite newtypePrism from "@principia/schema/Schema"
   */
  newtype<S extends s.AnyS, N extends Newtype<any, s.TypeOf<S>>>(
    this: S,
    prism: Prism<s.TypeOf<S>, N>
  ): s.NewtypePrismS<S, N>
  /**
   * @rewrite nonEmpty from "@principia/schema/Schema"
   */
  nonEmpty<S extends s.Schema<any, any, any, any, any, { length: number }, any, any>>(this: S): s.NonEmptyS<S>
  /**
   * @rewrite positive from "@principia/schema/Schema"
   */
  positive<S extends s.Schema<any, any, any, any, any, number, any, any>>(this: S): s.PositiveS<S>
}
