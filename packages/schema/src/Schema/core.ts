import type { Constructor } from '../Constructor'
import type * as D from '../Decoder'
import type { Encoder, EncoderSURI } from '../Encoder'
import type { EqSURI } from '../Eq'
import type { Gen, GenSURI } from '../Gen'
import type { Guard, GuardSURI } from '../Guard'
import type { ConstructorSURI, CoreURIS, DecoderSURI } from '../Modules'
import type * as PE from '../ParseError'
import type { ComposeE, Parser } from '../Parser'
import type { IdentityOmits, Kind, URIS } from '../Schemable'
import type { CastToNumber } from '../util'
import type { SchemaAnnotation } from './SchemaAnnotation'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type * as O from '@principia/base/Option'
import type { EnforceNonEmptyRecord, Predicate, UnionToIntersection } from '@principia/base/prelude'
import type { Refinement } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

import { Eq } from '@principia/base/prelude'
import { isObject } from '@principia/base/util/predicates'

import { SchemaAnnotationMap } from './SchemaAnnotationMap'

export const SchemaContinuation = Symbol('@principia/schema/Schema/SchemaComtinuation')
export type SchemaContinuation = typeof SchemaContinuation

export const SchemaTypeId = Symbol('@principia/schema/Schema')
export type SchemaTypeId = typeof SchemaTypeId

export interface HasSchemaContinuation {
  readonly [SchemaContinuation]: AnyS
}

/**
 * `Schema<U, In, CIn, Err, CErr, Type, Out, Api>` describes a polymorphic data model of type `Type` that can be:
 *
 * - interpreted into the type constructors indexed on the `Schemable URIs` in `U`
 *
 * - decoded from input of type `In`, either failing with type `Err`, or succeeding
 *   with type `Type`, possibly emitting warnings of type `Err`
 *
 * - constructed from input of type `CIn`, either failing with type `CErr`, or succeeding
 *   with type `Type`, possibly emitting warnings of type `CErr`
 *
 * - encoded into type `Out` from type `Type`
 *
 * - interacted with via the api of type `Api`
 */
export abstract class Schema<U extends URIS, In, CIn, Err, CErr, Type, Out, Api> {
  readonly [SchemaTypeId]: SchemaTypeId = SchemaTypeId

  readonly _U!: U
  readonly _In!: (_: In) => void
  readonly _CIn!: (_: CIn) => void
  readonly _Err!: () => Err
  readonly _CErr!: () => CErr
  readonly _Type!: () => Type
  readonly _Out!: () => Out
  abstract readonly api: Api

  private annotations = SchemaAnnotationMap.empty;
  ['>>>']<To extends Schema<U, Type, any, any, any, any, any, any>>(to: To): PipeS<this, To> {
    return compose_(this, to) as any
  }

  abstract clone(): Schema<U, In, CIn, Err, CErr, Type, Out, Api>

  annotate<V>(key: SchemaAnnotation<V>, value: V): this {
    const copy       = this.clone()
    copy.annotations = this.annotations.annotate(key, value)
    return copy as any
  }

  getAnnotation<V>(key: SchemaAnnotation<V>): V {
    return this.annotations.get(key)
  }
}

export function hasContinuation<S extends AnyS>(schema: S): schema is S & HasSchemaContinuation {
  return SchemaContinuation in schema
}

export type URISIn<S> = S extends Schema<infer U, any, any, any, any, any, any, any> ? U : never
export type InputOf<S> = S extends Schema<any, infer I, any, any, any, any, any, any> ? I : never
export type CInputOf<S> = S extends Schema<any, any, infer CI, any, any, any, any, any> ? CI : never
export type ErrorOf<S> = S extends Schema<any, any, any, infer E, any, any, any, any> ? E : never
export type CErrorOf<S> = S extends Schema<any, any, any, any, infer CE, any, any, any> ? CE : never
export type TypeOf<S> = S extends Schema<any, any, any, any, any, infer A, any, any> ? A : never
export type OutputOf<S> = S extends Schema<any, any, any, any, any, any, infer O, any> ? O : never
export type ApiOf<S> = S extends Schema<any, any, any, any, any, any, any, infer Y> ? Y : never

export type AnyS = Schema<URIS, any, any, any, any, any, any, any>
export type AnyUS = Schema<URIS, unknown, any, any, any, any, any, any>

export type AnySOf<U extends URIS> = Schema<U, any, any, any, any, any, any, any>
export type AnyUSOf<U extends URIS> = Schema<U, unknown, any, any, any, any, any, any>

export type CoreS = Schema<CoreURIS, any, any, any, any, any, any, any>

export type Standard<A, Out = unknown> = Schema<CoreURIS, unknown, A, PE.AnyError, PE.AnyError, A, Out, {}>

export type StandardE<E, A, Out = unknown> = Schema<CoreURIS, unknown, A, PE.AnyError<E>, PE.AnyError<E>, A, Out, {}>

export type StandardCIn<CIn, A, Out = unknown> = Schema<CoreURIS, unknown, CIn, PE.AnyError, PE.AnyError, A, Out, {}>

export type StandardCInE<CIn, E, A, Out = unknown> = Schema<
  CoreURIS,
  unknown,
  CIn,
  PE.AnyError<E>,
  PE.AnyError<E>,
  A,
  Out,
  {}
>

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export class UnknownS extends Schema<URIS, unknown, unknown, never, never, unknown, unknown, {}> {
  readonly _tag = 'Unknown'

  readonly api = {}

  clone() {
    return new UnknownS()
  }
}

