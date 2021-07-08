// tracing: off

import type { Cause } from '@principia/base/Cause'
import type { Has } from '@principia/base/Has'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { _A, _R } from '@principia/base/util/types'
import type { NextHandleFunction } from 'connect'
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express'
import type { Server } from 'http'

import '@principia/base/Operators'

import { died, pretty } from '@principia/base/Cause'
import * as F from '@principia/base/Fiber'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
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

export const ExpressAppConfigTag = '@effect-ts/express/AppConfig'

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
  exitHandler: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => T.URIO<R, void>
) {
  return L.fromIO(ExpressAppConfig)(
    T.asks((r: R) => ({
      _tag: ExpressAppConfigTag,
      host,
      port,
      exitHandler: (req, res, next) => (cause) => T.giveAll_(exitHandler(req, res, next)(cause), r)
    }))
  )
}

export const ExpressAppTag = '@effect-ts/express/App'
export type ExpressAppTag = typeof ExpressAppTag

export type ManagedExpressApp = M.Managed<
  Has<ExpressAppConfig>,
  never,
  {
    readonly _tag: ExpressAppTag
    readonly app: Express
    readonly supervisor: Supervisor.Supervisor<readonly F.RuntimeFiber<any, any>[]>
    readonly server: Server
    readonly runtime: <Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>>(
      handlers: Handlers
    ) => T.IO<
      _R<
        {
          [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
            ? T.URIO<R, void>
            : never
        }[number]
      >,
      never,
      ReadonlyArray<RequestHandler>
    >
  }
>

export const makeExpressApp: ManagedExpressApp = M.gen(function* (_) {
  const open = yield* _(
    T.succeedLazy(() => new AtomicBoolean(true))['|>'](M.bracket((_) => T.succeedLazy(() => _.set(false))))
  )

  const app = yield* _(T.succeedLazy(() => express()))

  const { exitHandler, host, port } = yield* _(ExpressAppConfig)

  const server = yield* _(
    M.bracket_(
      T.async<unknown, never, Server>((cb) => {
        const onError = (err: Error) => {
          cb(T.die(new NodeServerListenError(err)))
        }
        const server  = app.listen(port, host, () => {
          cb(
            T.succeedLazy(() => {
              server.removeListener('error', onError)
              return server
            })
          )
        })
        server.addListener('error', onError)
      }),
      (server) =>
        T.async<unknown, never, void>((cb) => {
          server.close((err) => {
            if (err) {
              cb(T.die(new NodeServerCloseError(err)))
            } else {
              cb(T.unit())
            }
          })
        })
    )
  )

  const supervisor = yield* _(Supervisor.track['|>'](M.bracket((s) => s.value['|>'](T.chain(F.interruptAll)))))

  function runtime<
    Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>
  >(handlers: Handlers) {
    return T.map_(
      T.runtime<
        _R<
          {
            [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
              ? T.URIO<R, void>
              : never
          }[number]
        >
      >()['|>'](T.map((r) => r.supervised(supervisor))),
      (r) =>
        handlers.map(
          (handler): RequestHandler =>
            (req, res, next) => {
              r.runFiber(
                T.onTermination_(open.get ? handler(req, res, next) : T.interrupt, exitHandler(req, res, next))
              )
            }
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
  exitHandler: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => T.URIO<R, void>
): L.Layer<R, never, ExpressEnv>
export function LiveExpress<R>(
  host: string,
  port: number,
  exitHandler?: (req: Request, res: Response, next: NextFunction) => (cause: Cause<never>) => T.URIO<R, void>
): L.Layer<R, never, ExpressEnv> {
  return LiveExpressAppConfig(host, port, exitHandler || defaultExitHandler)['>+>'](LiveExpressApp)
}

export const expressApp = T.asksService(ExpressApp)((_) => _.app)

export const expressServer = T.asksService(ExpressApp)((_) => _.server)

export const { app: withExpressApp, server: withExpressServer } = T.deriveAsksIO(ExpressApp)(['app', 'server'])

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

export interface EffectRequestHandler<
  R,
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> {
  (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction): T.URIO<
    R,
    void
  >
}

export function expressRuntime<Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>>(
  handlers: Handlers
): T.IO<
  _R<
    {
      [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
        ? T.URIO<R, void>
        : never
    }[number]
  > &
    Has<ExpressApp>,
  never,
  ReadonlyArray<RequestHandler>
> {
  return T.asksServiceIO(ExpressApp)((_) => _.runtime(handlers))
}

export function match(method: Methods): {
  <Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>>(
    path: PathParams,
    ...handlers: Handlers
  ): T.URIO<
    ExpressEnv &
      _R<
        {
          [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
            ? T.URIO<R, void>
            : never
        }[number]
      >,
    void
  >
} {
  return function (path, ...handlers) {
    return expressRuntime(handlers)['|>'](
      T.chain((expressHandlers) =>
        withExpressApp((app) =>
          T.succeedLazy(() => {
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
): (cause: Cause<never>) => T.URIO<unknown, void> {
  return (cause) =>
    T.succeedLazy(() => {
      if (died(cause)) {
        console.error(pretty(cause))
      }
      _res.status(500).end()
    })
}

export function use<Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>>(
  ...handlers: Handlers
): T.URIO<
  ExpressEnv &
    _R<
      {
        [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
          ? T.URIO<R, void>
          : never
      }[number]
    >,
  void
>
export function use<Handlers extends NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>>(
  path: PathParams,
  ...handlers: Handlers
): T.URIO<
  ExpressEnv &
    _R<
      {
        [k in keyof Handlers]: [Handlers[k]] extends [EffectRequestHandler<infer R, any, any, any, any, any>]
          ? T.URIO<R, void>
          : never
      }[number]
    >,
  void
>
export function use(...args: NonEmptyArray<any>): T.URIO<ExpressEnv, void> {
  return withExpressApp((app) => {
    if (typeof args[0] === 'function') {
      return expressRuntime(args)['>>=']((expressHandlers) => T.succeedLazy(() => app.use(...expressHandlers)))
    } else {
      return expressRuntime(
        args.slice(1) as unknown as NonEmptyArray<EffectRequestHandler<any, any, any, any, any, any>>
      )['>>=']((expressHandlers) => T.succeedLazy(() => app.use(args[0], ...expressHandlers)))
    }
  })['|>'](T.asUnit)
}

export const all  = match('all')
export const get  = match('get')
export const post = match('post')
export const put  = match('put')
const delete_     = match('delete')
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
export function classic(_: NextHandleFunction, __trace?: string): EffectRequestHandler<unknown>
export function classic(_: RequestHandler, __trace?: string): EffectRequestHandler<unknown>
export function classic(_: RequestHandler | NextHandleFunction, __trace?: string): EffectRequestHandler<unknown> {
  // @ts-expect-error
  return (req, res, next) => T.succeedWith(() => _(req, res, next), __trace)
}
