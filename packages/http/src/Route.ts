import type { HttpConnection } from './HttpConnection'
import type { HttpResponseCompleted } from './HttpResponse'
import type { HttpMethod } from './utils'
import type { Has } from '@principia/base/Has'
import type { FIO, IO } from '@principia/base/IO'
import type { URL } from 'url'

import * as A from '@principia/base/Array'
import * as Ev from '@principia/base/Eval'
import * as FR from '@principia/base/FiberRef'
import * as FL from '@principia/base/FreeList'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Q from '@principia/base/Queue'
import * as p2r from 'path-to-regexp'

import { HttpConnectionTag } from './HttpConnection'
import { HttpException } from './HttpException'
import { HttpServerTag } from './HttpServer'
import * as Status from './StatusCode'
import { HttpContentType } from './utils'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type RouteFn<R, E> = (
  conn: HttpConnection,
  next: FIO<E, HttpResponseCompleted>
) => IO<R, E, HttpResponseCompleted>

export class Empty<R, E> {
  readonly R!: (_: R) => void
  readonly E!: () => E

  readonly _tag = 'Empty'
}

export class Route<R, E> {
  readonly _tag = 'Route'
  readonly R!: (_: R) => void
  readonly E!: () => E
  readonly match: (method: HttpMethod, url: URL) => boolean
  constructor(
    readonly method: HttpMethod,
    readonly path: string,
    readonly route: RouteFn<R, any>,
    readonly middlewares = FL.Empty<Middleware<any, any>>()
  ) {
    this.match = (method, url) => this.method === method && p2r.pathToRegexp(path).test(url.pathname || '')
  }
  middleware<R1 extends R = R, E1 extends E = E>(): ReadonlyArray<Middleware<R1, E1>> {
    return FL.toArray(this.middlewares)
  }
}

export class Combine<R, E> {
  readonly _tag = 'Combine'
  constructor(readonly left: Routes<R, E>, readonly right: Routes<R, E>) {}
}

export type Routes<R, E> = Route<R, E> | Combine<R, E> | Empty<R, E>

export type MiddlewareFn<R, E> = (
  cont: RouteFn<R, E>
) => (conn: HttpConnection, next: FIO<E, HttpResponseCompleted>) => IO<R, E, any>

export class Middleware<R, E> {
  constructor(readonly apply: MiddlewareFn<R, E>) {}
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const empty: Routes<unknown, never> = new Empty()

export function _route<R, E, R1, E1>(
  method: HttpMethod,
  path: string,
  handler: (
    conn: HttpConnection,
    n: IO<R, E, HttpResponseCompleted>
  ) => IO<Has<HttpConnection> & R1, E1, HttpResponseCompleted>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) =>
    <any>(
      new Combine(
        routes,
        new Route(method, path, (conn, n) => I.giveService(HttpConnectionTag)(conn)(<any>handler(conn, n)))
      )
    )
}

export function route<R, E>(
  method: HttpMethod,
  path: string,
  handler: (conn: HttpConnection) => IO<Has<HttpConnection> & R, E, HttpResponseCompleted>
): <R0, E0>(routes: Routes<R0, E0>) => Routes<R & R0, E | E0> {
  return _route(method, path, handler)
}

export function middlewareSafe<R, E, R1, E1>(
  routes: Routes<R, E>,
  middle: (cont: RouteFn<R, E>) => (conn: HttpConnection, next: FIO<E, HttpResponseCompleted>) => IO<R1, E1, any>
): Ev.Eval<Routes<R1, E1>> {
  return Ev.gen(function* (_) {
    switch (routes._tag) {
      case 'Empty': {
        return routes as any
      }
      case 'Route': {
        return new Route(
          routes.method,
          routes.path,
          routes.route,
          FL.append_(routes.middlewares, new Middleware(middle as any))
        ) as any
      }
      case 'Combine': {
        return new Combine(
          yield* _(middlewareSafe(routes.left, middle)),
          yield* _(middlewareSafe(routes.right, middle))
        )
      }
    }
  })
}

