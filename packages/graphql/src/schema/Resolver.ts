import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Stream } from '@principia/base/Stream'
import type * as U from '@principia/base/util/types'
import type * as Q from '@principia/query/Query'
import type { GraphQLResolveInfo } from 'graphql'
import type { ConnectionContext } from 'subscriptions-transport-ws'

export interface ResolverParameters<Root, Args, Ctx> {
  readonly args: Args
  readonly ctx: Ctx
  readonly root: Root
  readonly info: GraphQLResolveInfo
}

export interface SubscriptionResolverParameters<Root, Ctx> {
  readonly ctx: Ctx
  readonly result: Root
}

export type Effect<Root, Args, Ctx, R, E, A> = (_: ResolverParameters<Root, Args, Ctx>) => I.IO<R & Has<Ctx>, E, A>

export type Query<Root, Args, Ctx, R, E, A> = (_: ResolverParameters<Root, Args, Ctx>) => Q.Query<R & Has<Ctx>, E, A>

export interface Subscription<Root, Args, SR, SE, SA, RR, RE, RA> {
  readonly subscribe: (_: ResolverParameters<Root, Args, ConnectionContext>) => Stream<SR, SE, SA>
  readonly resolve: (_: SubscriptionResolverParameters<SA, ConnectionContext>) => I.IO<RR, RE, RA>
}

export type Resolver<Root, Args, Ctx, R, E, A> = Effect<Root, Args, Ctx, R, E, A> | Query<Root, Args, Ctx, R, E, A>
export type AnyResolver = Effect<any, any, any, any, any, any> | Query<any, any, any, any, any, any>

export type TypeResolver<Ctx, A> = (_: { obj: A, ctx: Ctx, info: GraphQLResolveInfo }) => string | null

export type FieldResolvers<Ctx> = Record<
  string,
  Resolver<any, any, Ctx, any, any, any> | Subscription<any, any, any, any, any, any, any, any>
>

export type SchemaResolvers<Ctx> = Record<string, FieldResolvers<Ctx>>

export type SchemaResolversEnv<Res, Ctx> = Res extends SchemaResolvers<Ctx>
  ? FieldResolversEnv<U.UnionToIntersection<Res[keyof Res]>, Ctx>
  : never

export type FieldResolversEnv<Res, Ctx> = Res extends FieldResolvers<Ctx>
  ? U.UnionToIntersection<
      {
        [k in keyof Res]: Res[k] extends Resolver<any, any, Ctx, infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : Res[k] extends Subscription<any, any, infer RS, any, any, infer RR, any, any>
          ? unknown extends RS
            ? unknown extends RR
              ? never
              : RR
            : unknown extends RR
            ? RS
            : RS & RR
          : never
      }[keyof Res]
    >
  : never

export type TypeOf<Res> = Res extends Resolver<any, any, any, any, any, infer A> ? A : never
export type ErrorOf<Res> = Res extends Resolver<any, any, any, any, infer E, any> ? E : never
export type EnvOf<Res> = Res extends Resolver<any, any, any, infer R, any, any> ? R : never
