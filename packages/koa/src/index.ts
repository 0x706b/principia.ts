import type { RouterParamContext } from '@koa/router'
import type {} from '@principia/base/fluent'
import type { Has } from '@principia/base/Has'
import type { IO, URIO } from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Console } from '@principia/base/IO/Console'
import type { Exit } from '@principia/base/IO/Exit'
import type { RuntimeFiber } from '@principia/base/IO/Fiber'
import type { IOEnv } from '@principia/base/IO/IOEnv'
import type { Supervisor } from '@principia/base/IO/Supervisor'
import type { _R, Erase, UnionToIntersection } from '@principia/base/util/types'
import type * as http from 'http'
import type { DefaultContext, DefaultState, Middleware, Next, ParameterizedContext } from 'koa'

import '@principia/base/Operators'

import KoaRouter from '@koa/router'
import * as A from '@principia/base/Array'
import { flow } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as Ca from '@principia/base/IO/Cause'
import { putStrLnErr } from '@principia/base/IO/Console'
import * as Ex from '@principia/base/IO/Exit'
import * as Fi from '@principia/base/IO/Fiber'
import { live as liveIOEnv } from '@principia/base/IO/IOEnv'
import * as L from '@principia/base/IO/Layer'
import * as M from '@principia/base/IO/Managed'
import * as Ref from '@principia/base/IO/Ref'
import * as RefM from '@principia/base/IO/RefM'
import * as Su from '@principia/base/IO/Supervisor'
import { HttpConnection } from '@principia/http/HttpConnection'
import * as Status from '@principia/http/StatusCode'
import koa from 'koa'
import koaCompose from 'koa-compose'

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

export type RouterContext<P> = Omit<RouterParamContext, 'params'> & {
  params: P extends Array<any>
    ? UnionToIntersection<
        {
          [K in number]: RouteParameters<P[K]>
        }[number]
      >
    : RouteParameters<P>
}

export type Context<P extends Path = any, S = DefaultState, C = DefaultContext, B = unknown> = ParameterizedContext<
  S,
  C,
  B
> &
  RouterContext<P> & {
    connection: HttpConnection
  }

export interface ExitHandler<R, S = DefaultState, C = DefaultContext, B = unknown> {
  (ctx: Context<any, S, C, B>, next: Next): (cause: Cause<never>) => URIO<R & IOEnv, void>
}

export const KoaAppConfigTag = tag<KoaAppConfig>()

export const Methods = {
  all: 'all',
  get: 'get',
  put: 'put',
  post: 'post',
  patch: 'patch',
  delete: 'delete'
} as const

export type Methods = typeof Methods[keyof typeof Methods]

export abstract class KoaAppConfig {
  abstract readonly host: string
  abstract readonly port: number
  abstract readonly exitHandler: ExitHandler<unknown>

  static live<R>(host: string, port: number, exitHandler: ExitHandler<R>): L.Layer<R, never, Has<KoaAppConfig>> {
    return L.fromIO(KoaAppConfigTag)(
      I.asks(
        (r: R) =>
          new (class extends KoaAppConfig {
            host = host
            port = port
            exitHandler: ExitHandler<unknown> = (ctx, next) => flow(exitHandler(ctx, next), I.give(r))
          })()
      )
    )
  }
}

export class NodeServerCloseError {
  readonly _tag = 'NodeServerCloseError'
  constructor(readonly error: Error) {}
}

export class NodeServerListenError {
  readonly _tag = 'NodeServerListenError'
  constructor(readonly error: Error) {}
}

export const KoaAppTag = tag<KoaApp>()

export abstract class KoaApp {
  abstract readonly app: koa<DefaultState, Context>
  abstract readonly server: http.Server

  private static _derived = I.deriveLifted(KoaAppTag)([], [], ['app', 'server'])

  static app    = KoaApp._derived.app
  static server = KoaApp._derived.server

