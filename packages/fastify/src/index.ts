import type { Has } from '@principia/base/Has'
import type { Cause } from '@principia/base/IO/Cause'
import type {
  FastifyHttp2Options,
  FastifyHttp2SecureOptions,
  FastifyHttpsOptions,
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase
} from 'fastify'
import type { RouteGenericInterface, RouteHandlerMethod, RouteOptions } from 'fastify/types/route'
import type * as http from 'http'
import type * as http2 from 'http2'
import type * as https from 'https'

import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as IO from '@principia/base/IO'
import { defaultPrettyPrint, halted } from '@principia/base/IO/Cause'
import * as Fi from '@principia/base/IO/Fiber'
import * as L from '@principia/base/IO/Layer'
import * as Ma from '@principia/base/IO/Managed'
import * as Supervisor from '@principia/base/IO/Supervisor'
import { AtomicBoolean } from '@principia/base/util/support/AtomicBoolean'
import fastify from 'fastify'

export class NodeServerCloseError {
  readonly _tag = 'NodeServerCloseError'
  constructor(readonly error: Error) {}
}

export class NodeServerListenError {
  readonly _tag = 'NodeServerListenError'
  constructor(readonly error: Error) {}
}

export const FastifyServerConfigTag = '@principia/fastify/FastifyServerConfig'

export interface FastifyHttp2SecureServerConfig extends FastifyHttp2SecureOptions<http2.Http2SecureServer> {
  readonly port: number
  readonly host: string
  readonly exitHandler: (
    request: FastifyRequest<RouteGenericInterface, http2.Http2SecureServer>,
    reply: FastifyReply<http2.Http2SecureServer>
  ) => (cause: Cause<never>) => IO.URIO<unknown, void>
}

export interface FastifyHttp2ServerConfig extends FastifyHttp2Options<http2.Http2Server> {
  readonly port: number
  readonly host: string
  readonly exitHandler: (
    request: FastifyRequest<RouteGenericInterface, http2.Http2Server>,
    reply: FastifyReply<http2.Http2Server>
  ) => (cause: Cause<never>) => IO.URIO<unknown, void>
}

export interface FastifyHttpsServerConfig extends FastifyHttpsOptions<https.Server> {
  readonly port: number
  readonly host: string
  readonly exitHandler: (
    request: FastifyRequest<RouteGenericInterface, https.Server>,
    reply: FastifyReply<https.Server>
  ) => (cause: Cause<never>) => IO.URIO<unknown, void>
}

export interface FastifyHttpServerConfig extends FastifyServerOptions<http.Server> {
  readonly port: number
  readonly host: string
  readonly exitHandler: (
    request: FastifyRequest<RouteGenericInterface, http.Server>,
    reply: FastifyReply<http.Server>
  ) => (cause: Cause<never>) => IO.URIO<unknown, void>
}

export interface FastifyServerConfig extends FastifyServerOptions<RawServerBase> {
  readonly port: number
  readonly host: string
  readonly exitHandler: (
    request: FastifyRequest<RouteGenericInterface, RawServerBase>,
    reply: FastifyReply<RawServerBase>
  ) => (cause: Cause<never>) => IO.URIO<unknown, void>
}

export function defaultExitHandler<Server extends RawServerBase>(
  _req: FastifyRequest<RouteGenericInterface, Server>,
  res: FastifyReply<Server>
): (cause: Cause<never>) => IO.URIO<unknown, void> {
  return (cause) =>
    IO.succeedLazy(() => {
      if (halted(cause)) {
        console.error(defaultPrettyPrint(cause))
      }
      res.status(500).send()
    })
}

export const FastifyHttpServerConfig        = tag<FastifyHttpServerConfig>().setKey(FastifyServerConfigTag)
export const FastifyHttpsServerConfig       = tag<FastifyHttpsServerConfig>().setKey(FastifyServerConfigTag)
export const FastifyHttp2ServerConfig       = tag<FastifyHttp2ServerConfig>().setKey(FastifyServerConfigTag)
export const FastifyHttp2SecureServerConfig = tag<FastifyHttp2SecureServerConfig>().setKey(FastifyServerConfigTag)

const _AnyFastifyServerConfig = tag<FastifyHttpServerConfig>().setKey(FastifyServerConfigTag)