export const unknown = new UnknownS()

export class StringS extends Schema<URIS, unknown, string, PE.StringLE, never, string, string, {}> {
  readonly _tag = 'String'

  readonly api = {}

  clone() {
    return new StringS()
  }
}

export const string = new StringS()

export class NumberS extends Schema<
  URIS,
  unknown,
  number,
  PE.NumberLE | PE.NaNLE | PE.InfinityLE,
  PE.NaNLE | PE.InfinityLE,
  number,
  number,
  {}
> {
  readonly _tag = 'Number'

  readonly api = {}

  clone() {
    return new NumberS()
  }
}

export const number = new NumberS()

export class BooleanS extends Schema<URIS, unknown, boolean, PE.BooleanLE, never, boolean, boolean, {}> {
  readonly _tag = 'Boolean'

  readonly api = {}

  clone() {
    return new BooleanS()
  }
}

export const boolean = new BooleanS()

export interface LiteralApi<L extends NonEmptyArray<string>> {
  readonly literals: L
  readonly matchS: <A>(
    _: {
      [K in L[number]]: (_: K) => A
    }
  ) => (ks: L[number]) => A
  readonly matchW: <M extends { [K in L[number]]: (_: K) => any }>(
    _: M
  ) => (ks: L[number]) => {
    [K in keyof M]: ReturnType<M[K]>
  }[keyof M]
}

export class LiteralS<L extends NonEmptyArray<string>> extends Schema<
  URIS,
  unknown,
  L[number],
  PE.LiteralLE<L[number]>,
  never,
  L[number],
  L[number],
  LiteralApi<L>
> {
  readonly _tag = 'Literal'

  constructor(readonly literals: L) {
    super()
  }

  get api(): LiteralApi<L> {
    return {
      literals: this.literals,
      matchS: (m) => (k) => m[k](k),
      matchW: (m) => (k) => m[k](k)
    }
  }

  clone() {
    return new LiteralS(this.literals)
  }
}

export function literal<L extends NonEmptyArray<string>>(...literals: L): LiteralS<L> {
  return new LiteralS(literals)
}

interface IdentityApi<U extends URIS, A> {
  readonly ids: { [F in U]: Kind<F, A, A, never, never, A, A> }
}
function identityApi<U extends URIS, A>(ids: { [F in U]: Kind<F, A, A, never, never, A, A> }) {
  return { ids }
}

export class IdentityS<U extends URIS, A> extends Schema<
  U | keyof IdentityOmits,
  A,
  A,
  never,
  never,
  A,
  A,
  IdentityApi<U, A>
> {
  readonly _tag = 'Identity'

  get api() {
    return identityApi(this.ids)
  }

  constructor(readonly ids: { [F in U]: Kind<F, A, A, never, never, A, A> }) {
    super()
  }

  clone(): IdentityS<U, A> {
    return new IdentityS(this.ids)
  }
}

export function identity<A>(): <U extends Exclude<URIS, IdentityOmits>>(
  ids: { [F in U]: Kind<F, A, A, never, never, A, A> }
) => IdentityS<U, A> {
  return (ids) => new IdentityS(ids)
}

export interface TagApi<T extends string> {
  readonly tag: T
}

export const TagSTypeId = Symbol('@principia/schema/Schema/TagS')
export type TagSTypeId = typeof TagSTypeId

export class TagS<T extends string> extends Schema<URIS, unknown, T, PE.LiteralLE<T>, never, T, T, TagApi<T>> {
  readonly _tag                     = 'Tag';
  readonly [TagSTypeId]: TagSTypeId = TagSTypeId

  constructor(readonly tag: T) {
    super()
  }

  get api() {
    return {
      tag: this.tag
    }
  }

  clone() {
    return new TagS(this.tag)
  }
}

export function isTagS(u: unknown): u is TagS<string> {
  return isObject(u) && TagSTypeId in u
}

export function tag<T extends string>(tag: T): TagS<T> {
  return new TagS(tag)
}

export interface BrandS<S extends AnyS, B>
  extends Schema<URISIn<S>, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, B, OutputOf<S>, ApiOf<S>> {}

export function brand<B>(): <S extends AnyS>(schema: S) => BrandS<S, B> {
  return (schema) => schema as any
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export class RefineS<S extends AnyS, W, E, B extends TypeOf<S>>
  extends Schema<
    URISIn<S>,
    InputOf<S>,
    CInputOf<S>,
    PE.CompoundE<ErrorOf<S> | PE.RefinementE<E | W>>,
    PE.CompoundE<CErrorOf<S> | PE.RefinementE<E | W>>,
    B,
    OutputOf<S>,
    ApiOf<S>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Refine'

  constructor(
    readonly from: S,
    readonly refinement: Refinement<TypeOf<S>, B>,
    readonly error: (a: TypeOf<S>) => E,
    readonly warn: (a: B) => O.Option<W>,
    readonly label = '<anonymous>'
  ) {
    super()
  }

  get api() {
    return this.from.api
  }

  readonly [SchemaContinuation] = this.from

  clone(): RefineS<S, W, E, B> {
    return new RefineS(this.from, this.refinement, this.error, this.warn, this.label)
  }
}

export function refine_<S extends AnyS, W, E, B extends TypeOf<S>>(
  from: S,
  refinement: Refinement<TypeOf<S>, B>,
  error: (a: TypeOf<S>) => E,
  warn: (a: B) => O.Option<W>,
  label?: string
): RefineS<S, W, E, B> {
  return new RefineS(from, refinement, error, warn, label)
}

