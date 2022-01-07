import type { Encoder } from './Encoder'
import type { Gen } from './Gen'
import type { Guard } from './Guard'
import type { CoreURIS } from './Modules'
import type * as PE from './ParseError'
import type { ComposeE, Parser } from './Parser'
import type { AnyUS, Schema } from './Schema/core'
import type {
  AnyPropertyWithInstance,
  PropertiesCErr,
  PropertiesCIn,
  PropertiesErr,
  PropertiesOptput,
  PropertiesType
} from './Schema/properties'
import type { TaggedUnionS } from './Schema/taggedUnion'
import type { CastToNumber } from './util'
import type { Conc } from '@principia/base/collection/immutable/Conc'
import type { Iso } from '@principia/base/Iso'
import type { Maybe } from '@principia/base/Maybe'
import type { Newtype } from '@principia/base/Newtype'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Eq, Predicate } from '@principia/base/prelude'
import type { Prism } from '@principia/base/Prism'
import type { Refinement } from '@principia/base/Refinement'
import type { Primitive, UnionToIntersection } from '@principia/base/util/types'

export interface URItoSchemable<I, CI, E, CE, A, O> {}

export type URIS = keyof URItoSchemable<any, any, any, any, any, any>

export type Kind<F extends URIS, I, CI, E, CE, A, O> = F extends URIS ? URItoSchemable<I, CI, E, CE, A, O>[F] : never

export type AnyKind<F extends URIS> = Kind<F, any, any, any, any, any, any>
export type AnyUKind<F extends URIS> = Kind<F, unknown, any, any, any, any, any>

export type InputOfK<F extends URIS, K> = K extends Kind<F, infer I, any, any, any, any, any> ? I : never
export type CInputOfK<F extends URIS, K> = K extends Kind<F, any, infer CI, any, any, any, any> ? CI : never
export type ErrorOfK<F extends URIS, K> = K extends Kind<F, any, any, infer E, any, any, any> ? E : never
export type CErrorOfK<F extends URIS, K> = K extends Kind<F, any, any, any, infer CE, any, any> ? CE : never
export type TypeOfK<F extends URIS, K> = K extends Kind<F, any, any, any, any, infer A, any> ? A : never
export type OutputOfK<F extends URIS, K> = K extends Kind<F, any, any, any, any, any, infer O> ? O : never

export type Schemable<F extends URIS> = RequiredSchemable<F> & Partial<OptionalSchemable<F>>

export interface IdentityOmits {}

export type IdentityOmitURIS = keyof IdentityOmits

export interface IdentityRequires {}

export type IdentityRequireURIS = keyof IdentityRequires

export type Identities<U extends URIS, A> = Omit<{ [F in U]: Kind<F, A, never, A, A, never, A> }, keyof IdentityOmits>

type EnsureTag<F extends URIS, T extends string, M> = {
  [K in keyof M]: Kind<F, any, any, any, any, { [_ in T]: K }, any>
}

export interface RequiredSchemable<F extends URIS> {
  URI: F

  readonly identity: <U extends Exclude<URIS, IdentityOmitURIS>, A>(identities: {
    [K in U | IdentityRequireURIS]: Kind<K, A, A, never, never, A, A>
  }) => Kind<F, A, A, never, never, A, A>

  /*
   * -------------------------------------------
   * primitives
   * -------------------------------------------
   */

  readonly unknown: Kind<F, unknown, unknown, never, never, unknown, unknown>

  readonly literal: <A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>(
    ...literals: A
  ) => Kind<F, unknown, A[number], PE.LiteralLE<A[number]>, never, A[number], A[number]>

  readonly string: Kind<F, unknown, string, PE.StringLE, never, string, string>

  readonly number: Kind<F, unknown, number, PE.NumberLE | PE.InfinityLE | PE.NaNLE, never, number, number>

  readonly boolean: Kind<F, unknown, boolean, PE.BooleanLE, never, boolean, boolean>

  readonly bigint: Kind<F, unknown, bigint, PE.StringLE | PE.BigIntLE, never, bigint, string>

  readonly dateString: Kind<F, unknown, Date, PE.StringLE | PE.DateFromStringLE, never, Date, string>

  readonly dateMs: Kind<F, unknown, Date, PE.NumberLE | PE.DateFromMsLE, never, Date, number>