  static live: L.Layer<Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaApp>> = L.fromManaged(KoaAppTag)(
    M.gen(function* (_) {
      const routerConfig = yield* _(KoaRouterConfigTag)
      const app          = yield* _(
        I.succeedLazy(() => {
          const app = new koa<DefaultState, Context>()
          Object.defineProperty(app.context, 'connection', {
            get() {
              const req = Ref.unsafeMake(this.req)
              const res = RefM.unsafeMake(this.res)
              return new HttpConnection(req, res)
            }
          })
          app.use(koaCompose(A.mutableClone(routerConfig.middleware)))
          if (routerConfig.parentRouter) {
            app.use(routerConfig.parentRouter.allowedMethods())
            app.use(routerConfig.parentRouter.routes())
          } else {
            app.use(routerConfig.router.allowedMethods())
            app.use(routerConfig.router.routes())
          }
          return app
        })
      )
      const { host, port } = yield* _(KoaAppConfigTag)
      const server         = yield* _(
        I.async<unknown, never, http.Server>((k) => {
          const onError = (error: Error) => {
            k(I.halt(new NodeServerListenError(error)))
          }
          const server = app.listen(port, host, () => {
            k(
              I.succeedLazy(() => {
                server.removeListener('error', onError)
                return server
              })
            )
          })
          server.addListener('error', onError)
        }).toManaged((server) =>
          I.async<unknown, never, void>((k) => {
            server.close((error) => {
              if (error) {
                k(I.halt(new NodeServerCloseError(error)))
              } else {
                k(I.unit())
              }
            })
          })
        )
      )

      return {
        app,
        server
      }
    })
  )
}

export const KoaRuntimeTag = tag<KoaRuntime>()

export abstract class KoaRuntime {
  abstract readonly supervisor: Supervisor<ReadonlyArray<RuntimeFiber<any, any>>>
  abstract readonly runtime: <R>() => IO<R, never, <E, A>(effect: IO<R & IOEnv, E, A>) => Promise<Exit<E, A>>>
  static supervisor = I.deriveLifted(KoaRuntimeTag)([], [], ['supervisor'])

  static runtime<R>() {
    return I.asksServiceIO(KoaRuntimeTag)((r) => r.runtime<R>())
  }

  static live: L.Layer<unknown, never, Has<KoaRuntime>> = L.fromManaged(KoaRuntimeTag)(
    M.gen(function* (_) {
      const open       = yield* _(Ref.make(true).toManaged((ref) => ref.set(false)))
      const supervisor = yield* _(Su.track.toManaged((s) => s.value.chain(Fi.interruptAll)))

      function runtime<R>() {
        return I.runtime<R>()
          .map((r) => r.supervised(supervisor))
          .map(
            (r) =>
              <E, A>(effect: IO<R & IOEnv, E, A>) =>
                open.get
                  .ifIO(
                    I.defer(() => effect['|>'](I.giveLayer(liveIOEnv))['|>'](r.runFiber).await),
                    I.succeed(Ex.failCause(Ca.empty))
                  )
                  .runPromiseExit()
                  .then(Ex.flatten)
          )
      }

      return {
        supervisor,
        runtime
      }
    })
  )
}

export type KoaEnv = Has<KoaAppConfig> & Has<KoaApp>

export function Koa<Routes extends Array<Layer<any, any, Has<KoaRouterConfig>>>>(
  host: string,
  port: number,
  routes: Routes
): L.Layer<Erase<L.MergeR<Routes>, Has<KoaRouterConfig> & Has<KoaRuntime> & Has<KoaAppConfig>>, never, KoaEnv>
export function Koa<R, Routes extends Array<Layer<Has<KoaRouterConfig>, any, Has<KoaRouterConfig>>>>(
  host: string,
  port: number,
  routes: Routes,
  exitHandler: ExitHandler<R>
): L.Layer<R & Erase<L.MergeR<Routes>, Has<KoaRouterConfig> & Has<KoaRuntime> & Has<KoaAppConfig>>, never, KoaEnv>
export function Koa<R, Routes extends Array<Layer<Has<KoaRouterConfig>, any, Has<KoaRouterConfig>>>>(
  host: string,
  port: number,
  routes: Routes,
  exitHandler?: ExitHandler<R>
): L.Layer<
  Erase<L.MergeR<Routes>, Has<KoaRouterConfig> & Has<KoaRuntime> & Has<KoaAppConfig>> & R,
  L.MergeE<Routes>,
  KoaEnv
> {
  const freshRoutes = L.all(L.identity<Has<KoaRouterConfig>>(), ...routes.map((r) => r.fresh))
  // @ts-expect-error
  return freshRoutes['<<<'](KoaRuntime.live)
    ['<+<'](KoaAppConfig.live(host, port, exitHandler ?? defaultExitHandler))
    ['<<<'](KoaRouterConfig.empty)
    ['>+>'](KoaApp.live)
}