export function refine<S extends AnyS, W, E, B extends TypeOf<S>>(
  refinement: Refinement<TypeOf<S>, B>,
  error: (a: TypeOf<S>) => E,
  warn: (a: B) => O.Option<W>,
  label?: string
): (from: S) => RefineS<S, W, E, B> {
  return (from) => refine_(from, refinement, error, warn, label)
}

export class ConstrainS<S extends AnyS, W, E>
  extends Schema<
    URISIn<S>,
    InputOf<S>,
    CInputOf<S>,
    PE.CompoundE<ErrorOf<S> | PE.RefinementE<E | W>>,
    PE.CompoundE<CErrorOf<S> | PE.RefinementE<E | W>>,
    TypeOf<S>,
    OutputOf<S>,
    ApiOf<S>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Constrain'

  constructor(
    readonly from: S,
    readonly predicate: Predicate<TypeOf<S>>,
    readonly error: (a: TypeOf<S>) => E,
    readonly warn: (a: TypeOf<S>) => O.Option<W>,
    readonly label = '<anonymous>'
  ) {
    super()
  }

  get api() {
    return this.from.api
  }

  readonly [SchemaContinuation] = this.from

  clone(): ConstrainS<S, W, E> {
    return new ConstrainS(this.from, this.predicate, this.error, this.warn, this.label)
  }
}

export function constrain_<S extends AnyS, W, E>(
  from: S,
  predicate: Predicate<TypeOf<S>>,
  error: (a: TypeOf<S>) => E,
  warn: (a: TypeOf<S>) => O.Option<W>,
  label?: string
): ConstrainS<S, W, E> {
  return new ConstrainS(from, predicate, error, warn, label)
}

export function constrain<S extends AnyS, W, E>(
  predicate: Predicate<TypeOf<S>>,
  error: (a: TypeOf<S>) => E,
  warn: (a: TypeOf<S>) => O.Option<W>,
  label?: string
): (from: S) => ConstrainS<S, W, E> {
  return (from) => constrain_(from, predicate, error, warn, label)
}

export class NullableS<S extends AnyS> extends Schema<
  URISIn<S>,
  InputOf<S> | null | undefined,
  O.Option<CInputOf<S>>,
  PE.NullableE<ErrorOf<S>>,
  PE.NullableE<CErrorOf<S>>,
  O.Option<TypeOf<S>>,
  OutputOf<S> | null,
  ApiOf<S>
> {
  readonly _tag = 'Nullable'

  get api() {
    return this.or.api
  }

  constructor(readonly or: S) {
    super()
  }

  clone(): NullableS<S> {
    return new NullableS(this.or)
  }
}

export function nullable<S extends AnyS>(or: S): NullableS<S> {
  return new NullableS(or)
}

export class WithDefaultS<S extends AnyS> extends Schema<
  URISIn<S>,
  InputOf<S> | null | undefined,
  O.Option<CInputOf<S>>,
  ErrorOf<S>,
  CErrorOf<S>,
  TypeOf<S>,
  OutputOf<S>,
  ApiOf<S>
> {
  readonly _tag = 'WithDefault'

  get api() {
    return this.or.api
  }

  constructor(readonly or: S, readonly def: () => TypeOf<S>) {
    super()
  }

  clone(): WithDefaultS<S> {
    return new WithDefaultS(this.or, this.def)
  }
}

export function withDefault_<S extends AnyS>(or: S, def: () => TypeOf<S>): WithDefaultS<S> {
  return new WithDefaultS(or, def)
}