  /*
   * -------------------------------------------
   * combinators
   * -------------------------------------------
   */

  readonly nullable: <I, CI, E, CE, A, O>(
    or: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>
  ) => Kind<F, null | undefined | I, Maybe<CI>, PE.NullableE<E>, PE.OptionalE<CE>, Maybe<A>, null | O>

  readonly struct: <P extends Record<string, AnyUKind<F>>>(
    properties: P,
    _: Record<string, Schema<CoreURIS | F, unknown, any, any, any, any, any, any>>
  ) => Kind<
    F,
    unknown,
    { readonly [K in keyof P]: CInputOfK<F, P[K]> },
    PE.CompositionE<
      | PE.UnknownRecordLE
      | PE.UnexpectedKeysLE
      | PE.MissingKeysLE<keyof P>
      | PE.CompoundE<{ readonly [K in keyof P]: PE.RequiredKeyE<K, ErrorOfK<F, P[K]>> }[keyof P]>
    >,
    PE.CompoundE<{ [K in keyof P]: PE.RequiredKeyE<K, CErrorOfK<F, P[K]>> }[keyof P]>,
    { readonly [K in keyof P]: TypeOfK<F, P[K]> },
    { [K in keyof P]: OutputOfK<F, P[K]> }
  >

  readonly partial: <P extends Record<string, Kind<F, unknown, any, any, any, any, any>>>(
    properties: P,
    _: Record<string, Schema<CoreURIS | F, unknown, any, any, any, any, any, any>>
  ) => Kind<
    F,
    unknown,
    Partial<{ [K in keyof P]: CInputOfK<F, P[K]> }>,
    PE.CompositionE<
      | PE.UnknownRecordLE
      | PE.UnexpectedKeysLE
      | PE.CompoundE<{ readonly [K in keyof P]: PE.OptionalKeyE<K, ErrorOfK<F, P[K]>> }[keyof P]>
    >,
    PE.CompoundE<{ [K in keyof P]: PE.OptionalKeyE<K, CErrorOfK<F, P[K]>> }[keyof P]>,
    Partial<{ [K in keyof P]: TypeOfK<F, P[K]> }>,
    Partial<{ [K in keyof P]: OutputOfK<F, P[K]> }>
  >

  readonly array: <E, A, CI, CE, O>(
    item: Kind<F, unknown, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, unknown, CI, E, CE, A, O, unknown>
  ) => Kind<
    F,
    unknown,
    Iterable<CI>,
    PE.UnknownArrayLE | PE.CompoundE<PE.OptionalIndexE<number, E>>,
    PE.CompoundE<PE.OptionalIndexE<number, CE>>,
    ReadonlyArray<A>,
    ReadonlyArray<O>
  >

  readonly conc: <CI, E, CE, A, O>(
    item: Kind<F, unknown, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, unknown, CI, E, CE, A, O, any>
  ) => Kind<
    F,
    unknown,
    Iterable<CI>,
    PE.UnknownIterableLE | PE.CompoundE<PE.OptionalIndexE<number, E>>,
    PE.CompoundE<PE.OptionalIndexE<number, CE>>,
    Conc<A>,
    ReadonlyArray<O>
  >

  readonly record: <E, A, CI, CE, O>(
    codomain: Kind<F, unknown, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, unknown, any, any, any, any, any, any>
  ) => Kind<
    F,
    unknown,
    Record<string, CI>,
    PE.UnknownRecordLE | PE.CompoundE<PE.OptionalKeyE<string, E>>,
    PE.CompoundE<PE.OptionalKeyE<string, CE>>,
    Record<string, A>,
    Record<string, O>
  >

  readonly tuple: <C extends ReadonlyArray<AnyUKind<F>>>(
    components: C,
    _: ReadonlyArray<Schema<CoreURIS | F, unknown, any, any, any, any, any, any>>
  ) => Kind<
    F,
    unknown,
    { readonly [K in keyof C]: CInputOfK<F, C[K]> },
    PE.CompositionE<
      | PE.UnknownArrayLE
      | PE.UnexpectedIndicesLE
      | PE.MissingIndicesLE
      | PE.CompoundE<{ [K in keyof C]: PE.RequiredIndexE<CastToNumber<K>, ErrorOfK<F, C[K]>> }[number]>
    >,
    PE.CompoundE<{ [K in keyof C]: PE.RequiredIndexE<CastToNumber<K>, CErrorOfK<F, C[K]>> }[number]>,
    { readonly [K in keyof C]: TypeOfK<F, C[K]> },
    { [K in keyof C]: OutputOfK<F, C[K]> }
  >

