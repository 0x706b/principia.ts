import '@principia/base/Operators'

import * as Status from '@principia/http/StatusCode'
import * as I from '@principia/io/IO'
import * as NFS from '@principia/node/fs'
import * as ZL from '@principia/node/zlib'
import * as path from 'path'
import { inspect } from 'util'

import * as Koa from '../src'

const home = Koa.route('get')('/', ({ connection: { res } }) =>
  I.gen(function* (_) {
    yield* _(res.write('Hello')['|>'](I.orDie))
    yield* _(res.end()['|>'](I.orDie))
  })
)

const file = Koa.route('get')('/file/:name', ({ connection: { res }, params }) =>
  I.gen(function* (_) {
    const p      = path.resolve(process.cwd(), 'test', params['name'])
    const exists = yield* _(
      NFS.stat(p)
        ['|>'](I.map((stats) => stats.isFile()))
        ['|>'](I.catchAll((_) => I.succeed(false)))
    )
    yield* _(
      I.if_(
        () => exists,
        () =>
          res
            .status(Status.Ok)
            ['*>'](res.set({ 'content-type': 'text/plain', 'content-encoding': 'gzip' }))
            ['*>'](res.pipeFrom(NFS.createReadStream(p)['|>'](ZL.gzip())))
            ['|>'](I.orDie),
        () =>
          I.die({
            _tag: 'HttpRouteException',
            message: `File at ${p} is not a file or does not exist`,
            status: 500
          })
      )
    )
    yield* _(res.end())
  })
)

const env = Koa.KoaAppConfig.live('localhost', 4000, Koa.defaultExitHandler)
  ['>+>'](Koa.KoaRuntime.live)
  ['>+>'](Koa.KoaRouterConfig.empty)
  ['>+>'](file)
  ['>+>'](home)
  ['>+>'](Koa.KoaApp.live)

I.run_(I.never['|>'](I.giveLayer(env)), (ex) => console.log(inspect(ex, { depth: 10 })))