export function withDefault<S extends AnyS>(def: () => TypeOf<S>): (or: S) => WithDefaultS<S> {
  return (or) => withDefault_(or, def)
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export type EnsureStructURIS<P, URIS = URISIn<P[keyof P]>> = unknown extends {
  [K in keyof P]: Exclude<URIS, URISIn<P[K]>> extends never ? URIS : unknown
}[keyof P]
  ? never
  : P

interface StructApi<P> {
  readonly properties: P
}

export class StructS<P> extends Schema<
  URISIn<P[keyof P]>,
  unknown,
  { [K in keyof P]: CInputOf<P[K]> },
  PE.CompositionE<
    | PE.UnknownRecordLE
    | PE.UnexpectedKeysLE
    | PE.MissingKeysLE<{ [K in keyof P]: K }[keyof P]>
    | PE.CompoundE<{ readonly [K in keyof P]: PE.RequiredKeyE<K, ErrorOf<P[K]>> }[keyof P]>
  >,
  PE.CompoundE<{ [K in keyof P]: PE.RequiredKeyE<K, CErrorOf<P[K]>> }[keyof P]>,
  { [K in keyof P]: TypeOf<P[K]> },
  { [K in keyof P]: OutputOf<P[K]> },
  StructApi<P>
> {
  readonly _tag = 'Struct'

  get api() {
    return {
      properties: this.properties
    }
  }

  constructor(readonly properties: P) {
    super()
  }

  clone(): StructS<P> {
    return new StructS(this.properties)
  }
}

export function struct<P extends Record<string, AnyUS>>(properties: EnsureStructURIS<P>): StructS<P> {
  return new StructS(properties as P)
}

/*
 * -------------------------------------------
 * partial
 * -------------------------------------------
 */

export class PartialS<P> extends Schema<
  URISIn<P[keyof P]>,
  unknown,
  { readonly [K in keyof P]?: CInputOf<P[K]> },
  PE.CompositionE<
    | PE.UnknownRecordLE
    | PE.UnexpectedKeysLE
    | PE.CompoundE<{ readonly [K in keyof P]: PE.OptionalKeyE<K, ErrorOf<P[K]>> }[keyof P]>
  >,
  PE.CompoundE<{ [K in keyof P]: PE.OptionalKeyE<K, CErrorOf<P[K]>> }[keyof P]>,
  { readonly [K in keyof P]?: TypeOf<P[K]> },
  { [K in keyof P]?: OutputOf<P[K]> },
  StructApi<P>
> {
  readonly _tag = 'Partial'

  get api() {
    return {
      properties: this.properties
    }
  }

  constructor(readonly properties: P) {
    super()
  }

  clone(): PartialS<P> {
    return new PartialS(this.properties)
  }
}

export function partial<P extends Record<string, AnyUS>>(properties: EnsureStructURIS<P>): PartialS<P> {
  return new PartialS(properties as P)
}

/*
 * -------------------------------------------
 * array
 * -------------------------------------------
 */

export class ArrayS<Item extends AnyUS> extends Schema<
  URISIn<Item>,
  unknown,
  Iterable<CInputOf<Item>>,
  PE.CompositionE<PE.UnknownArrayLE | PE.CompoundE<PE.OptionalIndexE<number, ErrorOf<Item>>>>,
  PE.CompoundE<PE.OptionalIndexE<number, CErrorOf<Item>>>,
  ReadonlyArray<TypeOf<Item>>,
  Array<OutputOf<Item>>,
  ApiOf<Item>
> {
  readonly _tag = 'Array'

  get api() {
    return this.item.api
  }

  constructor(readonly item: Item) {
    super()
  }

  clone(): ArrayS<Item> {
    return new ArrayS(this.item)
  }
}

export function array<Item extends AnyUS>(item: Item): ArrayS<Item> {
  return new ArrayS(item)
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export class RecordS<C extends AnyUS> extends Schema<
  URISIn<C>,
  unknown,
  Record<string, CInputOf<C>>,
  PE.CompositionE<PE.UnknownRecordLE | PE.CompoundE<PE.OptionalKeyE<string, ErrorOf<C>>>>,
  PE.CompoundE<PE.OptionalKeyE<string, CErrorOf<C>>>,
  Record<string, TypeOf<C>>,
  Record<string, OutputOf<C>>,
  ApiOf<C>
> {
  readonly _tag = 'Record'

  get api() {
    return this.codomain.api
  }

  constructor(readonly codomain: C) {
    super()
  }

  clone(): RecordS<C> {
    return new RecordS(this.codomain)
  }
}

export function record<C extends AnyUS>(codomain: C): RecordS<C> {
  return new RecordS(codomain)
}

/*
 * -------------------------------------------
 * tuple
 * -------------------------------------------
 */

export type EnsureTupleURIS<P extends ReadonlyArray<any>, URIS = URISIn<P[keyof P]>> = unknown extends {
  [K in keyof P]: Exclude<URIS, URISIn<P[K]>> extends never ? URIS : unknown
}[number]
  ? never
  : P

interface TupleApi<C extends ReadonlyArray<AnyS>> {
  readonly components: C
}
function tupleApi<C extends ReadonlyArray<AnyS>>(components: C): TupleApi<C> {
  return { components }
}

export class TupleS<C extends ReadonlyArray<AnyUS>> extends Schema<
  URISIn<C[number]>,
  unknown,
  { [K in keyof C]: CInputOf<C[K]> },
  PE.CompositionE<
    | PE.UnknownArrayLE
    | PE.UnexpectedIndicesLE
    | PE.MissingIndicesLE
    | PE.CompoundE<{ [K in keyof C]: PE.RequiredIndexE<CastToNumber<K>, ErrorOf<C[K]>> }[number]>
  >,
  PE.CompoundE<{ [K in keyof C]: PE.RequiredIndexE<CastToNumber<K>, CErrorOf<C[K]>> }[number]>,
  { [K in keyof C]: TypeOf<C[K]> },
  { [K in keyof C]: OutputOf<C[K]> },
  TupleApi<C>
> {
  readonly _tag = 'Tuple'

  get api() {
    return tupleApi(this.components)
  }

  constructor(readonly components: C) {
    super()
  }

  clone(): TupleS<C> {
    return new TupleS(this.components)
  }
}

export function tuple<C extends ReadonlyArray<AnyUS>>(...components: EnsureTupleURIS<C>): TupleS<C> {
  return new TupleS(components as C)
}

/*
 * -------------------------------------------
 * union
 * -------------------------------------------
 */

export interface UnionApi<M extends NonEmptyArray<AnyS>> {
  readonly members: M
}
function unionApi<M extends NonEmptyArray<AnyS>>(members: M): UnionApi<M> {
  return { members }
}

export class UnionS<M extends NonEmptyArray<AnyS>> extends Schema<
  URISIn<M[number]>,
  InputOf<M[number]>,
  CInputOf<M[number]>,
  PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, ErrorOf<M[K]>> }[number]>,
  PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, CErrorOf<M[K]>> }[number]>,
  TypeOf<M[number]>,
  OutputOf<M[number]>,
  UnionApi<M>