  readonly sum: <T extends string>(
    tag: T
  ) => <Members extends Record<string, Kind<F, unknown, any, any, any, any, any>>>(
    members: EnsureTag<F, T, Members> & Members,
    _: Record<string, Schema<CoreURIS | F, unknown, any, any, any, any, any, any>>
  ) => Kind<
    F,
    unknown,
    CInputOfK<F, Members[keyof Members]>,
    | PE.UnknownRecordLE
    | PE.TagLE
    | PE.SumE<{ [K in keyof Members]: PE.MemberE<K, ErrorOfK<F, Members[K]>> }[keyof Members]>,
    PE.TagLE | PE.SumE<{ [K in keyof Members]: PE.MemberE<K, CErrorOfK<F, Members[K]>> }[keyof Members]>,
    TypeOfK<F, Members[keyof Members]>,
    OutputOfK<F, Members[keyof Members]>
  >

  readonly properties: <P extends Record<string, AnyPropertyWithInstance<F>>>(
    properties: P
  ) => Kind<F, unknown, PropertiesCIn<P>, PropertiesErr<P>, PropertiesCErr<P>, PropertiesType<P>, PropertiesOptput<P>>

  readonly taggedUnion: <M extends Record<PropertyKey, AnyUKind<F>>>(
    members: M,
    _: TaggedUnionS<Record<PropertyKey, AnyUS>>
  ) => Kind<
    F,
    unknown,
    CInputOfK<F, M[keyof M]>,
    PE.UnknownRecordLE | PE.TagLE | PE.CompoundE<{ [K in keyof M]: PE.MemberE<K, ErrorOfK<F, M[K]>> }[keyof M]>,
    PE.TagLE | PE.CompoundE<{ [K in keyof M]: PE.MemberE<K, CErrorOfK<F, M[K]>> }[keyof M]>,
    TypeOfK<F, M[keyof M]>,
    OutputOfK<F, M[keyof M]>
  >

  readonly lazy: <I, CI, E, CE, A, O>(
    f: () => Kind<F, I, CI, E, CE, A, O>,
    id: string,
    _: () => Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>
  ) => Kind<F, I, CI, E, CE, A, O>

  /*
   * -------------------------------------------
   * Compose
   * -------------------------------------------
   */

  readonly compose: <I, CI, E, CE, A, O, CI1, E1, CE1, B, O1>(
    ia: Kind<F, I, CI, E, CE, A, O>,
    ab: Kind<F, A, CI1, E1, CE1, B, O1>,
    _ia: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    _ab: Schema<F, A, CI1, E1, CE1, B, O1, unknown>
  ) => Kind<F, I, CI1, ComposeE<E, E1>, CE1, B, O1>

  /*
   * -------------------------------------------
   * custom
   * -------------------------------------------
   */

  readonly custom: <I, CI, E, CE, A, O>(
    parsers: URItoSchemable<I, CI, E, CE, A, O>,
    label: string
  ) => Kind<F, I, CI, E, CE, A, O>

  /*
   * -------------------------------------------
   * refine
   * -------------------------------------------
   */

