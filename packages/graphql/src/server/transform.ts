import type { Resolver, ScalarFunctions, Subscription } from '../schema'
import type { GraphQLResolveInfo } from 'graphql'
import type { ConnectionContext } from 'subscriptions-transport-ws'

import { asyncIterable } from '@principia/base/AsyncIterable'
import * as E from '@principia/base/Either'
import * as Ex from '@principia/base/Exit'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Managed'
import * as S from '@principia/base/Stream'
import * as Sy from '@principia/base/Sync'
import { HttpConnectionTag } from '@principia/http/HttpConnection'
import { Described } from '@principia/query/Described'
import * as Q from '@principia/query/Query'
import { GraphQLScalarType } from 'graphql'

const entries = <A>(_: A): ReadonlyArray<[keyof A, A[keyof A]]> => Object.entries(_) as any

export function transformResolvers<Ctx>(
  res: Record<
    string,
    Record<string, Resolver<any, any, Ctx, any, any, any> | Subscription<any, any, any, any, any, any, any, any>>
  >,
  env: any
) {
  const toBind = {}
  for (const [typeName, fields] of entries(res)) {
    const resolvers = {}
    for (const [fieldName, resolver] of entries(fields)) {
      if (typeof resolver === 'function') {
        (resolvers as any)[fieldName] = (root: any, args: any, ctx: any, info: GraphQLResolveInfo) => {
          return I.runPromise(
            I.gen(function* (_) {
              const ret = resolver({
                root,
                args: args || {},
                ctx,
                info
              })
              if (I.isIO(ret)) {
                return yield* _(pipe(ret, I.give(env as any), I.giveService(HttpConnectionTag)(ctx.connection)))
              } else {
                return yield* _(
                  pipe(
                    ret,
                    Q.give(Described({ ...(env as any) }, 'Environment given to GraphQl Service')),
                    Q.giveService(HttpConnectionTag)(Described(ctx.connection, 'Context from the Http Server')),
                    Q.run
                  )
                )
              }
            })
          )
        }
      } else {
        (resolvers as any)[fieldName] = {
          subscribe: (root: {}, args: any, ctx: ConnectionContext, info: GraphQLResolveInfo) =>
            I.runPromise(
              I.gen(function* (_) {
                const result = yield* _(
                  pipe(
                    resolver.subscribe({ root, args: args || {}, ctx, info }),
                    S.toAsyncIterable,
                    M.use(I.succeed),
                    I.give({ ...(env as any) })
                  )
                )

                return asyncIterable(async function* () {
                  for await (const r of result) {
                    switch (r._tag) {
                      case 'Left': {
                        throw r.left
                      }
                      case 'Right': {
                        yield r.right
                      }
                    }
                  }
                })
              })
            ),
          resolve: (r: any, ctx: ConnectionContext) =>
            I.runPromise(
              I.gen(function* (_) {
                const result = yield* _(pipe(resolver.resolve({ result: r, ctx }), I.give({ ...(env as any) })))
                return result
              })
            )
        }
      }
    }
    (toBind as any)[typeName] = resolvers
  }
  return toBind
}

export function transformScalarResolvers(
  scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>,
  env: any
) {
  const toBind = {}
  for (const [typeName, resolver] of entries(scalars)) {
    (toBind as any)[typeName] = new GraphQLScalarType({
      name: resolver.name,
      parseLiteral: (u) =>
        pipe(
          resolver.functions.parseLiteral(u),
          Sy.giveAll(env),
          Sy.runExit,
          Ex.match((e) => {
            throw e
          }, identity)
        ),
      parseValue: (u) =>
        pipe(
          resolver.functions.parseValue(u),
          Sy.giveAll(env),
          Sy.runExit,
          Ex.match((e) => {
            throw e
          }, identity)
        ),
      serialize: (u) =>
        pipe(
          resolver.functions.serialize(u),
          Sy.giveAll(env),
          Sy.runExit,
          Ex.match((e) => {
            throw e
          }, identity)
        )
    })
  }
  return toBind
}