> {
  readonly _tag = 'Union'

  get api() {
    return unionApi(this.members)
  }

  constructor(readonly members: M) {
    super()
  }

  clone(): UnionS<M> {
    return new UnionS(this.members)
  }
}

export function union<M extends NonEmptyArray<AnyS>>(...members: EnsureTupleURIS<M>): UnionS<M> {
  return new UnionS(members)
}

/*
 * -------------------------------------------
 * intersect
 * -------------------------------------------
 */

export interface IntersectApi<M extends NonEmptyArray<AnyS>> {
  readonly members: M
}
function intersectApi<M extends NonEmptyArray<AnyS>>(members: M): IntersectApi<M> {
  return { members }
}

export type IntersectableSchema = Schema<URIS, any, any, any, any, Record<string, any>, Record<string, any>, any>

export class IntersectS<M extends NonEmptyArray<IntersectableSchema>> extends Schema<
  URISIn<M[number]>,
  UnionToIntersection<{ [K in keyof M]: InputOf<M[K]> }[number]>,
  UnionToIntersection<{ [K in keyof M]: CInputOf<M[K]> }[number]>,
  PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, ErrorOf<M[K]>> }[number]>,
  PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, CErrorOf<M[K]>> }[number]>,
  UnionToIntersection<{ [K in keyof M]: TypeOf<M[K]> }[number]>,
  UnionToIntersection<{ [K in keyof M]: OutputOf<M[K]> }[number]>,
  IntersectApi<M>
> {
  readonly _tag = 'Intersect'

  get api() {
    return intersectApi(this.members)
  }

  constructor(readonly members: M) {
    super()
  }

  clone(): IntersectS<M> {
    return new IntersectS(this.members)
  }
}

