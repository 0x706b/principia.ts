import type { ActorRef } from '@principia/actors/ActorRef'
import type { ActorSystemException } from '@principia/actors/exceptions'
import type * as AM from '@principia/actors/Message'
import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IO/IOEnv'
import type * as K from '@principia/keeper'

import * as A from '@principia/actors/Actor'
import { ActorRefRemote } from '@principia/actors/ActorRef'
import * as AS from '@principia/actors/ActorSystem'
import * as Su from '@principia/actors/Supervisor'
import { pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as Ma from '@principia/base/IO/Managed'
import * as Q from '@principia/base/IO/Queue'
import * as STM from '@principia/base/IO/stm/STM'
import * as TRef from '@principia/base/IO/stm/TRef'
import * as M from '@principia/base/Maybe'

import { Cluster } from './Cluster'

export function makeSingleton<R, S, F1 extends AM.AnyMessage>(
  stateful: A.AbstractStateful<R, S, F1>
): A.ActorProxy<Has<Cluster> & IOEnv & R, S, F1, K.ZooError | ActorSystemException>
export function makeSingleton<R, S, F1 extends AM.AnyMessage, R3, E3>(
  stateful: A.AbstractStateful<R, S, F1>,
  side: (self: ActorRef<F1>) => T.IO<R3, E3, never>
): A.ActorProxy<Has<Cluster> & IOEnv & R & R3, S, F1, E3 | K.ZooError | ActorSystemException>
export function makeSingleton<R, S, F1 extends AM.AnyMessage, R3, E3>(
  stateful: A.AbstractStateful<R, S, F1>,
  side?: (self: ActorRef<F1>) => T.IO<R3, E3, never>
): A.ActorProxy<Has<Cluster> & IOEnv & R & R3, S, F1, E3 | K.ZooError | ActorSystemException> {
  return new A.ActorProxy(stateful.messages, (queue, context, initial: S) =>
    Ma.useNow(
      Ma.gen(function* (_) {
        const cluster = yield* _(Cluster)

        const name = yield* _(
          pipe(
            AS.resolvePath(context.address)['|>'](T.orHalt),
            T.map(([_, __, ___, actorName]) => actorName.substr(1))
          )
        )

        const election = `singleton-${name}`

        yield* _(cluster.init(election))

        yield* _(
          pipe(
            cluster.join(election),
            Ma.bracket((p) => cluster.leave(p)['|>'](T.orHalt))
          )
        )

        const gate = yield* _(TRef.makeCommit(M.nothing<ActorRef<F1>>()))

        return yield* _(
          pipe(
            T.gen(function* (_) {
              while (1) {
                const [a, p] = yield* _(Q.take(queue))
                const ref    = (yield* _(
                  STM.commit(
                    pipe(
                      TRef.get(gate),
                      STM.tap((o) => STM.check(M.isJust(o)))
                    )
                  )
                )) as M.Just<ActorRef<F1>>
                yield* _(ref.value.ask(a)['|>'](T.fulfill(p)))
              }

              return yield* _(T.never)
            }),
            T.race(
              cluster.runOnLeader(election)(
                Ma.gen(function* (_) {
                  const ref: ActorRef<F1> = yield* _(context.make('leader', Su.none, stateful, initial))

                  yield* _(
                    STM.commit(TRef.set_(gate, M.just(ref)))['|>'](
                      Ma.bracket(() => STM.commit(TRef.set_(gate, M.nothing())))
                    )
                  )

                  return yield* _(side ? side(ref) : T.never)
                })['|>'](Ma.useNow),
                (leader) =>
                  Ma.gen(function* (_) {
                    const { host, port } = yield* _(cluster.memberHostPort(leader))
                    const recipient      = `zio://${context.actorSystem.actorSystemName}@${host}:${port}/${name}`
                    const ref            = new ActorRefRemote<F1>(recipient, context.actorSystem)

                    yield* _(
                      STM.commit(TRef.set_(gate, M.just(ref)))['|>'](
                        Ma.bracket(() => STM.commit(TRef.set_(gate, M.nothing())))
                      )
                    )

                    return yield* _(T.never)
                  })['|>'](Ma.useNow)
              )
            )
          )
        )
      })
    )
  )
}
