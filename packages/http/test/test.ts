import '@principia/base/Operators'

import { putStrLn } from '@principia/base/Console'
import * as I from '@principia/base/IO'

import * as Http from '../src/HttpServer'
import * as Routes from '../src/Route'
import * as Status from '../src/StatusCode'
import { HttpContentType } from '../src/utils'

const r1 = Routes.route('GET', '/home', ({ res: response }) =>
  I.gen(function* (_) {
    yield* _(response.status(Status.Ok))
    yield* _(response.set({ 'content-type': HttpContentType.TEXT_PLAIN }))
    yield* _(response.write('Hello World!'))
    return yield* _(response.end())
  })
)

const server = Http.HttpServer({ host: 'localhost', port: 4000 })

function RequestTimer<R, E>(routes: Routes.Routes<R, E>) {
  return Routes.middleware_(
    routes,
    (cont) => (conn, next) =>
      I.chain_(I.timed(cont(conn, next)), ([n, r]) => I.as_(putStrLn(`Request took ${n}ms to execute`), r))
  )
}

function RequestURLLogger<R, E>(routes: Routes.Routes<R, E>) {
  return Routes.middleware_(
    routes,
    (cont) => (conn, next) => I.chain_(conn.req.url, (url) => I.crossSecond_(putStrLn(url.toJSON()), cont(conn, next)))
  )
}

const routes = Routes.empty['|>'](r1)['|>'](RequestTimer)['|>'](RequestURLLogger)['|>'](Routes.HttpExceptionHandler)

Routes.drain(routes)['|>'](I.provideSomeLayer(server))['|>'](I.run())