export function intersect<M extends NonEmptyArray<IntersectableSchema>>(...members: EnsureTupleURIS<M>): IntersectS<M> {
  return new IntersectS(members as M)
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

type EnsureTag<T extends string, M extends Record<string, AnyS>> = EnforceNonEmptyRecord<M> &
  {
    [K in keyof M]: Schema<any, any, any, { [tag in T]: K }, any, any, { [tag in T]: K }, any>
  }

interface SumApi<T extends string, M extends Record<string, AnyS>> {
  readonly tag: T
  readonly members: M
}
function sumApi<T extends string, M extends Record<string, AnyS>>(tag: T, members: M): SumApi<T, M> {
  return { tag, members }
}

export class SumS<T extends string, M extends Record<string, AnyUS>> extends Schema<
  URISIn<M[keyof M]>,
  unknown,
  PE.CompoundE<PE.UnknownRecordLE | PE.TagLE | PE.SumE<{ [K in keyof M]: PE.MemberE<K, ErrorOf<M[K]>> }[keyof M]>>,
  TypeOf<M[keyof M]>,
  CInputOf<M[keyof M]>,
  PE.SumE<{ [K in keyof M]: PE.MemberE<K, CErrorOf<M[K]>> }[keyof M]>,
  OutputOf<M[keyof M]>,
  SumApi<T, M>
> {
  readonly _tag = 'Sum'

  get api() {
    return sumApi(this.tag, this.members)
  }

  constructor(readonly tag: T, readonly members: M) {
    super()
  }

  clone(): SumS<T, M> {
    return new SumS(this.tag, this.members)
  }
}

export function sum<T extends string>(tag: T) {
  return <M extends Record<string, AnyUS>>(members: EnsureStructURIS<EnsureTag<T, M>>): SumS<T, M> =>
    new SumS(tag, members as M)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MapOutput
 * -------------------------------------------------------------------------------------------------
 */

export class MapOutputS<S extends AnyS, O> extends Schema<
  URISIn<S>,
  InputOf<S>,
  CInputOf<S>,
  ErrorOf<S>,
  CErrorOf<S>,
  TypeOf<S>,
  O,
  ApiOf<S>
> {
  readonly _tag = 'MapOutput'

  readonly api = this.fa.api

  constructor(readonly fa: S, readonly f: (o: OutputOf<S>) => O) {
    super()
  }

  clone(): MapOutputS<S, O> {
    return new MapOutputS(this.fa, this.f)
  }
}

export function mapOutput_<S extends AnyS, O>(fa: S, f: (o: OutputOf<S>) => O): MapOutputS<S, O> {
  return new MapOutputS(fa, f)
}

export function mapOutput<S extends AnyS, O>(f: (o: OutputOf<S>) => O): (fa: S) => MapOutputS<S, O> {
  return (fa) => mapOutput_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MapParserError
 * -------------------------------------------------------------------------------------------------
 */

export class MapDecoderErrorS<S extends AnyS, E>
  extends Schema<URISIn<S>, InputOf<S>, CInputOf<S>, E, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'MapDecoderError'

  constructor(readonly fa: S, readonly mapError: (e: ErrorOf<S>) => E) {
    super()
  }

  get api() {
    return this.fa.api
  }

  readonly [SchemaContinuation] = this.fa

  clone(): MapDecoderErrorS<S, E> {
    return new MapDecoderErrorS(this.fa, this.mapError)
  }
}

export function mapDecoderError_<S extends AnyS, E>(fa: S, f: (e: ErrorOf<S>) => E): MapDecoderErrorS<S, E> {
  return new MapDecoderErrorS(fa, f)
}

export function mapDecoderError<S extends AnyS, E>(f: (e: ErrorOf<S>) => E): (fa: S) => MapDecoderErrorS<S, E> {
  return (fa) => mapDecoderError_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MapConstructorError
 * -------------------------------------------------------------------------------------------------
 */

export class MapConstructorErrorS<S extends AnyS, E>
  extends Schema<URISIn<S>, InputOf<S>, CInputOf<S>, ErrorOf<S>, E, TypeOf<S>, OutputOf<S>, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'MapConstructorError'

  constructor(readonly fa: S, readonly mapError: (e: CErrorOf<S>) => E) {
    super()
  }

  readonly [SchemaContinuation] = this.fa

  get api() {
    return this.fa.api
  }

  clone() {
    return new MapConstructorErrorS(this.fa, this.mapError)
  }
}

export function mapConstructorError_<S extends AnyS, E>(fa: S, f: (e: CErrorOf<S>) => E): MapConstructorErrorS<S, E> {
  return new MapConstructorErrorS(fa, f)
}

export function mapConstructorError<S extends AnyS, E>(
  f: (e: CErrorOf<S>) => E
): (fa: S) => MapConstructorErrorS<S, E> {
  return (fa) => new MapConstructorErrorS(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compose / Pipe
 * -------------------------------------------------------------------------------------------------
 */

interface PipeApi<From extends AnyS, To extends AnyS> {
  readonly from: From
  readonly to: To
}
function pipeApi<From extends AnyS, To extends AnyS>(from: From, to: To): PipeApi<From, To> {
  return { from, to }
}

export class PipeS<Prev extends AnyS, Next extends AnyS>
  extends Schema<
    URISIn<Prev>,
    InputOf<Prev>,
    CInputOf<Next>,
    ComposeE<ErrorOf<Prev>, ErrorOf<Next>>,
    CErrorOf<Next>,
    TypeOf<Next>,
    OutputOf<Next>,
    PipeApi<Prev, Next>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Pipe'

  constructor(readonly prev: Prev, readonly next: Next) {
    super()
  }

  get api() {
    return pipeApi(this.prev, this.next)
  }

  readonly [SchemaContinuation] = this.next

  clone(): PipeS<Prev, Next> {
    return new PipeS(this.prev, this.next)
  }
}

export function compose_<
  From extends AnyS,
  To extends Schema<URISIn<From>, TypeOf<From>, any, any, any, any, any, any>
>(from: From, to: To): PipeS<From, To>
export function compose_<U extends URIS, I, CI, E, CE, A, O, Y, CI1, E1, CE1, B, O1, Y1>(
  from: Schema<U, I, CI, E, CE, A, O, Y>,
  to: Schema<U, A, CI1, E1, CE1, B, O1, Y1>
): PipeS<typeof from, typeof to>
export function compose_<
  From extends AnyS,
  To extends Schema<URISIn<From>, TypeOf<From>, any, any, any, any, any, any>
>(from: From, to: To): PipeS<From, To> {
  return new PipeS(from, to)
}

export function compose<U extends URIS, U1 extends U, A, CI1, E1, CE1, A1, O1, Y1>(
  to: Schema<U1, A, CI1, E1, CE1, A1, O1, Y1>
): <I, E, O, CI, CE, Y>(from: Schema<U, I, CI, E, CE, A, O, Y>) => PipeS<typeof from, typeof to>
export function compose<From extends AnyS, To extends Schema<URISIn<From>, TypeOf<From>, any, any, any, any, any, any>>(
  to: To
): (from: From) => PipeS<From, To>
export function compose<From extends AnyS, To extends Schema<URISIn<From>, TypeOf<From>, any, any, any, any, any, any>>(
  to: To
): (from: From) => PipeS<From, To> {
  return (from) => compose_(from, to)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Decoder
 * -------------------------------------------------------------------------------------------------
 */

export class DecoderS<S extends AnyS, I, E>
  extends Schema<URISIn<S> | DecoderSURI, I, CInputOf<S>, E, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'Decoder'

  readonly api = this.schema.api

  constructor(readonly schema: S, readonly parser: Parser<I, E, TypeOf<S>>) {
    super()
  }

  readonly [SchemaContinuation] = this.schema

  clone(): DecoderS<S, I, E> {
    return new DecoderS(this.schema, this.parser)
  }
}

export function decoder_<S extends AnyS, I, E>(
  sa: S,
  decoder: Parser<I, E, TypeOf<S>>
): Schema<URISIn<S> | DecoderSURI, I, CInputOf<S>, E, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new DecoderS(sa, decoder)
}

export function decoder<Type, I, E>(
  decoder: Parser<I, E, Type>
): <U extends URIS, In, Err, CIn, CErr, Out, Api>(
  sa: Schema<U, In, CIn, Err, CErr, Type, Out, Api>
) => Schema<U | DecoderSURI, I, CIn, E, CErr, Type, Out, Api> {
  return (sa) => decoder_(sa, decoder)
}

export function decode_<S extends AnyS, I, E>(
  sa: S,
  parse: (i: I) => These<E, TypeOf<S>>
): Schema<URISIn<S> | DecoderSURI, I, CInputOf<S>, E, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new DecoderS(sa, { parse, label: '<anonymous>' })
}

export function decode<S extends AnyS, I, E>(
  decoder: (i: I) => These<E, TypeOf<S>>
): (sa: S) => Schema<URISIn<S> | DecoderSURI, I, CInputOf<S>, E, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => decode_(sa, decoder)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Encoder
 * -------------------------------------------------------------------------------------------------
 */

export class EncoderS<S extends AnyS, O>
  extends Schema<URISIn<S> | EncoderSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, O, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'Encoder'

  readonly api = this.schema.api

  constructor(readonly schema: S, readonly encoder: Encoder<TypeOf<S>, O>) {
    super()
  }

  readonly [SchemaContinuation] = this.schema

  clone(): EncoderS<S, O> {
    return new EncoderS(this.schema, this.encoder)
  }
}