  readonly refine: <I, CI, E, CE, A, O, B extends A, E1, W>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    refinement: Refinement<A, B>,
    error: (a: A) => E1,
    warn: (a: B) => Maybe<W>,
    label: string
  ) => Kind<F, I, CI, ComposeE<E, PE.RefinementE<E1 | W>>, ComposeE<CE, PE.RefinementE<E1 | W>>, B, O>

  /*
   * -------------------------------------------
   * constrain
   * -------------------------------------------
   */

  readonly constrain: <I, CI, E, CE, A, O, E1, W>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    predicate: Predicate<A>,
    error: (a: A) => E1,
    warn: (a: A) => Maybe<W>,
    label: string
  ) => Kind<F, I, CI, ComposeE<E, PE.RefinementE<E1 | W>>, ComposeE<CE, PE.RefinementE<E1 | W>>, A, O>

  /*
   * -------------------------------------------
   * intersect
   * -------------------------------------------
   */

  readonly intersect: <M extends NonEmptyArray<Kind<F, any, any, any, any, Record<string, any>, Record<string, any>>>>(
    members: M,
    _: NonEmptyArray<Schema<CoreURIS | F, any, any, any, any, Record<string, any>, Record<string, any>, unknown>>
  ) => Kind<
    F,
    UnionToIntersection<InputOfK<F, M[number]>>,
    UnionToIntersection<CInputOfK<F, M[number]>>,
    PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, ErrorOfK<F, M[K]>> }[number]>,
    PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, CErrorOfK<F, M[K]>> }[number]>,
    UnionToIntersection<TypeOfK<F, M[number]>>,
    UnionToIntersection<OutputOfK<F, M[number]>>
  >

  /*
   * -------------------------------------------------------------------------------------------------
   * union
   * -------------------------------------------------------------------------------------------------
   */

  readonly union: <M extends NonEmptyArray<AnyKind<F>>>(
    members: M,
    _: NonEmptyArray<Schema<CoreURIS | F, any, any, any, any, any, any, any>>
  ) => Kind<
    F,
    InputOfK<F, M[number]>,
    CInputOfK<F, M[number]>,
    PE.CompoundE<
      {
        [K in keyof M]: PE.MemberE<CastToNumber<K>, ErrorOfK<F, M[K]>>
      }[number]
    >,
    PE.CompoundE<
      {
        [K in keyof M]: PE.MemberE<CastToNumber<K>, CErrorOfK<F, M[K]>>
      }[number]
    >,
    TypeOfK<F, M[number]>,
    OutputOfK<F, M[number]>
  >

  /*
   * -------------------------------------------
   * configure
   * -------------------------------------------
   */

  readonly configure: <I, CI, E, CE, A, O, I1, CI1, E1, CE1, A1, O1>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    config: {
      [K in URIS]: (k: Kind<K, I, CI, E, CE, A, O>) => Kind<K, I1, CI1, E1, CE1, A1, O1>
    }
  ) => Kind<F, I1, CI1, E1, CE1, A1, O1>

  readonly newtypeIso: <I, CI, E, CE, A, O, N extends Newtype<any, A>>(
    s: Kind<F, I, CI, E, CE, A, O>,
    iso: Iso<A, N>,
    _: Schema<F, I, CI, E, CE, A, O, any>
  ) => Kind<F, I, CI, E, CE, N, O>

  readonly newtypePrism: <I, CI, E, CE, A, O, N extends Newtype<any, A>>(
    s: Kind<F, I, CI, E, CE, A, O>,
    prism: Prism<A, N>,
    _: Schema<F, I, CI, E, CE, A, O, any>
  ) => Kind<F, I, CI, ComposeE<E, PE.NewtypePrismLE<A>>, ComposeE<CE, PE.NewtypePrismLE<A>>, N, O>
}

export interface OptionalSchemable<F extends URIS> {
  /*
   * -------------------------------------------
   * Bifunctor
   * -------------------------------------------
   */

  readonly mapDecodeError: <I, CI, E, CE, A, O, E1>(
    fa: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    f: (e: E) => E1
  ) => Kind<F, I, CI, E1, CE, A, O>

  readonly mapConstructError: <I, CI, E, CE, A, O, CE1>(
    fa: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    f: (e: CE) => CE1
  ) => Kind<F, I, CI, E, CE1, A, O>

  /*
   * -------------------------------------------
   * mapOutput
   * -------------------------------------------
   */

  readonly mapOutput: <I, CI, E, CE, A, O, O1>(
    fa: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    f: (o: O) => O1
  ) => Kind<F, I, CI, E, CE, A, O1>

  /*
   * -------------------------------------------
   * parser
   * -------------------------------------------
   */

  readonly withDecoder: <I, CI, E, CE, A, O, I1, E1>(
    s: Kind<F, I, E, A, CI, CE, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    decoder: Parser<I1, E1, A>
  ) => Kind<F, I1, CI, E1, CE, A, O>

  /*
   * -------------------------------------------
   * encoder
   * -------------------------------------------
   */

