import type { Has } from '@principia/base/Has'
import type { UQueue } from '@principia/base/IO/Queue'

import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/IO/Layer'
import * as M from '@principia/base/IO/Managed'
import * as Q from '@principia/base/IO/Queue'
import * as Ref from '@principia/base/IO/Ref'
import * as RefM from '@principia/base/IO/RefM'
import * as http from 'http'

import { HttpConnection } from './HttpConnection'

export interface HttpServerConfig {
  readonly host: string
  readonly port: number
}

export const HttpServerConfig = tag<HttpServerConfig>()

export function serverConfig(config: HttpServerConfig): L.Layer<unknown, never, Has<HttpServerConfig>> {
  return L.succeed(HttpServerConfig)(config)
}

export interface HttpServer {
  readonly server: http.Server
  readonly queue: UQueue<HttpConnection>
}

export const HttpServerTag = tag<HttpServer>()

export function HttpServer({ host, port }: HttpServerConfig): L.Layer<unknown, never, Has<HttpServer>> {
  return L.fromRawManaged(
    pipe(
      I.gen(function* (_) {
        const queue   = yield* _(Q.makeUnbounded<HttpConnection>())
        const runtime = yield* _(I.runtime<unknown>())
        const server  = yield* _(
          I.succeedLazy(() => {
            return http.createServer((req, res) => {
              runtime.run_(
                I.gen(function* (_) {
                  const reqRef = yield* _(Ref.make(req))
                  const resRef = yield* _(RefM.make(res))
                  yield* _(Q.offer_(queue, new HttpConnection(reqRef, resRef)))
                })
              )
            })
          })
        )
        yield* _(
          I.async<unknown, never, void>((k) => {
            function clean() {
              server.removeListener('error', onError)
              server.removeListener('listening', onDone)
            }
            function onError(error: Error) {
              clean()
              k(I.halt(error))
            }
            function onDone() {
              clean()
              k(I.unit())
            }

            server.listen(port, host).once('error', onError).once('listening', onDone)
          })
        )
        return { queue, server }
      }),
      M.bracket(({ queue, server }) =>
        pipe(
          I.async<unknown, never, void>((k) => {
            server.close((error) => {
              if (error) {
                k(I.halt(error))
              } else {
                k(I.unit())
              }
            })
          }),
          I.crossSecond(Q.shutdown(queue))
        )
      ),
      M.map(HttpServerTag.of)
    )
  )
}