function LiveFastifyServerConfig<R, Server extends RawServerBase>(
  host: string,
  port: number,
  exitHandler: (
    request: FastifyRequest<RouteGenericInterface, Server>,
    reply: FastifyReply<Server>
  ) => (cause: Cause<never>) => IO.URIO<R, void>,
  options: FastifyServerOptions
): IO.IO<R, never, any> {
  return IO.asks((r: R) => ({
    ...options,
    host,
    port,
    exitHandler:
      (request: FastifyRequest<RouteGenericInterface, Server>, reply: FastifyReply<Server>) =>
      (cause: Cause<never>): IO.UIO<void> =>
        IO.giveAll_(exitHandler(request, reply)(cause), r)
  }))
}

export function LiveFastifyHttpServerConfig<R>(
  host: string,
  port: number,
  exitHandler: (
    request: FastifyRequest<RouteGenericInterface, http.Server>,
    reply: FastifyReply<http.Server>
  ) => (cause: Cause<never>) => IO.URIO<R, void>,
  options: FastifyServerOptions<http.Server>
) {
  return L.fromIO(FastifyHttpServerConfig)(LiveFastifyServerConfig(host, port, exitHandler, options))
}

export function LiveFastifyHttpsServerConfig<R>(
  host: string,
  port: number,
  exitHandler: (
    request: FastifyRequest<RouteGenericInterface, https.Server>,
    reply: FastifyReply<https.Server>
  ) => (cause: Cause<never>) => IO.URIO<R, void>,
  options: FastifyServerOptions<https.Server>
) {
  return L.fromIO(FastifyHttpsServerConfig)(LiveFastifyServerConfig(host, port, exitHandler, options))
}

export type ParamsDictionary = Record<string, string>

type RemoveTail<S extends string, Tail extends string> = S extends `${infer P}${Tail}` ? P : S
type GetRouteParameter<S extends string> = RemoveTail<
  RemoveTail<RemoveTail<S, `/${string}`>, `-${string}`>,
  `.${string}`
>

export type RouteParameters<Route> = string extends Route
  ? ParamsDictionary
  : Route extends `${string}(${string}`
  ? ParamsDictionary //TODO: handling for regex parameters
  : Route extends `${string}:${infer Rest}`
  ? (GetRouteParameter<Rest> extends never
      ? ParamsDictionary
      : GetRouteParameter<Rest> extends `${infer ParamName}?`
      ? { [P in ParamName]?: string }
      : { [P in GetRouteParameter<Rest>]: string }) &
      (Rest extends `${GetRouteParameter<Rest>}${infer Next}` ? RouteParameters<Next> : unknown)
  : {}

export type IORequestHandler<R, Server extends RawServerBase, Url extends string> = (
  request: FastifyRequest<RouteGenericInterface & { Params: RouteParameters<Url> }, Server>,
  reply: FastifyReply<Server>
) => IO.URIO<R, void>

export type IORequestHandlerRoute<
  R = any,
  Server extends RawServerBase = RawServerBase,
  Url extends string = any
> = IORequestHandler<R, Server, Url>

export type AnyIORequestHandler<R> = IORequestHandler<R, any, any>

type ConfigForServer<Server extends RawServerBase> = Server extends http.Server
  ? FastifyHttpServerConfig
  : Server extends https.Server
  ? FastifyHttpsServerConfig
  : Server extends http2.Http2Server
  ? FastifyHttp2ServerConfig
  : Server extends http2.Http2SecureServer
  ? FastifyHttp2SecureServerConfig
  : never

export const FastifyServerTag = '@principia/fastify/Server'
export type FastifyServerTag = typeof FastifyServerTag

export interface FastifyRouteOptions<R, Server extends RawServerBase, Url extends string>
  extends Omit<RouteOptions<Server>, 'url' | 'handler'> {
  url: Url
  handler: IORequestHandler<R, Server, Url>
}

export interface FastifyServerInstance<Server extends RawServerBase> {
  readonly route: <R, Url extends string>(
    opts: FastifyRouteOptions<R, Server, Url>
  ) => IO.URIO<Has<ConfigForServer<Server>> & R, void>
  readonly live: L.Layer<Has<ConfigForServer<Server>>, never, Has<ServerInstance<Server>>>
}

