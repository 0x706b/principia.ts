import type { Has } from '@principia/base/Has'
import type { _A } from '@principia/base/util/types'

import { Tagged } from '@principia/base/Case'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/IO/Layer'
import * as M from '@principia/base/IO/Managed'
import * as pg from 'pg'

export const PGConfigSymbol = Symbol()
export type PGConfigSymbol = typeof PGConfigSymbol

export interface PGConfig {
  readonly [PGConfigSymbol]: PGConfigSymbol
  readonly config: pg.PoolConfig
}

export const PGConfig = tag<PGConfig>()

export function makePGConfig(config: pg.PoolConfig): PGConfig {
  return {
    [PGConfigSymbol]: PGConfigSymbol,
    config
  }
}

export const PGClientSymbol: unique symbol = Symbol()
export type PGClientSymbol = typeof PGClientSymbol

export interface PGClient {
  readonly [PGClientSymbol]: PGClientSymbol
  readonly client: pg.ClientBase
}

export class PGClientImpl implements PGClient {
  readonly [PGClientSymbol]: PGClientSymbol = PGClientSymbol
  constructor(readonly client: pg.ClientBase) {}
}

export const PGClient = tag<PGClient>()

export const PGSymbol = Symbol()
export type PGSymbol = typeof PGSymbol

export class PGQueryError extends Tagged('PGQueryError')<{
  readonly error: Error
}> {}

export const makePG = M.gen(function* (_) {
  const { config } = yield* _(PGConfig)

  const pool = yield* _(
    pipe(
      T.succeedLazy(() => new pg.Pool(config)),
      M.bracket((pool) => T.fromPromiseHalt(() => pool.end()))
    )
  )

  function withClient<R, E, A>(effect: T.IO<R & Has<PGClient>, E, A>) {
    return T.asksIO((r: R) => {
      if (typeof r === 'object' && r != null && PGClient.key in r) {
        return effect as T.IO<R, E, A>
      }
      return pipe(
        T.fromPromiseHalt(() => pool.connect()),
        T.bracket(
          (client) => T.giveService(PGClient)(new PGClientImpl(client))(effect),
          (client) => T.succeedLazy(() => client.release())
        )
      )
    })
  }

  function query(queryText: string, values?: (string | number | Date)[]): T.UIO<pg.QueryResult<pg.QueryResultRow>> {
    return T.asksServiceIO(PGClient)((cli) =>
      T.async<unknown, never, pg.QueryResult<pg.QueryResultRow>>((cb) => {
        const handle = (error: Error | undefined, res: pg.QueryResult<pg.QueryResultRow>) => {
          if (error) {
            cb(T.halt(new PGQueryError({ error })))
          } else {
            cb(T.succeed(res))
          }
        }
        cli.client.query(queryText, values ?? [], handle)
      })
    )['|>'](withClient)
  }

  function transaction<R, E, A>(effect: T.IO<R & Has<PGClient>, E, A>) {
    return T.bracketExit_(
      query('BEGIN'),
      () => effect,
      (_, ex) => (ex._tag === 'Failure' ? query('ROLLBACK') : query('COMMIT'))
    )['|>'](withClient)
  }

  return {
    [PGSymbol]: PGSymbol,
    pool,
    withClient,
    query,
    transaction
  } as const
})

export interface PG extends _A<typeof makePG> {}
export const PG     = tag<PG>()
export const LivePG = L.fromManaged(PG)(makePG)

export const { pool, query } = T.deriveLifted(PG)(['query'], [], ['pool'])

export function transaction<R, E, A>(effect: T.IO<R & Has<PGClient>, E, A>) {
  return T.asksServiceIO(PG)((_) => _.transaction(effect))
}

export function withClient<R, E, A>(effect: T.IO<R & Has<PGClient>, E, A>) {
  return T.asksServiceIO(PG)((_) => _.transaction(effect))
}