export function encoder_<S extends AnyS, O>(
  sa: S,
  encoder: Encoder<TypeOf<S>, O>
): Schema<URISIn<S> | EncoderSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, O, ApiOf<S>> {
  return new EncoderS(sa, encoder)
}

export function encoder<Type, O>(
  encoder: Encoder<Type, O>
): <U extends URIS, In, CIn, Err, CErr, Out, Api>(
  sa: Schema<U, In, CIn, Err, CErr, Type, Out, Api>
) => Schema<U | EncoderSURI, In, CIn, Err, CErr, Type, O, Api> {
  return (sa) => encoder_(sa, encoder)
}

export function encode_<S extends AnyS, O>(
  sa: S,
  encode: (a: TypeOf<S>) => O
): Schema<URISIn<S> | EncoderSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, O, ApiOf<S>> {
  return new EncoderS(sa, { encode })
}

export function encode<Type, O>(
  encode: (a: Type) => O
): <U extends URIS, In, CIn, Err, CErr, Out, Api>(
  sa: Schema<U, In, CIn, Err, CErr, Type, Out, Api>
) => Schema<U | EncoderSURI, In, CIn, Err, CErr, Type, O, Api> {
  return (sa) => encode_(sa, encode)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guard
 * -------------------------------------------------------------------------------------------------
 */

export class GuardS<S extends AnyS>
  extends Schema<
    URISIn<S> | GuardSURI,
    InputOf<S>,
    CInputOf<S>,
    ErrorOf<S>,
    CErrorOf<S>,
    TypeOf<S>,
    OutputOf<S>,
    ApiOf<S>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Guard'

  constructor(readonly schema: S, readonly guard: Guard<TypeOf<S>>) {
    super()
  }

  get api() {
    return this.schema.api
  }

  readonly [SchemaContinuation] = this.schema

  clone() {
    return new GuardS(this.schema, this.guard)
  }
}

export function guard_<S extends AnyS>(
  sa: S,
  guard: Guard<TypeOf<S>>
): Schema<URISIn<S> | GuardSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new GuardS(sa, guard)
}

export function guard<S extends AnyS>(
  guard: Guard<TypeOf<S>>
): (
  sa: S
) => Schema<URISIn<S> | GuardSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => guard_(sa, guard)
}

export function is_<S extends AnyS>(
  sa: S,
  is: (u: unknown) => u is TypeOf<S>
): Schema<URISIn<S> | GuardSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new GuardS(sa, { is })
}

export function is<S extends AnyS>(
  is: (u: unknown) => u is TypeOf<S>
): (
  sa: S
) => Schema<URISIn<S> | GuardSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => is_(sa, is)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

export class GenS<S extends AnyS>
  extends Schema<
    URISIn<S> | GenSURI,
    InputOf<S>,
    CInputOf<S>,
    ErrorOf<S>,
    CErrorOf<S>,
    TypeOf<S>,
    OutputOf<S>,
    ApiOf<S>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Gen'

  constructor(readonly schema: S, readonly gen: Gen<TypeOf<S>>) {
    super()
  }

  get api() {
    return this.schema.api
  }
  readonly [SchemaContinuation] = this.schema

  clone(): GenS<S> {
    return new GenS(this.schema, this.gen)
  }
}

export function gen_<S extends AnyS>(
  sa: S,
  gen: Gen<TypeOf<S>>
): Schema<URISIn<S> | GenSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new GenS(sa, gen)
}

export function gen<S extends AnyS>(
  gen: Gen<TypeOf<S>>
): (
  sa: S
) => Schema<URISIn<S> | GenSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => gen_(sa, gen)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export class EqS<S extends AnyS>
  extends Schema<URISIn<S> | EqSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'Eq'

  constructor(readonly schema: S, readonly eq: Eq<TypeOf<S>>) {
    super()
  }

  get api() {
    return this.schema.api
  }

  readonly [SchemaContinuation] = this.schema

  clone() {
    return new EqS(this.schema, this.eq)
  }
}

export function eq_<S extends AnyS>(
  sa: S,
  eq: Eq<TypeOf<S>>
): Schema<URISIn<S> | EqSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new EqS(sa, eq)
}

export function eq<S extends AnyS>(
  eq: Eq<TypeOf<S>>
): (
  sa: S
) => Schema<URISIn<S> | EqSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => eq_(sa, eq)
}

export function equals_<S extends AnyS>(
  sa: S,
  equals: (x: TypeOf<S>, y: TypeOf<S>) => boolean
): Schema<URISIn<S> | EqSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new EqS(sa, Eq(equals))
}

export function equals<S extends AnyS>(
  equals: (x: TypeOf<S>, y: TypeOf<S>) => boolean
): (
  sa: S
) => Schema<URISIn<S> | EqSURI, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => equals_(sa, equals)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructor
 * -------------------------------------------------------------------------------------------------
 */

