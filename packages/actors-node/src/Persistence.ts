import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IOEnv'
import type { QueryResultRow } from 'pg'

import { CaseClass } from '@principia/base/Case'
import * as C from '@principia/base/collection/immutable/Conc'
import * as HM from '@principia/base/collection/immutable/HashMap'
import { identity, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import * as ST from '@principia/base/Stream'
import * as PG from '@principia/pg'
import * as S from '@principia/schema'
import * as P from '@principia/schema/Decoder'

import { computeShardForId, ShardContext } from './ShardContext'

export interface Persistence {
  readonly transaction: (persistenceId: string) => <R, E, A>(effect: T.IO<R, E, A>) => T.IO<R & Has<ShardContext>, E, A>

  readonly get: (persistenceId: string) => T.IO<
    Has<ShardContext>,
    never,
    M.Maybe<{
      persistenceId: string
      shard: number
      state: unknown
      event_sequence: number
    }>
  >

  readonly set: (persistenceId: string, value: unknown, event_sequence: number) => T.IO<Has<ShardContext>, never, void>

  readonly emit: (
    persistenceId: string,
    events: C.Conc<{ value: unknown, eventSequence: number }>
  ) => T.IO<Has<ShardContext>, never, void>

  readonly events: (
    persistenceId: string,
    from: number,
    size: number
  ) => T.IO<
    Has<ShardContext>,
    never,
    C.Conc<{
      persistenceId: string
      domain: string
      shard: number
      shardSequence: number
      event: unknown
      eventSequence: number
    }>
  >

  readonly setup: T.IO<Has<ShardContext>, never, void>

  readonly eventStream: <S>(
    messages: S.Standard<S, unknown>,
    opts?: {
      delay?: number
      perPage?: number
    }
  ) => (offsets: C.Conc<Offset>) => ST.Stream<IOEnv, S.CondemnException, Event<Offset, S>>
}

export class Event<Offset, S> extends CaseClass<{ offset: Offset, event: S }> {}

export const Persistence = tag<Persistence>()

export class Offset extends S.Model<Offset>()(
  S.properties({
    domain: S.prop(S.string),
    shard: S.prop(S.number),
    sequence: S.prop(S.number)
  })
) {}

export const LivePersistence = L.fromManaged(Persistence)(
  Ma.gen(function* (_) {
    const cli = yield* _(PG.PG)

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "state_journal" (
        persistence_id  text PRIMARY KEY,
        shard           integer,
        event_sequence  integer,
        state           jsonb
      );`)
    )

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "event_journal" (
        persistence_id  text,
        domain          text,
        shard_sequence  integer,
        shard           integer,
        event_sequence  integer,
        event           jsonb,
        PRIMARY KEY(persistence_id, event_sequence)
      );`)
    )

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "shard_journal" (
        domain          text,
        shard           integer,
        sequence        integer,
        PRIMARY KEY(domain, shard)
      );`)
    )

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "domain_journal" (
        domain          text PRIMARY KEY,
        shards          integer
      );`)
    )

    const eventStream =
      <S>(
        messages: S.Standard<S>,
        opts?: {
          delay?: number
          perPage?: number
        }
      ) =>
      (offsets: C.Conc<Offset>) =>
        T.gen(function* (_) {
          const parse = P.for(messages)['|>'](S.condemnException)

          const currentRef = yield* _(Ref.make(HM.makeDefault<`${string}-${number}`, Offset>()))

          const delayRef = yield* _(Ref.make(0))

          for (const offset of offsets) {
            yield* _(Ref.update_(currentRef, HM.set(`${offset.domain}-${offset.shard}` as const, offset)))
          }

          const poll: T.IO<IOEnv, M.Maybe<never>, C.Conc<QueryResultRow>> = pipe(
            T.cross_(
              Ref.get(currentRef),
              Ref.getAndUpdate_(delayRef, () => opts?.delay ?? 1_000)
            ),
            T.tap(([_co, delay]) => (delay > 0 ? T.sleep(delay) : T.unit())),
            T.chain(([co, _delay]) =>
              T.foreachC_(HM.values(co), (o) =>
                pipe(
                  cli.query(
                    'SELECT * FROM "event_journal" WHERE "domain" = $1::text AND "shard" = $2::integer AND "shard_sequence" > $3::integer ORDER BY "shard_sequence" ASC LIMIT $4::integer',
                    [o.domain, o.shard, o.sequence, opts?.perPage ?? 25]
                  ),
                  T.map((_) => _.rows),
                  T.tap((_) => {
                    if (_.length > 0) {
                      const last = _[_.length - 1]

                      return Ref.update_(
                        currentRef,
                        HM.set(
                          `${last['domain']}-${last['shard']}` as const,
                          new Offset({
                            domain: last['domain'],
                            shard: last['shard'],
                            sequence: last['shard_sequence']
                          })
                        )
                      )
                    }
                    return T.unit()
                  }),
                  T.map(C.from)
                )
              )
            ),
            T.map(C.flatten)
          )

          return pipe(
            ST.repeatIOChunkMaybe(poll),
            ST.mapIO((row) =>
              pipe(
                parse(row['event']['event']),
                T.map(
                  (event) =>
                    new Event({
                      event,
                      offset: new Offset({
                        domain: row['domain'],
                        shard: row['shard'],
                        sequence: row['shard_sequence']
                      })
                    })
                )
              )
            )
          )
        })['|>'](ST.unwrap)

    const setup: T.IO<Has<ShardContext>, never, void> = cli.transaction(
      T.gen(function* (_) {
        const { domain, shards } = yield* _(ShardContext)

        const { rows } = yield* _(cli.query('SELECT * FROM "domain_journal" WHERE "domain" = $1::text', [domain]))

        if (rows.length > 0) {
          const current = rows[0]['shards'] as number

          if (current !== shards) {
            // TODO(mike): proper error
            return yield* _(T.halt(new Error('sharding cannot be changed')))
          }

          return
        }

        yield* _(
          cli.query('INSERT INTO "domain_journal" ("domain", "shards") VALUES($1::text, $2::integer)', [domain, shards])
        )

        yield* _(
          T.foreach_(C.range(1, shards), (i) =>
            cli.query(
              'INSERT INTO "shard_journal" ("domain", "shard", "sequence") VALUES($1::text, $2::integer, 0) ON CONFLICT ("domain","shard") DO NOTHING',
              [domain, i]
            )
          )
        )
      })
    )

    const transaction: (
      persistenceId: string
    ) => <R, E, A>(effect: T.IO<R, E, A>) => T.IO<R & Has<ShardContext>, E, A> = () => cli.transaction

    const get: (persistenceId: string) => T.IO<
      Has<ShardContext>,
      never,
      M.Maybe<{
        persistenceId: string
        shard: number
        state: unknown
        event_sequence: number
      }>
    > = (persistenceId) =>
      pipe(
        computeShardForId(persistenceId),
        T.chain((shard) =>
          cli.query(
            `SELECT * FROM "state_journal" WHERE "persistence_id" = '${persistenceId}' AND "shard" = $1::integer`,
            [shard]
          )
        ),
        T.map((res) =>
          pipe(
            M.fromNullable(res.rows?.[0]),
            M.map((row) => ({
              persistenceId: row.actor_name,
              shard: row.shard,
              state: row['state'],
              event_sequence: row.event_sequence
            }))
          )
        )
      )

    const events: (
      persistenceId: string,
      from: number,
      size: number
    ) => T.IO<
      Has<ShardContext>,
      never,
      C.Conc<{
        persistenceId: string
        domain: string
        shard: number
        shardSequence: number
        event: unknown
        eventSequence: number
      }>
    > = (persistenceId, from, size) =>
      pipe(
        computeShardForId(persistenceId),
        T.chain((shard) =>
          cli.query(
            `SELECT * FROM "event_journal" WHERE "persistence_id" = '${persistenceId}' AND "event_sequence" > $1::integer ANS "shard" = $3::integer ORDER BY "event_sequence" ASC LIMIT $2::integer`,
            [from, size, shard]
          )
        ),
        T.map((res) =>
          pipe(
            C.from(res.rows),
            C.map((row) => ({
              persistenceId: row.actor_name,
              domain: row.domain,
              shard: row.shard,
              shardSequence: row.shard_sequence,
              event: row['event'],
              eventSequence: row.event_sequence
            }))
          )
        )
      )

    const set: (
      persistenceId: string,
      value: unknown,
      event_sequence: number
    ) => T.IO<Has<ShardContext>, never, void> = (persistenceId, value, event_sequence) =>
      pipe(
        computeShardForId(persistenceId),
        T.chain((shard) =>
          cli.query(
            `INSERT INTO "state_journal" ("persistence_id", "shard", "state", "event_sequence") VALUES('${persistenceId}', $2::integer, $1::jsonb, $3::integer) ON CONFLICT ("persistence_id") DO UPDATE SET "state" = $1::jsonb, "event_sequence" = $3::integer`,
            [JSON.stringify(value), shard, event_sequence]
          )
        ),
        T.asUnit
      )

    const sequenceForShard = (persistenceId: string) =>
      pipe(
        computeShardForId(persistenceId),
        T.chain((shard) =>
          T.asksServiceIO(ShardContext)((_) =>
            cli.query('SELECT * FROM "shard_journal" WHERE "domain" = $1::text AND "shard" = $2::integer FOR UPDATE', [
              _.domain,
              shard
            ])
          )
        ),
        T.map((r) => r.rows[0]['sequence'] as number)
      )

    const emit: (
      persistenceId: string,
      events: C.Conc<{ value: unknown, eventSequence: number }>
    ) => T.IO<Has<ShardContext>, never, void> = (persistenceId, events) =>
      events.length > 0
        ? T.asksServiceIO(ShardContext)(({ domain }) =>
            pipe(
              T.cross_(computeShardForId(persistenceId), sequenceForShard(persistenceId)),
              T.chain(([shard, shard_sequence]) =>
                pipe(
                  T.foreach_(
                    C.zipWithIndexOffset_(events, shard_sequence + 1),
                    ([{ eventSequence, value }, shard_sequence_i]) =>
                      cli.query(
                        `INSERT INTO "event_journal" ("persistence_id", "shard", "event", "event_sequence", "shard_sequence", "domain") VALUES('${persistenceId}', $2::integer, $1::jsonb, $3::integer, $4::integer, $5::text)`,
                        [JSON.stringify(value), shard, eventSequence, shard_sequence_i, domain]
                      )
                  ),
                  T.chain(() =>
                    cli.query(
                      'UPDATE "shard_journal" SET "sequence" = $3::integer WHERE "domain" = $1::text AND "shard" = $2::integer',
                      [domain, shard, shard_sequence + events.length]
                    )
                  )
                )
              ),
              T.asUnit
            )
          )
        : T.unit()

    return identity<Persistence>({
      transaction,
      get,
      set,
      emit,
      events,
      setup,
      eventStream
    })
  })
)
