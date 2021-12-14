import type {
  AURItoFieldAlgebra,
  AURItoInputAlgebra,
  ExtendObjectTypeBuilder,
  FieldAURIS,
  GQLSubscriptionAlgebra,
  InputAURIS,
  InputObjectTypeBuilder,
  InterfaceTypeBuilder,
  MutationTypeBuilder,
  ObjectTypeBuilder,
  QueryTypeBuilder,
  ScalarTypeBuilder,
  ScalarTypeFromModelBuilder,
  SchemaGenerator,
  SchemaParts,
  SubscriptionTypeBuilder,
  UnionTypeBuilder
} from '../schema'
import type { Has } from '@principia/base/Has'
import type { HttpConnection } from '@principia/http/HttpConnection'
import type { Config } from 'apollo-server-core'
import type { IResolvers } from 'graphql-tools'
import type { DefaultState } from 'koa'
import type { ConnectionContext } from 'subscriptions-transport-ws'
import type WebSocket from 'ws'

import { identity, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import { HttpConnectionTag } from '@principia/http/HttpConnection'
import * as Koa from '@principia/koa'
import { ApolloServer } from 'apollo-server-koa'
import { formatError } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import {
  Context,
  makeExtendObjectTypeBuilder,
  makeInputObjectTypeBuilder,
  makeInterfaceTypeBuilder,
  makeMutationTypeBuilder,
  makeObjectTypeBuilder,
  makeQueryTypeBuilder,
  makeScalarTypeBuilder,
  makeScalarTypeFromModelBuilder,
  makeSchemaGenerator,
  makeSubscriptionTypeBuilder,
  makeUnionTypeBuilder
} from '../schema'
import { formatGraphQlException, GQLException } from '../schema/GQLException'
import { transformResolvers, transformScalarResolvers } from './transform'

export type GraphQlConfig = Omit<Config, 'context' | 'schema' | 'subscriptions'> & {
  subscriptions?: Partial<{
    keepAlive?: number
    onConnect?: (connectionParams: unknown, websocket: WebSocket, context: ConnectionContext) => I.IO<any, never, any>
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => I.IO<any, never, any>
    path: string
  }>
}

export type SubscriptionsEnv<C extends GraphQlConfig> = C extends {
  subscriptions?: Partial<{
    keepAlive?: number
    onConnect?: (
      connectionParams: unknown,
      websocket: WebSocket,
      context: ConnectionContext
    ) => I.IO<infer R, never, any>
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => I.IO<infer R1, never, any>
    path: string
  }>
}
  ? (R extends never ? unknown : R) & (R1 extends never ? unknown : R1)
  : unknown

export interface GraphQlInstanceConfig<Ctx, R> {
  readonly additionalResolvers?: IResolvers
  readonly schemaParts: SchemaParts<Ctx, R>
}

export interface GraphQlDriver<
  FieldAURI extends FieldAURIS,
  InputAURI extends InputAURIS,
  Ctx,
  C extends GraphQlConfig,
  RE
> {
  readonly askContext: I.URIO<Has<HttpConnection>, HttpConnection>
  readonly extend: ExtendObjectTypeBuilder<FieldAURI, InputAURI, Koa.Context<DefaultState, Ctx>>
  readonly generateSchema: SchemaGenerator<Koa.Context<DefaultState, Ctx>>
  readonly input: InputObjectTypeBuilder<InputAURI>
  readonly object: <Root>() => ObjectTypeBuilder<FieldAURI, InputAURI, Root, Koa.Context<DefaultState, Ctx>>
  readonly scalar: ScalarTypeBuilder
  readonly scalarFromModel: ScalarTypeFromModelBuilder
  readonly subscription: SubscriptionTypeBuilder<FieldAURI, InputAURI, Koa.Context<DefaultState, Ctx>>
  readonly query: QueryTypeBuilder<FieldAURI, InputAURI, Koa.Context<DefaultState, Ctx>>
  readonly mutation: MutationTypeBuilder<FieldAURI, InputAURI, Koa.Context<DefaultState, Ctx>>
  readonly union: UnionTypeBuilder<Koa.Context<DefaultState, Ctx>>
  readonly interface: InterfaceTypeBuilder<FieldAURI, InputAURI, Koa.Context<DefaultState, Ctx>>
  readonly live: <R>(
    config: GraphQlInstanceConfig<Koa.Context<DefaultState, Ctx>, R>
  ) => L.Layer<R & SubscriptionsEnv<C> & RE & Has<Koa.KoaApp>, never, Has<GraphQlInstance>>
}

export interface GraphQlInstance {
  readonly server: ApolloServer
}
export const GraphQlInstance = tag<GraphQlInstance>()

type KoaContextFn<Conf extends GraphQlConfig, RE, Ctx> = (_: {
  connection?: Conf['subscriptions'] extends {
    onConnect: (...args: any[]) => I.IO<any, never, infer A>
  }
    ? Omit<Koa.Context['connection'], 'context'> & {
        context: A
      }
    : Koa.Context['connection']
  ctx: Koa.Context
}) => I.IO<RE, never, Koa.Context<DefaultState, Ctx>>

export function makeGraphQl<FieldPURI extends FieldAURIS, InputPURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldPURI] & AURItoInputAlgebra[InputPURI] & GQLSubscriptionAlgebra<any>
) {
  return <Ctx, C extends GraphQlConfig, RE>(
    config: C,
    context: KoaContextFn<C, RE, Ctx>
  ): GraphQlDriver<FieldPURI, InputPURI, Ctx, C, RE> => {
    const askContext: I.URIO<Has<HttpConnection>, HttpConnection> = I.accessService(HttpConnectionTag)(identity) as any

    const gqlKoaInstance = <R>(instanceConfig: GraphQlInstanceConfig<Koa.Context<DefaultState, Ctx>, R>) => {
      const acquire = I.gen(function* (_) {
        const env = yield* _(I.environment<R & SubscriptionsEnv<C> & RE>())

        const [app, httpServer] = yield* _(I.accessService(Koa.KoaAppTag)((koa) => [koa.app, koa.server] as const))

        const scalars       = transformScalarResolvers(instanceConfig.schemaParts.scalars ?? {}, env)
        const resolvers     = transformResolvers<Koa.Context<DefaultState, Ctx>>(instanceConfig.schemaParts.resolvers, env)
        const typeResolvers = instanceConfig.schemaParts.typeResolvers
        const apolloConfig  = { ...config } as Omit<Config, 'context' | 'schema'>
        if (config.subscriptions && config.subscriptions.onConnect) {
          const onConnect    = config.subscriptions.onConnect
          const onDisconnect = config.subscriptions.onDisconnect

          apolloConfig.subscriptions = {
            keepAlive: config.subscriptions.keepAlive,
            onConnect: (connectionParams, websocket, context) =>
              pipe(onConnect(connectionParams, websocket, context), I.provide(env), I.runPromise),
            onDisconnect: onDisconnect
              ? (websocket, context) => pipe(onDisconnect(websocket, context), I.provide(env), I.runPromise)
              : undefined,
            path: config.subscriptions.path
          }
        }

        const schema = yield* _(
          pipe(
            I.try(() =>
              makeExecutableSchema({
                resolvers: {
                  ...resolvers,
                  ...typeResolvers,
                  ...(instanceConfig.additionalResolvers ?? {}),
                  ...scalars
                },
                typeDefs: instanceConfig.schemaParts.typeDefs
              })
            ),
            I.orHalt
          )
        )

        return yield* _(
          pipe(
            I.try(() => {
              const server = new ApolloServer({
                context: (ctx) => pipe(context(ctx), I.provide(env), I.runPromise),
                schema,
                ...apolloConfig,
                formatError: (error) => {
                  if (apolloConfig.formatError) {
                    return apolloConfig.formatError(error)
                  }
                  return error.originalError instanceof GQLException
                    ? formatGraphQlException(error as any)
                    : formatError(error)
                }
              })
              server.applyMiddleware({ app: app as any })
              if (apolloConfig.subscriptions) {
                server.installSubscriptionHandlers(httpServer)
              }
              return server
            }),
            I.orHalt
          )
        )
      })

      return L.prepare(GraphQlInstance)(I.map_(acquire, (server) => ({ server }))).release(({ server }) =>
        pipe(I.fromPromiseHalt(server.stop))
      )
    }

    return {
      generateSchema: makeSchemaGenerator<Koa.Context<DefaultState, Ctx>>(),
      askContext: askContext,
      extend: makeExtendObjectTypeBuilder<FieldPURI, InputPURI, Koa.Context<DefaultState, Ctx>>(interpreters),
      input: makeInputObjectTypeBuilder(interpreters),
      live: gqlKoaInstance,
      object: <Root>() => makeObjectTypeBuilder(interpreters)<Root, Koa.Context<DefaultState, Ctx>>(),
      subscription: makeSubscriptionTypeBuilder<FieldPURI, InputPURI>(interpreters)<Koa.Context<DefaultState, Ctx>>(),
      scalar: makeScalarTypeBuilder,
      mutation: makeMutationTypeBuilder<FieldPURI, InputPURI>(interpreters)<Koa.Context<DefaultState, Ctx>>(),
      scalarFromModel: makeScalarTypeFromModelBuilder,
      query: makeQueryTypeBuilder<FieldPURI, InputPURI>(interpreters)<Koa.Context<DefaultState, Ctx>>(),
      union: makeUnionTypeBuilder<Koa.Context<DefaultState, Ctx>>(),
      interface: makeInterfaceTypeBuilder<FieldPURI, InputPURI>(interpreters)<Koa.Context<DefaultState, Ctx>>()
    }
  }
}