export class ConstructorS<S extends AnyS, CI, CE>
  extends Schema<URISIn<S> | ConstructorSURI, InputOf<S>, CI, ErrorOf<S>, CE, TypeOf<S>, OutputOf<S>, ApiOf<S>>
  implements HasSchemaContinuation {
  readonly _tag = 'Constructor'

  constructor(readonly schema: S, readonly ctor: Constructor<CI, CE, TypeOf<S>>) {
    super()
  }

  get api() {
    return this.schema.api
  }

  readonly [SchemaContinuation] = this.schema

  clone() {
    return new ConstructorS(this.schema, this.ctor)
  }
}

export function constructor_<S extends AnyS, CI, CE>(
  sa: S,
  ctor: Constructor<CI, CE, TypeOf<S>>
): Schema<URISIn<S> | ConstructorSURI, InputOf<S>, CI, ErrorOf<S>, CE, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new ConstructorS(sa, ctor)
}

export function constructor<Type, CI, CE>(
  ctor: Parser<CI, CE, Type>
): <U extends URIS, In, CIn, Err, CErr, Out, Api>(
  sa: Schema<U, In, CIn, Err, CErr, Type, Out, Api>
) => Schema<U | ConstructorSURI, In, CI, Err, CE, Type, Out, Api> {
  return (sa) => constructor_(sa, ctor)
}

export function create_<S extends AnyS, CI, CE>(
  sa: S,
  parse: (i: CI) => These<CE, TypeOf<S>>
): Schema<URISIn<S> | ConstructorSURI, InputOf<S>, CI, ErrorOf<S>, CE, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return new ConstructorS(sa, { parse, label: '<anonymous>' })
}

export function create<S extends AnyS, CI, CE>(
  parse: (i: CI) => These<CE, TypeOf<S>>
): (sa: S) => Schema<URISIn<S> | ConstructorSURI, InputOf<S>, CI, ErrorOf<S>, CE, TypeOf<S>, OutputOf<S>, ApiOf<S>> {
  return (sa) => create_(sa, parse)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MapApi
 * -------------------------------------------------------------------------------------------------
 */

export class MapApiS<S extends AnyS, Api>
  extends Schema<URISIn<S>, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, Api>
  implements HasSchemaContinuation {
  readonly _tag = 'MapApi'

  constructor(readonly schema: S, readonly f: (_: ApiOf<S>) => Api) {
    super()
  }

  get api() {
    return this.f(this.schema.api)
  }

  readonly [SchemaContinuation] = this.schema

  clone() {
    return new MapApiS(this.schema, this.f)
  }
}

export function mapApi_<S extends AnyS, Y>(
  sa: S,
  f: (api: ApiOf<S>) => Y
): Schema<URISIn<S>, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, Y> {
  return new MapApiS(sa, f)
}

export function mapApi<Api, Y>(
  f: (api: Api) => Y
): <U extends URIS, In, CIn, Err, CErr, Type, Out>(
  sa: Schema<U, In, CIn, Err, CErr, Type, Out, Api>
) => Schema<U, In, CIn, Err, CErr, Type, Out, Y> {
  return (sa) => mapApi_(sa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Named
 * -------------------------------------------------------------------------------------------------
 */

export class NamedS<S extends AnyS, Name extends string>
  extends Schema<
    URISIn<S>,
    InputOf<S>,
    CInputOf<S>,
    PE.NamedE<Name, ErrorOf<S>>,
    PE.NamedE<Name, CErrorOf<S>>,
    TypeOf<S>,
    OutputOf<S>,
    ApiOf<S>
  >
  implements HasSchemaContinuation {
  readonly _tag = 'Named'

  constructor(readonly schema: S, readonly name: Name) {
    super()
  }

  get api() {
    return this.schema.api
  }

  readonly [SchemaContinuation] = this.schema

  clone() {
    return new NamedS(this.schema, this.name)
  }
}

export function named_<S extends AnyS, Name extends string>(schema: S, name: Name): NamedS<S, Name> {
  return new NamedS(schema, name)
}

export function named<Name extends string>(name: Name): <S extends AnyS>(schema: S) => NamedS<S, Name> {
  return (schema) => new NamedS(schema, name)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Lazy
 * -------------------------------------------------------------------------------------------------
 */

export class LazyS<S extends AnyS>
  extends Schema<URISIn<S>, InputOf<S>, CInputOf<S>, ErrorOf<S>, CErrorOf<S>, TypeOf<S>, OutputOf<S>, {}>
  implements HasSchemaContinuation {
  readonly _tag = 'Lazy'

  readonly api = {}

  constructor(readonly schema: () => S, readonly id: string) {
    super()
  }

  get lazy(): S {
    return this.schema()
  }

  get [SchemaContinuation](): AnyS {
    return this.lazy
  }

  clone() {
    return new LazyS(this.schema, this.id)
  }
}

export function lazy<S extends AnyS>(schema: () => S, id: string): LazyS<S> {
  return new LazyS(schema, id)
}

/*
 * -------------------------------------------
 * util
 * -------------------------------------------
 */

export function annotate_<S extends AnyS, V>(sa: S, key: SchemaAnnotation<V>, value: V): S {
  return sa.annotate(key, value)
}

export function annotate<V>(key: SchemaAnnotation<V>, value: V): <S extends AnyS>(sa: S) => S {
  return (sa) => sa.annotate(key, value)
}

export function getAnnotation_<S extends AnyS, V>(sa: S, key: SchemaAnnotation<V>): V {
  return sa.getAnnotation(key)
}

export function getAnnotation<V>(key: SchemaAnnotation<V>): <S extends AnyS>(sa: S) => V {
  return (sa) => getAnnotation_(sa, key)
}