export function defaultExitHandler(
  ctx: ParameterizedContext<DefaultState, Context>,
  _next: Next
): (cause: Cause<never>) => URIO<Has<Console>, void> {
  return (cause) =>
    I.gen(function* (_) {
      if (Ca.halted(cause)) {
        yield* _(putStrLnErr(Ca.defaultPrettyPrint(cause)))
      }
      yield* _(ctx.connection.res.status(Status.InternalServerError))
      yield* _(ctx.connection.res.end())
    })
}

export const KoaRouterConfigTag = tag<KoaRouterConfig>()

export abstract class KoaRouterConfig {
  abstract readonly middleware: ReadonlyArray<Middleware<DefaultState, Context>>
  abstract readonly router: KoaRouter<DefaultState, Context>
  abstract readonly parentRouter?: KoaRouter<DefaultState, Context>

  static empty: L.Layer<unknown, never, Has<KoaRouterConfig>> = L.succeed(KoaRouterConfigTag)(
    new (class extends KoaRouterConfig {
      middleware   = []
      router       = new KoaRouter<DefaultState, Context>()
      parentRouter = undefined
    })()
  )
}

export interface RequestHandler<R, P extends Path = any, S = DefaultState, C = DefaultContext, B = unknown> {
  (ctx: Context<P, S, C, B>, next: Next): URIO<R, void>
}

export type Path = string | RegExp | Array<string | RegExp>

export function route(
  method: Methods
): <P extends Path, Handlers extends Array<RequestHandler<any, P>>>(
  path: P,
  ...handlers: Handlers
) => L.Layer<Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaRouterConfig>> {
  return (path, ...handlers) =>
    L.fromIO(KoaRouterConfigTag)(
      I.gen(function* (_) {
        const { runtime }     = yield* _(KoaRuntimeTag)
        const config          = yield* _(KoaRouterConfigTag)
        const { exitHandler } = yield* _(KoaAppConfigTag)
        const run             = yield* _(runtime())
        return yield* _(
          I.succeedLazy(() => {
            config.router[method](
              path,
              ...handlers.map(
                (h): Middleware<DefaultState, Context> =>
                  async (ctx, next) => {
                    // @ts-expect-error UnionToIntersection
                    await run(h(ctx, next).onTermination(exitHandler(ctx, next)))
                  }
              )
            )
            return config
          })
        )
      })
    )
}

type RequestHandlersEnv<Hs extends Array<RequestHandler<any, any, any, any>>> = _R<
  {
    [i in keyof Hs]: [Hs[i]] extends [RequestHandler<infer R, any, any, any>] ? URIO<R, void> : never
  }[number]
>

export function use<Handlers extends [RequestHandler<any>, ...RequestHandler<any>[]]>(
  ...handlers: Handlers
): L.Layer<
  Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig> & RequestHandlersEnv<Handlers>,
  never,
  Has<KoaRouterConfig>
>
export function use<P extends Path, Handlers extends Array<RequestHandler<any, P>>>(
  path: P,
  ...handlers: Handlers
): L.Layer<
  Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig> & RequestHandlersEnv<Handlers>,
  never,
  Has<KoaRouterConfig>
>
export function use(
  ...args: any[]
): L.Layer<Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaRouterConfig>> {
  return L.fromIO(KoaRouterConfigTag)(
    I.gen(function* (_) {
      const { runtime }     = yield* _(KoaRuntimeTag)
      const config          = yield* _(KoaRouterConfigTag)
      const { exitHandler } = yield* _(KoaAppConfigTag)
      const run             = yield* _(runtime())
      return yield* _(
        I.succeedLazy(() => {
          if (typeof args[0] === 'function') {
            config.router.use(
              ...args.map(
                (h: RequestHandler<unknown>): Middleware<DefaultState, Context> =>
                  async (ctx, next) =>
                    await run(h(ctx, next).onTermination(exitHandler(ctx, next)))
              )
            )
          } else {
            config.router.use(
              args[0],
              ...args.slice(1).map(
                (h: RequestHandler<unknown>): Middleware<DefaultState, Context> =>
                  async (ctx, next) =>
                    await run(h(ctx, next).onTermination(exitHandler(ctx, next)))
              )
            )
          }
          return config
        })
      )
    })
  )
}

export function classic(_: koa.Middleware): RequestHandler<unknown> {
  return (ctx, next) => I.succeedLazy(() => _(ctx, next))
}