export interface ServerInstance<Server extends RawServerBase> {
  readonly _tag: FastifyServerTag
  readonly fastify: FastifyInstance<
    Server,
    RawRequestDefaultExpression<Server>,
    RawReplyDefaultExpression<Server>,
    FastifyLoggerInstance
  >
  readonly supervisor: Supervisor.Supervisor<readonly Fi.RuntimeFiber<any, any>[]>
  readonly start: Ma.UManaged<Server>
  readonly runtime: <R, Url extends string>(
    handler: IORequestHandler<R, Server, Url>
  ) => IO.IO<
    R,
    never,
    RouteHandlerMethod<
      Server,
      RawRequestDefaultExpression<Server>,
      RawReplyDefaultExpression<Server>,
      RouteGenericInterface & { Params: RouteParameters<Url> }
    >
  >
}

export const FastifyHttpServer        = tag<ServerInstance<http.Server>>().setKey(FastifyServerTag)
export const FastifyHttpsServer       = tag<ServerInstance<https.Server>>().setKey(FastifyServerTag)
export const FastifyHttp2Server       = tag<ServerInstance<http2.Http2Server>>().setKey(FastifyServerTag)
export const FastifyHttp2SecureServer = tag<ServerInstance<http2.Http2SecureServer>>().setKey(FastifyServerTag)

const AnyFastifyServer = tag<ServerInstance<http.Server>>().setKey(FastifyServerTag)

export function makeFastify<Server extends RawServerBase>(): FastifyServerInstance<Server> {
  return {
    // @ts-expect-error
    route: <R>(opts: Omit<RouteOptions<Server>, 'handler'>, handler: IORequestHandler<R, http.Server>) =>
      IO.gen(function* (_) {
        const { runtime, fastify } = yield* _(AnyFastifyServer)
        yield* _(
          pipe(
            runtime(handler),
            IO.chain((handler) =>
              IO.succeedLazy(() => {
                // @ts-expect-error
                fastify.route({ ...opts, handler })
              })
            )
          )
        )
      }),
    // @ts-expect-error
    live: L.fromManaged(AnyFastifyServer)(
      Ma.gen(function* (_) {
        const open = yield* _(
          pipe(
            IO.succeedLazy(() => new AtomicBoolean(true)),
            Ma.bracket((_) => IO.succeedLazy(() => _.set(false)))
          )
        )

        const { host, port, exitHandler, ...opts } = yield* _(_AnyFastifyServerConfig)

        const app = yield* _(IO.succeedLazy(() => fastify<http.Server>(opts)))

        const start: Ma.UManaged<http.Server> = Ma.bracket_(
          IO.async<unknown, never, http.Server>((cb) => {
            app
              .listen(port, host)
              .catch((err) => {
                cb(IO.halt(new NodeServerListenError(err as Error)))
              })
              .then(() => {
                cb(IO.succeedLazy(() => app.server))
              })
          }),
          (server) =>
            IO.async<unknown, never, void>((cb) => {
              server.close((err) => {
                if (err) {
                  cb(IO.halt(new NodeServerCloseError(err)))
                } else {
                  cb(IO.unit())
                }
              })
            })
        )

        const supervisor = yield* _(
          pipe(
            Supervisor.track,
            Ma.bracket((s) => pipe(s.value, IO.chain(Fi.interruptAll)))
          )
        )

        function runtime<R, Url extends string>(handler: IORequestHandler<R, http.Server, Url>) {
          return pipe(
            IO.runtime<R>(),
            IO.map((r) => r.supervised(supervisor)),
            IO.map(
              (
                  r
                ): RouteHandlerMethod<
                  http.Server,
                  RawRequestDefaultExpression<http.Server>,
                  RawReplyDefaultExpression<http.Server>,
                  RouteGenericInterface & { Params: RouteParameters<Url> }
                > =>
                (request, reply) => {
                  r.runFiber(
                    IO.onTermination_(open.get ? handler(request, reply) : IO.interrupt, exitHandler(request, reply))
                  )
                }
            )
          )
        }

        return {
          _tag: FastifyServerTag,
          fastify: app,
          supervisor,
          start,
          runtime
        }
      })
    )
  }
}
