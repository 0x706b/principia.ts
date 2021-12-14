// tracing: off

import type { Has } from '@principia/base/Has'
import type { Cause } from '@principia/base/IO/Cause'
import type { _A, _R } from '@principia/base/util/types'
import type { NextHandleFunction } from 'connect'
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express'
import type { RouteParameters } from 'express-serve-static-core'
import type { Server } from 'http'

import '@principia/base/Operators'

import * as A from '@principia/base/Array'
import * as Fi from '@principia/base/Fiber'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as IO from '@principia/base/IO'
import { defaultPrettyPrint, halted } from '@principia/base/IO/Cause'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as Supervisor from '@principia/base/Supervisor'
import { AtomicBoolean } from '@principia/base/util/support/AtomicBoolean'
import express from 'express'

export class NodeServerCloseError {
  readonly _tag = 'NodeServerCloseError'
  constructor(readonly error: Error) {}
}

export class NodeServerListenError {
  readonly _tag = 'NodeServerListenError'
  constructor(readonly error: Error) {}
}

export const ExpressAppConfigTag = '@principia/express/ExpressAppConfig'

export interface ExpressAppConfig {
  readonly _tag: typeof ExpressAppConfigTag
  readonly port: number
  readonly host: string
  readonly exitHandler: typeof defaultExitHandler
}

export const ExpressAppConfig = tag<ExpressAppConfig>().setKey(ExpressAppConfigTag)

export function LiveExpressAppConfig<R>(
  host: string,
  port: number,
  exitHandler: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => IO.URIO<R, void>
) {
  return L.fromIO(ExpressAppConfig)(
    IO.asks((r: R) => ({
      _tag: ExpressAppConfigTag,
      host,
      port,
      exitHandler: (req, res, next) => (cause) => IO.give_(exitHandler(req, res, next)(cause), r)
    }))
  )
}

export const ExpressAppTag = '@principia/express/App'
export type ExpressAppTag = typeof ExpressAppTag

