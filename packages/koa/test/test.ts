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
    yield* _(res.write('Hello').orHalt)
    yield* _(res.end().orHalt)
  })
)

const file = Koa.route('get')('/file/:name', ({ connection: { res }, params }) =>
  I.gen(function* (_) {
    const p      = path.resolve(process.cwd(), 'test', params.name)
    const exists = yield* _(
      NFS.stat(p)
        .map((stats) => stats.isFile())
        .catchAll((_) => I.succeed(false))
    )
    yield* _(
      I.if_(
        exists,
        res
          .status(Status.Ok)
          ['*>'](res.set({ 'content-type': 'text/plain', 'content-encoding': 'gzip' }))
          ['*>'](res.pipeFrom(NFS.createReadStream(p)['|>'](ZL.gzip()))).orHalt,
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

const program = I.gen(function* (_) {
  yield* _(home)
  yield* _(file)
  yield* _(IO.never)
})

I.run_(program.give(Koa.Koa('localhost', 4000)), (ex) => console.log(inspect(ex, { depth: 10 })))
