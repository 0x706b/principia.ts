import type { EvaluateConfig, InputTypeConfig, OutputTypeConfig } from './config'
import type { Resolver, Subscription } from './Resolver'
import type { AnyField, GQLInputObject, GQLObject, GQLScalar, GQLUnion, InputRecord } from './types'
import type { _Root, TypeofInputRecord } from './util'
import type { Integer } from '@principia/base/Integer'
import type { _A, _E, _R } from '@principia/base/util/types'

import { memoize } from '@principia/base/function'

import { GQLField, GQLInputField, GQLObjectField, GQLScalarField, GQLSubscriptionField, GQLUnionField } from './types'

export const GqlFieldURI = 'graphql/algebra/field'
export type GqlFieldURI = typeof GqlFieldURI

export const GqlInputURI = 'graphql/algebra/input'
export type GqlInputURI = typeof GqlInputURI

declare module './HKT' {
  interface AURItoFieldAlgebra<Root, Ctx> {
    readonly [GqlFieldURI]: GQLFieldAlgebra<Root, Ctx>
  }
  interface AURItoInputAlgebra {
    readonly [GqlInputURI]: GQLInputAlgebra
  }
}

export interface GQLFieldAlgebra<Root, Ctx> {
  readonly boolean: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, boolean>>
  readonly field: <F extends AnyField<Ctx>, Args extends InputRecord, R, E>(def: {
    type: F
    resolve: Resolver<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<F>>
    args?: Args
  }) => GQLField<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<F>>
  readonly float: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly id: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly int: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, Integer>>
  readonly string: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, string>>
  readonly union: <U extends GQLUnion<any, any, Ctx, any>, C extends OutputTypeConfig>(
    type: () => U,
    config?: C
  ) => GQLUnionField<Ctx, EvaluateConfig<C, _A<U>>>
  readonly object: <O extends GQLObject<any, any, Ctx, any, any, any>, C extends OutputTypeConfig>(
    type: () => O,
    config?: C
  ) => GQLObjectField<_Root<O>, Ctx, _R<O>, _E<O>, EvaluateConfig<C, _A<O>>>
  readonly scalar: <S extends GQLScalar<any, any, any, any>, C extends OutputTypeConfig>(
    scalar: () => S,
    config?: C
  ) => GQLScalarField<EvaluateConfig<C, _A<S>>>
}

export interface GQLInputAlgebra {
  readonly booleanArg: <C extends InputTypeConfig<EvaluateConfig<C, boolean>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, boolean>>
  readonly floatArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, number>>
  readonly idArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, string>>
  readonly intArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, number>>
  readonly objectArg: <X extends GQLInputObject<any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    type: () => X,
    config?: C
  ) => GQLInputField<EvaluateConfig<C, _A<X>>>
  readonly stringArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, string>>
  readonly scalarArg: <X extends GQLScalar<any, any, any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    scalar: () => X,
    config?: C
  ) => GQLInputField<EvaluateConfig<C, _A<X>>>
}

export interface GQLSubscriptionAlgebra<Ctx> {
  readonly subscription: <F extends AnyField<Ctx>, Args extends InputRecord, SR, SE, SA, RR, RE>(def: {
    type: F
    resolve: Subscription<{}, TypeofInputRecord<Args>, SR, SE, SA, RR, RE, _A<F>>
    args?: Args
  }) => GQLSubscriptionField<SR & RR, _A<F>>
}

export const GqlSubscriptionInterpreter = memoize<void, GQLSubscriptionAlgebra<any>>(() => ({
  subscription: ({ args, type, resolve }) => new GQLSubscriptionField(type, args, resolve)
}))

export const GQLFieldInterpreter = memoize<void, GQLFieldAlgebra<any, any>>(
  (): GQLFieldAlgebra<any, any> => ({
    boolean: (config) => new GQLScalarField('Boolean', config),
    field: ({ args, resolve, type }) => new GQLField(type, args, resolve),
    union: (type, config) => new GQLUnionField(type().name, config),
    float: (config) => new GQLScalarField('Float', config),
    id: (config) => new GQLScalarField('ID', config),
    int: (config) => new GQLScalarField('Int', config),
    string: (config) => new GQLScalarField('String', config),
    object: (type, config) => new GQLObjectField(type().name, config),
    scalar: (scalar, config) => new GQLScalarField(scalar().name, config)
  })
)

export const GQLInputInterpreter = memoize<void, GQLInputAlgebra>(
  (): GQLInputAlgebra => ({
    booleanArg: (config) => new GQLInputField('Boolean', config),
    floatArg: (config) => new GQLInputField('Float', config),
    idArg: (config) => new GQLInputField('ID', config),
    intArg: (config) => new GQLInputField('Int', config),
    objectArg: (type, config) => new GQLInputField(type().name, config),
    stringArg: (config) => new GQLInputField('String', config),
    scalarArg: (scalar, config) => new GQLInputField(scalar().name, config)
  })
)

export const DefaultGQLInterpreters = {
  ...GQLFieldInterpreter(),
  ...GQLInputInterpreter(),
  ...GqlSubscriptionInterpreter()
}