  readonly withEncoder: <I, CI, E, CE, A, O, O1>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    encoder: Encoder<A, O1>
  ) => Kind<F, I, CI, E, CE, A, O1>

  /*
   * -------------------------------------------
   * guard
   * -------------------------------------------
   */

  readonly withGuard: <I, CI, E, CE, A, O>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    guard: Guard<A>
  ) => Kind<F, I, CI, E, CE, A, O>

  /*
   * -------------------------------------------
   * gen
   * -------------------------------------------
   */

  readonly withGen: <I, CI, E, CE, A, O>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    gen: Gen<A>
  ) => Kind<F, I, CI, E, CE, A, O>

  /*
   * -------------------------------------------
   * eq
   * -------------------------------------------
   */

  readonly withEq: <I, CI, E, CE, A, O>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    eq: Eq<A>
  ) => Kind<F, I, CI, E, CE, A, O>

  /*
   * -------------------------------------------
   * constructor
   * -------------------------------------------
   */

  readonly withConstructor: <I, CI, E, CE, A, O, CI1, CE1>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    ctor: Parser<CI1, CE1, A>
  ) => Kind<F, I, CI1, E, CE1, A, O>

  /*
   * -------------------------------------------
   * withDefault
   * -------------------------------------------
   */

  readonly withDefault_: <I, CI, E, CE, A, O>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    def: () => A
  ) => Kind<F, I | null | undefined, CI | null | undefined, E, CE, A, O>

  readonly named: <I, CI, E, CE, A, O, N extends string>(
    s: Kind<F, I, CI, E, CE, A, O>,
    _: Schema<CoreURIS | F, I, CI, E, CE, A, O, unknown>,
    name: N
  ) => Kind<F, I, CI, PE.NamedE<N, E>, PE.NamedE<N, CE>, A, O>
}

export interface WithUnknownContainers<F extends URIS> {
  readonly UnknownArray: Kind<
    F,
    unknown,
    PE.UnknownArrayLE,
    ReadonlyArray<unknown>,
    ReadonlyArray<unknown>,
    never,
    ReadonlyArray<unknown>
  >

  readonly UnknownRecord: Kind<
    F,
    unknown,
    PE.UnknownRecordLE,
    Record<PropertyKey, unknown>,
    Record<PropertyKey, unknown>,
    never,
    Record<PropertyKey, unknown>
  >
}

export interface WithUnion<F extends URIS> {
  readonly union: <Members extends [AnyKind<F>, ...AnyKind<F>[]]>(
    ...members: Members
  ) => Kind<
    F,
    InputOfK<F, Members[number]>,
    PE.CompoundE<
      {
        [K in keyof Members]: PE.MemberE<CastToNumber<K>, ErrorOfK<F, Members[K]>>
      }[number]
    >,
    TypeOfK<F, Members[number]>,
    CInputOfK<F, Members[number]>,
    PE.CompoundE<
      {
        [K in keyof Members]: PE.MemberE<CastToNumber<K>, CErrorOfK<F, Members[K]>>
      }[number]
    >,
    OutputOfK<F, Members[number]>
  >
}

export interface WithInvariant<F extends URIS> {
  readonly invmap_: <I, E, A, O, CI, CE, B>(
    fa: Kind<F, I, E, A, CI, CE, O>,
    f: (a: A) => B,
    g: (b: B) => A
  ) => Kind<F, I, E, B, CI, CE, O>
  readonly invmap: <A, B>(
    f: (a: A) => B,
    g: (b: B) => A
  ) => <I, E, CI, CE, O>(fa: Kind<F, I, E, A, CI, CE, O>) => Kind<F, I, E, B, CI, CE, O>
}

export interface WithFromRefinement<F extends URIS> {
  readonly fromRefinement: <E, W, A>(
    refinement: Refinement<unknown, A>,
    error: (u: unknown) => E,
    warn: (u: unknown) => Maybe<W>,
    label: string
  ) => Kind<F, unknown, PE.RefinementE<E | W>, A, A, never, A>
}

export interface WithOptional<F extends URIS> {
  readonly optional: <I, E, A, CI, CE, O>(
    or: Kind<F, I, E, A, CI, CE, O>
  ) => Kind<F, null | undefined | I, PE.OptionalE<E>, Maybe<A>, Maybe<A>, never, null | O>
}
