import type { UnnamedFieldDefinitionNode, UnnamedInputValueDefinitionNode } from './AST'
import type { InputTypeConfig, OutputTypeConfig } from './config'
import type { Resolver, Subscription, TypeResolver } from './Resolver'
import type { ScalarFunctions } from './Scalar'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Compute } from '@principia/base/util/compute'
import type { _A, ExcludeMatchingProperties } from '@principia/base/util/types'
import type {
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode
} from 'graphql'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'

import {
  addNameToUnnamedFieldDefinitionNode,
  createInputObjectTypeDefinitionNode,
  createInputValueDefinitionNode,
  createInterfaceTypeDefinitionNode,
  createNamedTypeNode,
  createObjectTypeDefinitionNode,
  createStringValueNode,
  createUnionTypeDefinitionNode,
  createUnnamedFieldDefinitionNode,
  createUnnamedInputValueDefinitionNode,
  getTypeName
} from './AST'

export class GQLField<Root, Args, Ctx, R, E, A> {
  readonly _tag = 'GQLField'

  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly ast: UnnamedFieldDefinitionNode

  constructor(
    readonly type: AnyField<Ctx>,
    readonly args: InputRecord | undefined,
    readonly resolve: Resolver<Root, Args, Ctx, R, E, A>
  ) {
    this.ast = createUnnamedFieldDefinitionNode({
      arguments: args
        ? R.ifoldl_(args, A.empty(), (k, b, a: GQLInputField<any>) => [
            ...b,
            createInputValueDefinitionNode({
              defaultValue: a.config.defaultValue,
              description: a.config.description,
              list: a.config.list,
              name: k,
              nullable: a.config.nullable,
              typeName: getTypeName(a.ast)
            })
          ])
        : [],
      description: type.config.description,
      list: type.config.list,
      nullable: type.config.nullable,
      typeName: getTypeName(type.ast)
    })
  }

  static fromAST<Root, Args, Ctx, R, E, A>(
    ast: UnnamedFieldDefinitionNode,
    resolve: Resolver<Root, Args, Ctx, R, E, A>
  ): GQLField<Root, Args, Ctx, R, E, A> {
    return Object.setPrototypeOf(
      {
        _tag: 'GQLField',
        ast,
        resolve
      },
      GQLField.prototype
    )
  }

  [':'](description: string): GQLField<Root, Args, Ctx, R, E, A> {
    return GQLField.fromAST({ ...this.ast, description: createStringValueNode(description, false) }, this.resolve)
  }
}

export class GQLScalarField<A> {
  readonly _tag = 'GQLScalarField'
  readonly _A!: () => A
  readonly ast: UnnamedFieldDefinitionNode

  constructor(typeName: string, readonly config: OutputTypeConfig = {}) {
    this.ast = createUnnamedFieldDefinitionNode({
      ...config,
      typeName
    })
  }
}

export class GQLObjectField<Root, Ctx, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _Root!: Root
  readonly _Ctx!: Ctx

  readonly _tag = 'GQLObjectField'
  readonly ast: UnnamedFieldDefinitionNode

  constructor(typeName: string, readonly config: OutputTypeConfig = {}) {
    this.ast = createUnnamedFieldDefinitionNode({
      ...config,
      typeName
    })
  }
}

export class GQLObject<N extends string, Root, Ctx, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _Ctx!: Ctx
  readonly _Root!: Root

  readonly _tag = 'GQLObject'

  readonly ast: ObjectTypeDefinitionNode
  readonly resolvers: ReadonlyRecord<string, any>

  constructor(
    readonly name: N,
    readonly fields: { [K in keyof A]: AnyOutput<Ctx> },
    readonly interfaces: ReadonlyArray<GQLInterface<any, any, any, any, any>> = []
  ) {
    this.ast = createObjectTypeDefinitionNode({
      name,
      fields: [
        ...A.chain_(interfaces, (a) => a.ast.fields || []),
        ...R.ifoldl_(fields, [] as ReadonlyArray<FieldDefinitionNode>, (k, b, a: NonNullable<AnyOutput<any>>) =>
          A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
        )
      ],
      interfaces: A.map_(interfaces, (a) => a.name)
    })
    this.resolvers = {
      ...A.foldl_(interfaces || [], {}, (b, a) => ({ ...b, ...a.resolvers })),
      ...R.ifoldl_(fields, {}, (k, b, a: AnyOutput<Ctx>) => {
        if (a._tag === 'GQLField') {
          return { ...b, [k]: a.resolve }
        }
        return b
      })
    }
  }
}

