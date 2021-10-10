import '@principia/base/Operators'

import * as I from '@principia/base/IO'
import * as Status from '@principia/http/StatusCode'
import * as NFS from '@principia/node/fs'
import * as ZL from '@principia/node/zlib'
import * as path from 'path'
import { inspect } from 'util'

import * as Koa from '../src'

const home = Koa.route('get')('/', ({ connection: { res } }) =>
  I.gen(function* (_) {
    yield* _(res.write('Hello')['|>'](I.orHalt))
    yield* _(res.end()['|>'](I.orHalt))
  })
)

const file = Koa.route('get')('/file/:name', ({ connection: { res }, params }) =>
  I.gen(function* (_) {
    const p      = path.resolve(process.cwd(), 'test', params.name)
    const exists = yield* _(
      NFS.stat(p)
        ['|>'](I.map((stats) => stats.isFile()))
        ['|>'](I.catchAll((_) => I.succeed(false)))
    )
    yield* _(
      I.if_(
        exists,
        res
          .status(Status.Ok)
          ['*>'](res.set({ 'content-type': 'text/plain', 'content-encoding': 'gzip' }))
          ['*>'](res.pipeFrom(NFS.createReadStream(p)['|>'](ZL.gzip())))
          ['|>'](I.orHalt),
        I.halt({
          _tag: 'HttpRouteException',
          message: `File at ${p} is not a file or does not exist`,
          status: 500
        })
      )
    )
    yield* _(res.end())
  })
)

I.run_(I.never.give(Koa.Koa('localhost', 4000, [home, file])), (ex) => console.log(inspect(ex, { depth: 10 })))