export type ManagedExpressApp = Ma.Managed<
  Has<ExpressAppConfig>,
  never,
  {
    readonly _tag: ExpressAppTag
    readonly app: Express
    readonly supervisor: Supervisor.Supervisor<readonly Fi.RuntimeFiber<any, any>[]>
    readonly server: Server
    readonly runtime: <Handlers extends Array<IORequestHandlerRoute>>(
      handlers: Handlers
    ) => IO.IO<
      _R<
        {
          [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
        }[number]
      >,
      never,
      ReadonlyArray<RequestHandler>
    >
  }
>

export const makeExpressApp: ManagedExpressApp = Ma.gen(function* (_) {
  const open = yield* _(
    IO.succeedLazy(() => new AtomicBoolean(true))['|>'](Ma.bracket((_) => IO.succeedLazy(() => _.set(false))))
  )

  const app = yield* _(IO.succeedLazy(() => express()))

  const { exitHandler, host, port } = yield* _(ExpressAppConfig)

  const server = yield* _(
    Ma.bracket_(
      IO.async<unknown, never, Server>((cb) => {
        const onError = (err: Error) => {
          cb(IO.halt(new NodeServerListenError(err)))
        }
        const server = app.listen(port, host, () => {
          cb(
            IO.succeedLazy(() => {
              server.removeListener('error', onError)
              return server
            })
          )
        })
        server.addListener('error', onError)
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
  )

  const supervisor = yield* _(
    pipe(
      Supervisor.track,
      Ma.bracket((s) => pipe(s.value, IO.chain(Fi.interruptAll)))
    )
  )

  function runtime<Handlers extends Array<IORequestHandlerRoute>>(handlers: Handlers) {
    return pipe(
      IO.runtime<
        _R<
          {
            [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
          }[number]
        >
      >(),
      IO.map((r) => r.supervised(supervisor)),
      IO.map((r) =>
        A.map_(
          handlers,
          (handler): RequestHandler =>
            (req, res, next) =>
              r.runFiber(
                IO.onTermination_(open.get ? handler(req, res, next) : IO.interrupt, exitHandler(req, res, next))
              )
        )
      )
    )
  }

  return {
    _tag: ExpressAppTag,
    app,
    supervisor,
    server,
    runtime
  }
})

export interface ExpressApp extends _A<typeof makeExpressApp> {}
export const ExpressApp     = tag<ExpressApp>().setKey(ExpressAppTag)
export const LiveExpressApp = L.fromManaged(ExpressApp)(makeExpressApp)

export type ExpressEnv = Has<ExpressAppConfig> & Has<ExpressApp>

export function LiveExpress(host: string, port: number): L.Layer<unknown, never, ExpressEnv>
export function LiveExpress<R>(
  host: string,
  port: number,
  exitHandler: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => IO.URIO<R, void>
): L.Layer<R, never, ExpressEnv>
export function LiveExpress<R>(
  host: string,
  port: number,
  exitHandler?: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => IO.URIO<R, void>
): L.Layer<R, never, ExpressEnv> {
  return LiveExpressAppConfig(host, port, exitHandler || defaultExitHandler)['>+>'](LiveExpressApp)
}

export const expressApp = IO.asksService(ExpressApp)((_) => _.app)

export const expressServer = IO.asksService(ExpressApp)((_) => _.server)

export const { app: withExpressApp, server: withExpressServer } = IO.deriveAsksIO(ExpressApp)(['app', 'server'])

export const methods = [
  'all',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'checkout',
  'connect',
  'copy',
  'lock',
  'merge',
  'mkactivity',
  'mkcol',
  'move',
  'm-search',
  'notify',
  'propfind',
  'proppatch',
  'purge',
  'report',
  'search',
  'subscribe',
  'trace',
  'unlock',
  'unsubscribe'
] as const

export type Methods = typeof methods[number]

export type PathParams = string | RegExp | Array<string | RegExp>

export interface ParamsDictionary {
  [key: string]: string
}

export interface ParsedQs {
  [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[]
}

export interface IORequestHandler<
  R,
  Route extends string = any,
  P = RouteParameters<Route>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> {
  (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction): IO.URIO<
    R,
    void
  >
}

type AnyIORequestHandler<R> = IORequestHandler<R, any, any, any, any, any, any>

export type IORequestHandlerRoute<R = any, Route extends string = any> = IORequestHandler<
  R,
  Route,
  RouteParameters<Route>
>

export function expressRuntime<Handlers extends Array<IORequestHandlerRoute>>(
  handlers: never extends Handlers ? Array<IORequestHandlerRoute> : Handlers
): IO.IO<
  _R<
    {
      [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
    }[number]
  > &
    Has<ExpressApp>,
  never,
  ReadonlyArray<RequestHandler>
> {
  return IO.asksServiceIO(ExpressApp)((_) => _.runtime(handlers))
}

export function match(method: Methods): {
  <Route extends string, Handlers extends Array<IORequestHandlerRoute<any, Route>>>(
    path: Route,
    ...handlers: never extends Handlers ? Array<IORequestHandler<any, Route, RouteParameters<Route>>> : Handlers
  ): IO.URIO<
    ExpressEnv &
      _R<
        {
          [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
        }[number]
      >,
    void
  >
} {
  return function (path, ...handlers) {
    return pipe(
      expressRuntime(handlers as Array<IORequestHandler<any>>),
      IO.chain((expressHandlers) =>
        withExpressApp((app) =>
          IO.succeedLazy(() => {
            app[method](path, ...expressHandlers)
          })
        )
      )
    )
  }
}

export function defaultExitHandler(
  _req: Request,
  _res: Response,
  _next: NextFunction
): (cause: Cause<never>) => IO.URIO<unknown, void> {
  return (cause) =>
    IO.succeedLazy(() => {
      if (halted(cause)) {
        console.error(defaultPrettyPrint(cause))
      }
      _res.status(500).end()
    })
}

export function use<Handlers extends Array<IORequestHandlerRoute>>(
  ...handlers: Handlers
): IO.URIO<
  ExpressEnv &
    _R<
      {
        [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
      }[number]
    >,
  void
>
export function use<Route extends string, Handlers extends Array<IORequestHandlerRoute<any, Route>>>(
  path: Route,
  ...handlers: never extends Handlers ? Array<IORequestHandlerRoute<any, Route>> : Handlers
): IO.URIO<
  ExpressEnv &
    _R<
      {
        [k in keyof Handlers]: [Handlers[k]] extends [AnyIORequestHandler<infer R>] ? IO.URIO<R, void> : never
      }[number]
    >,
  void
>
export function use(...args: Array<any>): IO.URIO<ExpressEnv, void> {
  return pipe(
    withExpressApp((app) => {
      if (typeof args[0] === 'function') {
        return IO.chain_(expressRuntime(args), (expressHandlers) => IO.succeedLazy(() => app.use(...expressHandlers)))
      } else {
        return IO.chain_(expressRuntime(args.slice(1) ?? []), (expressHandlers) =>
          IO.succeedLazy(() => app.use(args[0], ...expressHandlers))
        )
      }
    }),
    IO.asUnit
  )
}

export const all     = match('all')
export const get     = match('get')
export const post    = match('post')
export const put     = match('put')
const delete_ = match('delete')
export { delete_ as delete }
export const patch       = match('patch')
export const options     = match('options')
export const head        = match('head')
export const checkout    = match('checkout')
export const connect     = match('connect')
export const copy        = match('copy')
export const lock        = match('lock')
export const merge       = match('merge')
export const mkactivity  = match('mkactivity')
export const mkcol       = match('mkcol')
export const move        = match('move')
export const mSearch     = match('m-search')
export const notify      = match('notify')
export const propfind    = match('propfind')
export const proppatch   = match('proppatch')
export const purge       = match('purge')
export const report      = match('report')
export const search      = match('search')
export const subscribe   = match('subscribe')
export const trace       = match('trace')
export const unlock      = match('unlock')
export const unsubscribe = match('unsubscribe')

/**
 * Lift an express requestHandler into an effectified variant
 */
export function classic(_: NextHandleFunction): IORequestHandler<unknown, any>
export function classic(_: RequestHandler): IORequestHandler<unknown, any>
export function classic(_: RequestHandler | NextHandleFunction): IORequestHandler<unknown, any> {
  return (req, res, next) => IO.succeedLazy(() => _(req, res, next))
}