export class GQLUnion<N extends string, Types extends ReadonlyArray<AnyObjectType<Ctx>>, Ctx, A> {
  readonly _A!: () => A
  readonly _E!: () => never
  readonly _R!: (_: unknown) => void

  readonly _Ctx!: Ctx
  readonly _tag = 'GQLUnion'

  readonly ast: UnionTypeDefinitionNode
  constructor(readonly name: N, readonly types: Types, readonly resolveType: TypeResolver<Ctx, _A<Types[number]>>) {
    this.ast = createUnionTypeDefinitionNode({
      name,
      types: A.map_(types, (a) => createNamedTypeNode(a.name))
    })
  }
}

export class GQLUnionField<Ctx, A> {
  readonly _A!: () => A
  readonly _E!: () => never
  readonly _R!: (_: unknown) => void

  readonly _Ctx!: Ctx
  readonly _tag = 'GQLUnionField'

  readonly ast: UnnamedFieldDefinitionNode

  constructor(typeName: string, readonly config: OutputTypeConfig = {}) {
    this.ast = createUnnamedFieldDefinitionNode({
      ...config,
      typeName
    })
  }
}

export class GQLInterface<N extends string, Ctx, R, E, A> {
  readonly _A!: () => A
  readonly _E!: () => E
  readonly _R!: (_: R) => void
  readonly _Ctx!: Ctx

  readonly _tag = 'GQLInterface'
  readonly ast: InterfaceTypeDefinitionNode
  readonly resolvers: ReadonlyRecord<string, any>

  constructor(readonly name: N, readonly fields: ReadonlyRecord<string, any>, readonly resolveType: any) {
    this.ast = createInterfaceTypeDefinitionNode({
      name,
      fields: R.ifoldl_(fields, [] as ReadonlyArray<FieldDefinitionNode>, (k, b, a: NonNullable<AnyOutput<Ctx>>) =>
        A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
      )
    })
    this.resolvers = R.ifoldl_(fields, {}, (k, b, a: AnyOutput<Ctx>) => {
      if (a._tag === 'GQLField') {
        return { ...b, [k]: a.resolve }
      }
      return b
    })
  }
}

export class GQLSubscription<R, A> {
  readonly _R!: (_: R) => void
  readonly _A!: () => A

  readonly _tag = 'GQLSubscription'

  readonly ast: ReadonlyArray<FieldDefinitionNode>
  readonly resolvers: ReadonlyRecord<string, Subscription<any, any, any, any, any, any, any, any>>

  constructor(readonly fields: ReadonlyRecord<string, GQLSubscriptionField<any, any>>) {
    this.ast = R.ifoldl_(
      fields,
      [] as ReadonlyArray<FieldDefinitionNode>,
      (k, b, a: NonNullable<GQLSubscriptionField<any, any>>) =>
        A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
    )
    this.resolvers = R.map_(fields, (f) => f.resolve)
  }
}

export class GQLSubscriptionField<R, A> {
  readonly _A!: () => A
  readonly _R!: (_: R) => void

  readonly _tag = 'GQLSubscriptionField'

  readonly ast: UnnamedFieldDefinitionNode
  constructor(
    type: AnyField<any>,
    args: InputRecord | undefined,
    readonly resolve: Subscription<{}, any, any, any, any, any, any, any>
  ) {
    this.ast = createUnnamedFieldDefinitionNode({
      description: type.config.description,
      list: type.config.list,
      nullable: type.config.nullable,
      typeName: getTypeName(type.ast),
      arguments: args
        ? R.ifoldl_(args, A.empty(), (k, b, a) => [
            ...b,
            createInputValueDefinitionNode({
              defaultValue: a.config.defaultValue,
              description: a.config.description,
              list: a.config.list,
              name: k,
              nullable: a.config.nullable,
              typeName: getTypeName(a.ast)
            })
          ])
        : []
    })
  }
}

export class GQLExtendObject<O extends GQLObject<any, any, any, any, any, any>, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _tag = 'GQLExtendObject'

  readonly ast: ReadonlyArray<FieldDefinitionNode>
  readonly resolvers: ReadonlyRecord<string, any>
  constructor(readonly object: O, readonly fields: Record<string, any>) {
    this.ast = R.ifoldl_(fields as any, A.empty(), (k, acc, v: NonNullable<AnyOutput<any>>) => {
      switch (v._tag) {
        /*
         * case "RecursiveType":
         *   return [
         *     ...acc,
         *     createFieldDefinitionNode({
         *       description: v.config?.description,
         *       list: v.config?.list,
         *       name: k,
         *       nullable: v.config?.nullable,
         *       typeName: v.name
         *     })
         *   ];
         */
        case 'GQLField':
          return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
        case 'GQLScalarField':
          return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
        case 'GQLObjectField':
          return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
        case 'GQLUnionField':
          return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
      }
    })

    this.resolvers = R.ifoldl_(fields as any, {}, (k, acc, v: AnyOutput<any>) => {
      if (v._tag === 'GQLField') {
        return { ...acc, [k]: v.resolve }
      }
      return acc
    })
  }

  get name(): O['name'] {
    return this.object.name
  }
}

