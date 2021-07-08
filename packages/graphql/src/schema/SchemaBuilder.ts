import type { GQLSubscriptionAlgebra } from './algebra'
import type { AURItoFieldAlgebra, AURItoInputAlgebra, FieldAURIS, InputAURIS } from './HKT'
import type { TypeResolver } from './Resolver'
import type { _I, _O, ParseLiteralF, ScalarConfig, ScalarFunctions } from './Scalar'
import type { AnyObjectType, FieldRecord, InputRecord } from './types'
import type { __A, __E, __R } from './util'
import type { Compute } from '@principia/base/util/compute'
import type { _A, _E, _R, UnionToIntersection } from '@principia/base/util/types'
import type { Schema } from '@principia/schema'
import type { CoreURIS } from '@principia/schema/Modules'
import type { ValueNode } from 'graphql'

import { flow, pipe } from '@principia/base/function'
import * as Sy from '@principia/base/Sync'
import * as Th from '@principia/base/These'
import * as S from '@principia/schema'
import * as Dec from '@principia/schema/Decoder'
import * as Enc from '@principia/schema/Encoder'
import { valueFromASTUntyped } from 'graphql'

import { createScalarTypeDefinitionNode } from './AST'
import { GQLException } from './GQLException'
import { GQLExtendObject, GQLInputObject, GQLInterface, GQLObject, GQLScalar, GQLSubscription, GQLUnion } from './types'

interface ObjectTypeConfig {
  implements?: ReadonlyArray<GQLInterface<any, any, any, any, any>>
}

type BaseQuery = GQLObject<'Query', {}, {}, unknown, never, {}>
export const BaseQuery: BaseQuery = new GQLObject('Query', {})

type BaseMutation = GQLObject<'Mutation', {}, {}, unknown, never, {}>
export const BaseMutation: BaseMutation = new GQLObject('Mutation', {})

type BaseSubscription = GQLObject<'Subscription', {}, {}, unknown, never, {}>
export const BaseSubscription: BaseSubscription = new GQLObject('Subscription', {})

export interface ObjectTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Root, Ctx> {
  <Name extends string, Fields extends FieldRecord<Root, Ctx, Fields>, C extends ObjectTypeConfig>(
    name: Name,
    fields: (t: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields,
    config?: C
  ): GQLObject<Name, Root, Ctx, __R<Fields>, __E<Fields>, Compute<Root & __A<Fields>, 'flat'>>
}

export function makeObjectTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
): <Root, Ctx>() => ObjectTypeBuilder<FieldURI, InputURI, Root, Ctx> {
  return () => (name, fields, config) => new GQLObject(name, fields(interpreters) as any, config?.implements)
}

export interface ExtendObjectTypeBuilder<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T> {
  <Type extends GQLObject<any, any, T, any, any, any>, Fields extends FieldRecord<Type['_Root'], T, Fields>>(
    type: () => Type,
    fields: (t: AURItoFieldAlgebra<Type['_Root'], T>[FieldAURI] & AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLExtendObject<Type, _R<Type> & __R<Fields>, _E<Type> & __E<Fields>, _A<Type> & __A<Fields>>
}

export function makeExtendObjectTypeBuilder<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]
): ExtendObjectTypeBuilder<FieldAURI, InputAURI, T> {
  return (type, fields) => new GQLExtendObject(type(), fields(interpreters))
}

export interface QueryTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (t: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields
  ): GQLExtendObject<BaseQuery, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeQueryTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
) {
  return <Ctx>(): QueryTypeBuilder<FieldURI, InputURI, Ctx> => (fields) =>
    makeExtendObjectTypeBuilder(interpreters)(() => BaseQuery, fields as any)
}

export interface MutationTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (t: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields
  ): GQLExtendObject<BaseMutation, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeMutationTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
): <Ctx>() => MutationTypeBuilder<FieldURI, InputURI, Ctx> {
  return () => (fields) => makeExtendObjectTypeBuilder(interpreters)(() => BaseMutation, fields as any)
}

export interface UnionTypeBuilder<Ctx> {
  <Types extends readonly [AnyObjectType<Ctx>, AnyObjectType<Ctx>, ...ReadonlyArray<AnyObjectType<Ctx>>]>(
    ...types: Types
  ): <N extends string>(
    name: N,
    resolveType: TypeResolver<Ctx, _A<Types[number]>>
  ) => GQLUnion<N, Types, Ctx, _A<Types[number]>>
}

