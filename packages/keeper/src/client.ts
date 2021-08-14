import type { _A } from '@principia/base/util/types'

import '@principia/base/Operators'

import * as A from '@principia/base/Array'
import { Tagged } from '@principia/base/Case'
import * as Chunk from '@principia/base/Chunk'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/IO/Layer'
import * as M from '@principia/base/IO/Managed'
import * as P from '@principia/base/IO/Promise'
import * as O from '@principia/base/Option'
import * as Str from '@principia/base/string'
import * as Z from 'node-zookeeper-client'

import { KeeperConfig } from './config'

export class ZooError extends Tagged('ZooError')<{
  readonly op: string
  readonly message: string
}> {}

export const KeeperClientSym = Symbol()

export const makeKeeperClient = M.gen(function* (_) {
  const { connectionString, options } = yield* _(KeeperConfig)

  const monitor = yield* _(P.make<ZooError, never>())

  const client = yield* _(
    T.async<unknown, ZooError, Z.Client>((cb) => {
      const cli = Z.createClient(connectionString, options)

      cli.once('state', (state) => {
        if (state.code === Z.State.SYNC_CONNECTED.code) {
          cb(T.succeed(cli))
        } else {
          cb(T.fail(new ZooError({ op: 'CONNECT', message: JSON.stringify(state) })))
        }
      })

      cli.connect()
      cli.on('state', (s) => {
        if (s.code === Z.State.DISCONNECTED.code) {
          T.run_(P.fail_(monitor, new ZooError({ op: 'DISCONNECTED', message: JSON.stringify(s) })))
        }
      })
    })['|>'](M.bracket((cli) => T.succeedLazy(() => cli.close())))
  )

  function create(
    path: string,
    opt: { data?: Buffer, mode?: keyof typeof Z.CreateMode }
  ): T.IO<unknown, ZooError, string>
  function create(path: string, __trace?: string): T.IO<unknown, ZooError, string>
  function create(
    path: string,
    opt?: { data?: Buffer, mode?: keyof typeof Z.CreateMode } | string
  ): T.IO<unknown, ZooError, string> {
    return T.async<unknown, ZooError, string>((cb) => {
      const handler = (e: Error | Z.Exception, p: string): void => {
        if (e) {
          cb(T.fail(new ZooError({ op: 'CREATE', message: JSON.stringify(e) })))
        } else {
          cb(T.succeed(p))
        }
      }
      if (typeof opt === 'object') {
        if (opt && typeof opt.data !== 'undefined' && typeof opt.mode !== 'undefined') {
          client.create(path, opt.data, Z.CreateMode[opt.mode], handler)
        } else if (opt && typeof opt.data !== 'undefined') {
          client.create(path, opt.data, handler)
        } else if (opt && typeof opt.mode !== 'undefined') {
          client.create(path, Z.CreateMode[opt.mode], handler)
        } else {
          client.create(path, handler)
        }
      } else {
        client.create(path, handler)
      }
    })
  }

  function mkdir(
    path: string,
    opt: { data?: Buffer, mode?: keyof typeof Z.CreateMode }
  ): T.IO<unknown, ZooError, string>
  function mkdir(path: string, __trace?: string): T.IO<unknown, ZooError, string>
  function mkdir(
    path: string,
    opt?: { data?: Buffer, mode?: keyof typeof Z.CreateMode } | string,
    __trace?: string
  ): T.IO<unknown, ZooError, string> {
    return T.async<unknown, ZooError, string>((cb) => {
      const handler = (e: Error | Z.Exception, p: string): void => {
        if (e) {
          cb(T.fail(new ZooError({ op: 'MKDIR', message: JSON.stringify(e) })))
        } else {
          cb(T.succeed(p))
        }
      }
      if (typeof opt === 'object') {
        if (opt && typeof opt.data !== 'undefined' && typeof opt.mode !== 'undefined') {
          client.mkdirp(path, opt.data, Z.CreateMode[opt.mode], handler)
        } else if (opt && typeof opt.data !== 'undefined') {
          client.mkdirp(path, opt.data, handler)
        } else if (opt && typeof opt.mode !== 'undefined') {
          client.mkdirp(path, Z.CreateMode[opt.mode], handler)
        } else {
          client.mkdirp(path, handler)
        }
      } else {
        client.mkdirp(path, handler)
      }
    })
  }

  function waitDelete(path: string) {
    return T.async<unknown, ZooError, string>((cb) => {
      client.exists(
        path,
        (ev) => {
          if (ev.name === 'NODE_DELETED') {
            cb(T.succeed(ev.path))
          }
        },
        (e, p) => {
          if (e) {
            cb(T.fail(new ZooError({ op: 'CREATE', message: JSON.stringify(e) })))
          } else {
            if (p == null) {
              cb(T.fail(new ZooError({ op: 'WAIT_DELETE', message: 'path does not exist' })))
            }
          }
        }
      )
    })
  }

  function remove(path: string) {
    return T.async<unknown, ZooError, void>((cb) => {
      client.remove(path, (e) => {
        if (e) {
          cb(T.fail(new ZooError({ op: 'REMOVE', message: JSON.stringify(e) })))
        } else {
          cb(T.unit())
        }
      })
    })
  }

  function getData(path: string) {
    return T.async<unknown, ZooError, O.Option<Buffer>>((cb) => {
      client.getData(path, (e, b) => {
        if (e) {
          cb(T.fail(new ZooError({ op: 'GET_DATA', message: JSON.stringify(e) })))
        } else {
          cb(T.succeed(O.fromNullable(b)))
        }
      })
    })
  }

  function getChildren(path: string) {
    return T.async<unknown, ZooError, Chunk.Chunk<string>>((cb) => {
      client.getChildren(path, (e, b) => {
        if (e) {
          cb(T.fail(new ZooError({ op: 'GET_DATA', message: JSON.stringify(e) })))
        } else {
          cb(T.succeed(Chunk.from(A.sort(Str.Ord)(b))))
        }
      })
    })
  }

  return {
    [KeeperClientSym]: KeeperClientSym,
    client,
    create,
    mkdir,
    monitor: P.await(monitor),
    waitDelete,
    remove,
    getData,
    getChildren
  } as const
})

export interface KeeperClient extends _A<typeof makeKeeperClient> {}
export const KeeperClient     = tag<KeeperClient>()
export const LiveKeeperClient = L.fromManaged(KeeperClient)(makeKeeperClient)