export class GQLInputObject<N extends string, A> {
  readonly _A!: () => A
  readonly _E!: () => never
  readonly _R!: (_: unknown) => void

  readonly _tag = 'GQLInputObject'

  readonly ast: InputObjectTypeDefinitionNode

  constructor(readonly name: N, readonly fields: { [K in keyof A]: GQLInputField<A[K]> }) {
    this.ast = createInputObjectTypeDefinitionNode({
      fields: R.ifoldl_(fields, [] as InputValueDefinitionNode[], (k, acc, v) => {
        return [
          ...acc,
          createInputValueDefinitionNode({
            defaultValue: v.config?.defaultValue,
            description: v.config?.description || v.ast.description?.value,
            name: k,
            nullable: v.config.nullable,
            typeName: getTypeName(v.ast)
          })
        ]
      }),
      name
    })
  }
}

export class GQLInputField<A> {
  readonly _A!: () => A

  readonly _tag = 'GQLInputField'

  readonly ast: UnnamedInputValueDefinitionNode

  constructor(typeName: string, readonly config: InputTypeConfig<A> = {}) {
    this.ast = createUnnamedInputValueDefinitionNode({
      ...config,
      typeName
    })
  }
}

export class GQLScalar<N extends string, R, I, O> {
  readonly _A!: () => O
  readonly _R!: (_: R) => void

  readonly _tag = 'GQLScalar'

  constructor(readonly ast: ScalarTypeDefinitionNode, readonly name: N, readonly fns: ScalarFunctions<I, O>) {}
}

export type AnyField<Ctx> = GQLScalarField<any> | GQLObjectField<any, Ctx, any, any, any> | GQLUnionField<Ctx, any>

export type AnyOutput<Ctx> = AnyField<Ctx> | GQLField<any, any, Ctx, any, any, any>

export type InputRecord = Record<string, GQLInputField<any>>

type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T

export type FieldRecord<Root, Ctx, F> = Partial<{
  [K in keyof Root]: Root[K] extends { [x: string]: any }
    ?
        | GQLObjectField<Root[K], Ctx, any, any, { [K1 in keyof Root[K]]: Widen<Root[K][K1]> }>
        | GQLField<Root, any, Ctx, any, any, { [K1 in keyof Root[K]]: Widen<Root[K][K1]> }>
    : Root[K] extends Iterable<any>
    ? GQLScalarField<Widen<Root[K]>> | GQLField<Root, any, Ctx, any, any, Widen<Root[K]>>
    :
        | GQLScalarField<Widen<Root[K]>>
        | GQLField<Root, any, Ctx, any, any, Root[K]>
        | GQLObjectField<Root, Ctx, any, any, Widen<Root[K]>>
        | GQLUnionField<Ctx, any>
}> & {
  [K in Exclude<keyof F, keyof Root>]:
    | GQLField<Root, any, Ctx, any, any, any>
    | GQLScalarField<any>
    | GQLObjectField<Root, Ctx, any, any, any>
    | GQLSubscriptionField<any, any>
    | GQLUnionField<Ctx, any>
}

export type FieldResolverRecord<Fs extends FieldRecord<any, any, Fs>> = Compute<
  ExcludeMatchingProperties<
    {
      [K in keyof Fs]: Fs[K] extends GQLField<infer Root, infer Args, infer T, infer R, infer E, infer A>
        ? Resolver<Root, Args, T, R, E, A>
        : never
    },
    never
  >,
  'flat'
>

export type AnyRootType<T> =
  | GQLInputObject<any, any>
  | GQLObject<any, any, T, any, any, any>
  | GQLExtendObject<any, any, any, any>
  | GQLScalar<any, any, any, any>
  | GQLSubscription<any, any>
  | GQLUnion<any, any, any, any>
  | GQLInterface<any, any, any, any, any>

export type AnyObjectType<T> = GQLObject<any, any, T, any, any, any> | GQLExtendObject<any, any, any, any>