export function makeUnionTypeBuilder<Ctx>(): UnionTypeBuilder<Ctx> {
  return (...types) => (name, resolveType) => new GQLUnion(name, types, resolveType)
}

export interface InterfaceTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <N extends string, Fields extends FieldRecord<{}, Ctx, Fields>>(
    name: N,
    fields: (t: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields,
    resolveType: TypeResolver<Ctx, __A<Fields>>
  ): GQLInterface<N, Ctx, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeInterfaceTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
): <Ctx>() => InterfaceTypeBuilder<FieldURI, InputURI, Ctx> {
  return () => (name, fields, resolveType) => new GQLInterface(name, fields(interpreters), resolveType)
}

export interface SubscriptionTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (
      t: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI] & GQLSubscriptionAlgebra<Ctx>
    ) => Fields
  ): GQLSubscription<__R<Fields>, __A<Fields>>
}

export function makeSubscriptionTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI] & GQLSubscriptionAlgebra<any>
): <Ctx>() => SubscriptionTypeBuilder<FieldURI, InputURI, Ctx> {
  return () => (fields) => new GQLSubscription(fields(interpreters))
}

export interface InputObjectTypeBuilder<InputAURI extends InputAURIS> {
  <Name extends string, Fields extends InputRecord>(
    name: Name,
    fields: (t: AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLInputObject<Name, { [K in keyof Fields]: _A<Fields[K]> }>
}

export function makeInputObjectTypeBuilder<InputAURI extends InputAURIS>(
  interpreters: AURItoInputAlgebra[InputAURI]
): InputObjectTypeBuilder<InputAURI> {
  return (name, fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLInputObject(name, interpretedFields as any)
  }
}

export interface ScalarTypeBuilder {
  <Name extends string, Funcs extends ScalarFunctions<any, any>>(
    name: Name,
    definition: Funcs,
    config?: ScalarConfig
  ): GQLScalar<
    Name,
    UnionToIntersection<
      {
        [K in keyof Funcs]: Funcs[K] extends (...args: any[]) => any
          ? [ReturnType<Funcs[K]>] extends [Sy.Sync<infer R, any, any>]
            ? R
            : unknown
          : unknown
      }[keyof Funcs]
    >,
    _I<Funcs>,
    _O<Funcs>
  >
}

export interface ScalarTypeFromModelBuilder {
  <Name extends string, Config extends ScalarTypeFromModelConfig<O>, O, A>(
    name: Name,
    model: Schema<CoreURIS, unknown, any, A, any, any, O, any>,
    config?: Config
  ): GQLScalar<Name, unknown, O, A>
}

export const makeScalarTypeBuilder: ScalarTypeBuilder = (name, definition, config) =>
  new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    definition
  )

interface ScalarTypeFromModelConfig<E> extends ScalarConfig {
  message?: string
  parseLiteral?: ParseLiteralF<unknown, E>
}

export const makeScalarTypeFromModelBuilder: ScalarTypeFromModelBuilder = (name, model, config) => {
  const { parse }    = S.to(Dec.Schemable)(model)
  const { encode }   = S.to(Enc.Schemable)(model)
  const serialize    = (u: unknown) =>
    pipe(
      parse(u),
      Th.match(
        (errors) =>
          Sy.fail(
            new GQLException(config?.message ?? `Invalid value ${u} provided to Scalar ${name}`, 'INVALID_INPUT', {
              errors
            })
          ),
        Sy.succeed,
        (_, a) => Sy.succeed(a)
      )
    )
  const parseValue   = flow(serialize, Sy.map(encode))
  const parseLiteral = (valueNode: ValueNode) =>
    pipe(
      valueNode,
      valueFromASTUntyped,
      parse,
      Th.match(
        (errors) =>
          Sy.fail(
            new GQLException(
              config?.message ?? `Invalid value ${valueFromASTUntyped(valueNode)} provided to Scalar ${name}`,
              'INVALID_INPUT',
              { errors }
            )
          ),
        flow(encode, Sy.succeed),
        (_, a) => pipe(encode(a), Sy.succeed)
      )
    )
  return new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    {
      parseLiteral: config?.parseLiteral ?? (parseLiteral as any),
      parseValue,
      serialize
    }
  )
}