export function middleware_<R, E, R1, E1>(
  routes: Routes<R, E>,
  middle: (cont: RouteFn<R, E>) => (conn: HttpConnection, next: FIO<E, HttpResponseCompleted>) => IO<R1, E1, any>
): Routes<R1, E1> {
  return middlewareSafe(routes, middle).value
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

const Route404 =
  <R, E>(): RouteFn<R, E> =>
  ({ res: response }, _) =>
    I.orHalt(
      I.gen(function* (_) {
        yield* _(response.status(Status.NotFound))
        yield* _(response.set({ 'content-type': HttpContentType.TEXT_PLAIN }))
        yield* _(response.write('404: Not Found'))
        return yield* _(response.end())
      })
    )

export function HttpExceptionHandler<R, E>(routes: Routes<R, E>): Routes<R, Exclude<E, HttpException>> {
  return middleware_(
    routes,
    (cont) => (ctx, next) =>
      pipe(
        cont(ctx, next),
        I.catchAll((e) =>
          I.gen(function* (_) {
            yield* _(I.succeedLazy(() => console.log(e)))
            if (e instanceof HttpException) {
              yield* _(ctx.res.status(e.data!.status))
              yield* _(ctx.res.set({ 'content-type': HttpContentType.TEXT_PLAIN }))
              yield* _(ctx.res.write(e.message))
              return yield* _(ctx.res.end())
            } else {
              yield* _(I.fail(e))
            }
          })
        ),
        I.catchAll((e) => {
          if (e instanceof HttpException) {
            return I.orHaltWith_(ctx.res.end(), () => e)
          } else {
            return I.fail(<Exclude<E, HttpException>>e)
          }
        })
      )
  )
}

/*
 * -------------------------------------------
 * Drain
 * -------------------------------------------
 */

type RouteMatch<R, E> = (method: HttpMethod, url: URL) => RouteFn<R, E>

function toArray<R, E>(routes: Routes<R, E>): ReadonlyArray<RouteMatch<R, E>> {
  const go = (routes: Routes<R, E>): Ev.Eval<ReadonlyArray<RouteMatch<R, E>>> =>
    Ev.gen(function* (_) {
      switch (routes._tag) {
        case 'Empty': {
          return []
        }
        case 'Route': {
          const middlewares = routes.middleware()
          const x           = (method: HttpMethod, url: URL) => (routes.match(method, url) ? routes.route : Route404())
          if (A.isNonEmpty(middlewares)) {
            return [A.foldl_(middlewares, x, (b, m) => (method, url) => (r, n) => m.apply(b(method, url))(r, n))]
          }
          return [x]
        }
        case 'Combine': {
          return A.concat_(yield* _(go(routes.left)), yield* _(go(routes.right)))
        }
      }
    })
  return go(routes).value
}

export const isRouterDraining = FR.unsafeMake(false, identity, (a, b) => a && b)

type ProcessFn = (_: HttpConnection) => IO<unknown, never, HttpResponseCompleted>

export function drain<R>(rs: Routes<R, never>) {
  const routes = toArray(rs)
  return I.gen(function* ($) {
    const env = yield* $(I.ask<R>())
    const pfn = yield* $(
      I.succeedLazy(() =>
        A.foldl_(
          routes,
          <ProcessFn>(({ res: response }) => I.crossSecond_(response.status(Status.NotFound), response.end())),
          (b, a) => (ctx) =>
            I.gen(function* (_) {
              const method = yield* _(ctx.req.method)
              const url    = yield* _(
                pipe(
                  ctx.req.url,
                  I.tapError((ex) => I.succeedLazy(() => console.log(ex))),
                  I.orHalt
                )
              )
              return yield* _(I.give_(a(method, url)(ctx, b(ctx)), env))
            })
        )
      )
    )

    const { queue } = yield* $(HttpServerTag)
    return yield* $(
      pipe(isRouterDraining, FR.set(true), I.crossSecond(pipe(Q.take(queue), I.chain(flow(pfn, I.fork)), I.forever)))
    )
  })
}
