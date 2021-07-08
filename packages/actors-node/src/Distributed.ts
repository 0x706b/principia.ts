import type { ActorRef } from '@principia/actors/ActorRef'
import type { ActorSystemException } from '@principia/actors/exceptions'
import type * as Msg from '@principia/actors/Message'
import type { IOEnv } from '@principia/base/IOEnv'

import '@principia/base/Operators'

import * as A from '@principia/actors/Actor'
import * as AS from '@principia/actors/ActorSystem'
import * as SUP from '@principia/actors/Supervisor'
import * as C from '@principia/base/Chunk'
import { Clock } from '@principia/base/Clock'
import { pipe } from '@principia/base/function'
import * as HM from '@principia/base/HashMap'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Managed'
import * as O from '@principia/base/Option'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import * as Sc from '@principia/base/Schedule'
import * as STM from '@principia/base/stm/STM'
import * as TRef from '@principia/base/stm/TRef'
import { KeeperClient } from '@principia/keeper'

import { Cluster } from './Cluster'
import { ShardConfig } from './Transactional'

export interface Distributed<N extends string, F1 extends Msg.AnyMessage> {
  name: N
  messageToId: (_: { name: N, message: F1 }) => string
  actor: ActorRef<F1>
  runningMapRef: Ref.URef<HM.HashMap<string, ActorRef<F1>>>
}

export function runner<R, E, R2, E2, F1 extends Msg.AnyMessage>(
  factory: (id: string) => I.IO<R, E, ActorRef<F1>>,
  postPassivation: (
    id: string,
    ref: Ref.URef<
      HM.HashMap<
        string,
        TRef.TRef<{
          listeners: number
          closing: boolean
        }>
      >
    >
  ) => I.IO<R2, E2, void>,
  opts?: { passivateAfter?: number }
) {
  return M.gen(function* (_) {
    const runningMapRef = yield* _(
      pipe(
        Ref.make(HM.makeDefault<string, ActorRef<F1>>()),
        M.bracket((ref) =>
          pipe(
            Ref.get(ref),
            I.chain((hm) => I.foreachUnitPar_(hm, ([_, r]) => pipe(r.stop, I.orDie)))
          )
        )
      )
    )

    const gatesRef = yield* _(Ref.make(HM.makeDefault<string, TRef.TRef<{ listeners: number, closing: boolean }>>()))

    const statsRef = yield* _(Ref.make(HM.makeDefault<string, { inFlight: number, last: number }>()))

    function proxy(path: string, ref: ActorRef<F1>): ActorRef<F1>['ask'] {
      return (m) =>
        pipe(
          I.gen(function* (_) {
            const last = yield* _(Clock.currentTime)
            yield* _(
              Ref.update_(statsRef, (hm) => {
                const stat = HM.get_(hm, path)
                if (O.isSome(stat)) {
                  return HM.set_(hm, path, {
                    inFlight: stat.value.inFlight + 1,
                    last
                  })
                }
                return HM.set_(hm, path, { inFlight: 1, last })
              })
            )
          }),
          I.bracket(
            () => ref.ask(m),
            () =>
              I.gen(function* (_) {
                const last = yield* _(Clock.currentTime)
                yield* _(
                  Ref.update_(statsRef, (hm) => {
                    const stat = HM.get_(hm, path)
                    if (O.isSome(stat)) {
                      return HM.set_(hm, path, {
                        inFlight: stat.value.inFlight - 1,
                        last
                      })
                    }
                    return HM.set_(hm, path, { inFlight: 0, last })
                  })
                )
              })
          )
        )
    }

    function passivate(now: number, _: C.Chunk<string>, passivateAfter: number) {
      return I.foreachUnitPar_(_, (path) =>
        pipe(
          I.gen(function* (_) {
            const map  = yield* _(Ref.get(gatesRef))
            const gate = HM.get_(map, path)

            if (O.isSome(gate)) {
              yield* _(
                STM.commit(
                  pipe(
                    TRef.get(gate.value),
                    STM.tap((_) => STM.check(_.listeners === 0 && _.closing === false)),
                    STM.chain((_) =>
                      TRef.set_(gate.value, {
                        closing: true,
                        listeners: _.listeners
                      })
                    )
                  )
                )
              )
              return gate.value
            } else {
              const gate = yield* _(TRef.makeCommit({ listeners: 0, closing: true }))
              yield* _(Ref.update_(gatesRef, HM.set(path, gate)))
              return gate
            }
          }),
          I.bracket(
            () =>
              I.gen(function* (_) {
                const runningMap = yield* _(Ref.get(runningMapRef))
                const running    = HM.get_(runningMap, path)
                if (O.isSome(running)) {
                  const statsMap = yield* _(Ref.get(statsRef))
                  const stats    = HM.get_(statsMap, path)

                  if (O.isSome(stats)) {
                    if (stats.value.inFlight === 0 && now - stats.value.last >= passivateAfter) {
                      const rem = yield* _(running.value.stop)
                      if (rem.length > 0) {
                        yield* _(I.die('Bug, we lost messages'))
                      }
                      yield* _(Ref.update_(statsRef, HM.remove(path)))
                      yield* _(Ref.update_(runningMapRef, HM.remove(path)))
                    }
                  }
                }
              }),
            (g) =>
              pipe(
                STM.commit(
                  TRef.update_(g, (_) => ({
                    closing: false,
                    listeners: _.listeners
                  }))
                ),
                I.crossSecond(postPassivation(path, gatesRef))
              )
          )
        )
      )
    }

    if (opts?.passivateAfter != null) {
      const passivateAfter = opts?.passivateAfter
      yield* _(
        I.forkManaged(
          I.repeat(Sc.windowed(opts.passivateAfter))(
            I.gen(function* (_) {
              const now         = yield* _(Clock.currentTime)
              const stats       = yield* _(Ref.get(statsRef))
              const toPassivate = C.builder<string>()

              for (const [k, v] of stats) {
                if (v.inFlight === 0 && now - v.last >= passivateAfter) {
                  toPassivate.append(k)
                }
              }

              yield* _(passivate(now, toPassivate.result(), passivateAfter))
            })
          )
        )
      )
    }

    return {
      runningMapRef,
      statsRef,
      gatesRef,
      use:
        (path: string) =>
        <R2, E2, A2>(body: (ref: ActorRef<F1>['ask']) => I.IO<R2, E2, A2>) =>
          pipe(
            I.gen(function* (_) {
              const map  = yield* _(Ref.get(gatesRef))
              const gate = HM.get_(map, path)

              if (O.isSome(gate)) {
                yield* _(
                  STM.commit(
                    pipe(
                      TRef.get(gate.value),
                      STM.tap((_) => STM.check(_.closing === false)),
                      STM.chain((_) =>
                        TRef.set_(gate.value, {
                          closing: _.closing,
                          listeners: _.listeners + 1
                        })
                      )
                    )
                  )
                )
                return gate.value
              } else {
                const gate = yield* _(TRef.makeCommit({ listeners: 1, closing: false }))
                yield* _(Ref.update_(gatesRef, HM.set(path, gate)))
                return gate
              }
            }),
            I.bracket(
              () =>
                I.gen(function* (_) {
                  const isRunning = HM.get_(yield* _(Ref.get(runningMapRef)), path)
                  if (O.isSome(isRunning)) {
                    return yield* _(body(proxy(path, isRunning.value)))
                  }
                  const ref = yield* _(factory(path))
                  yield* _(Ref.update_(runningMapRef, HM.set(path, ref)))
                  return yield* _(body(proxy(path, ref)))
                }),
              (g) =>
                STM.commit(
                  TRef.update_(g, (_) => ({
                    closing: _.closing,
                    listeners: _.listeners - 1
                  }))
                )
            )
          )
    }
  })
}

function electionFromNameAndId(name: string, id: string) {
  return `distributed-${name}-${id}`
}

export const distributed = <R, S, F1 extends Msg.AnyMessage>(
  stateful: A.AbstractStateful<R, S, F1>,
  messageToId: (_: F1) => string,
  opts?: {
    passivateAfter?: number
    shards?: number
  }
) =>
  new A.ActorProxy(stateful.messages, (queue, context, initial: (id: string) => S) =>
    I.give(opts?.shards ? ShardConfig.of({ shards: opts.shards }) : {})(
      M.useNow(
        M.gen(function* (_) {
          const cluster = yield* _(Cluster)
          const cli     = yield* _(KeeperClient)

          const name = yield* _(
            pipe(
              AS.resolvePath(context.address)['|>'](I.orDie),
              I.map(([_, __, ___, actorName]) => actorName.substr(1))
            )
          )

          const leadersRef = yield* _(
            Ref.make(
              HM.makeDefault<
                string,
                (
                  f: (ask: ActorRef<F1>['ask']) => I.IO<R & IOEnv, ActorSystemException, void>
                ) => I.IO<R & IOEnv, ActorSystemException, void>
              >()
            )
          )

          const leadersNodeRef = yield* _(Ref.make<HM.HashMap<string, string>>(HM.makeDefault()))

          const gate = yield* _(TRef.makeCommit(true))

          const factory = yield* _(
            runner(
              (id) => context.make<R, S, F1>(id, SUP.none, stateful, initial(id)),
              (id, ref) =>
                I.gen(function* (_) {
                  yield* _(
                    STM.commit(
                      pipe(
                        TRef.get(gate),
                        STM.chain(STM.check),
                        STM.chain(() => TRef.set_(gate, false))
                      )
                    )
                  )
                  const election   = electionFromNameAndId(name, id)
                  const leaderMap  = yield* _(Ref.get(leadersNodeRef))
                  const leaderPath = HM.get_(leaderMap, election)
                  if (O.isSome(leaderPath)) {
                    yield* _(cluster.leave(leaderPath.value))
                  }
                  yield* _(Ref.update_(leadersRef, HM.remove(election)))
                  yield* _(Ref.update_(leadersNodeRef, HM.remove(election)))
                  yield* _(Ref.update_(ref, HM.remove(id)))
                  yield* _(STM.commit(TRef.set_(gate, true)))
                }),
              opts
            )
          )

          while (1) {
            const all = yield* _(Q.takeBetween_(queue, 1, 100))

            yield* _(
              STM.commit(
                pipe(
                  TRef.get(gate),
                  STM.chain(STM.check),
                  STM.chain(() => TRef.set_(gate, false))
                )
              )
            )

            const slots: Record<string, C.Chunk<A.PendingMessage<F1>>> = {}

            for (const r of all) {
              const id = messageToId(r[0])
              if (!slots[id]) {
                slots[id] = C.empty()
              }
              slots[id] = C.append_(slots[id], r)
            }

            yield* _(
              M.foreachUnitPar_(Object.keys(slots), (id) =>
                M.foreachUnit_(slots[id], ([a, p]) => {
                  return M.gen(function* (_) {
                    const leaders  = yield* _(Ref.get(leadersRef))
                    const election = electionFromNameAndId(name, id)
                    const cached   = HM.get_(leaders, election)

                    if (O.isSome(cached)) {
                      yield* _(cached.value((ask) => ask(a)['|>'](I.fulfill(p))['|>'](I.asUnit)))
                    } else {
                      yield* _(cluster.init(election))

                      const leader = yield* _(cluster.leaderId(election))

                      // there is a leader
                      if (O.isSome(leader)) {
                        if (leader.value === cluster.nodeId) {
                          // we are the leader
                          yield* _(
                            Ref.update_(
                              leadersRef,
                              HM.set(election, (f) => factory.use(id)((ask) => f((a) => ask(a))))
                            )
                          )
                          yield* _(factory.use(id)((ask) => ask(a)['|>'](I.fulfill(p))))
                        } else {
                          // we are not the leader, use cluster
                          const { host, port } = yield* _(cluster.memberHostPort(leader.value))
                          const recipient      = `zio://${context.actorSystem.actorSystemName}@${host}:${port}/${name}/${id}`
                          const act            = yield* _(context.select(recipient))
                          yield* _(
                            Ref.update_(
                              leadersRef,
                              HM.set(election, (f) => f((a) => act.ask(a)))
                            )
                          )
                          yield* _(
                            pipe(
                              cluster.watchLeader(election),
                              I.chain(() => Ref.update_(leadersRef, HM.remove(election))),
                              I.fork
                            )
                          )
                          yield* _(act.ask(a)['|>'](I.fulfill(p)))
                        }
                      } else {
                        // there is no leader, attempt to self elect
                        const selfNode = yield* _(cluster.join(election))

                        const leader = yield* _(cluster.leaderId(election))

                        // this should never be the case
                        if (O.isNone(leader)) {
                          yield* _(I.die('cannot elect a leader'))
                        } else {
                          // we got the leadership
                          if (leader.value === cluster.nodeId) {
                            yield* _(
                              Ref.update_(
                                leadersRef,
                                HM.set(election, (f) => factory.use(id)((ask) => f((a) => ask(a))))
                              )
                            )
                            yield* _(Ref.update_(leadersNodeRef, HM.set(election, selfNode)))
                            yield* _(factory.use(id)((ask) => ask(a)['|>'](I.fulfill(p))))
                          } else {
                            // someone else got the leadership first
                            yield* _(cli.remove(selfNode))

                            const { host, port } = yield* _(cluster.memberHostPort(leader.value))
                            const recipient      = `zio://${context.actorSystem.actorSystemName}@${host}:${port}/${name}/${id}`
                            const act            = yield* _(context.select(recipient))
                            yield* _(
                              Ref.update_(
                                leadersRef,
                                HM.set(election, (f) => f((a) => act.ask(a)))
                              )
                            )
                            yield* _(
                              pipe(
                                cluster.watchLeader(election),
                                I.chain(() => Ref.update_(leadersRef, HM.remove(election))),
                                I.fork
                              )
                            )
                            yield* _(act.ask(a)['|>'](I.fulfill(p)))
                          }
                        }
                      }
                    }
                  })
                })
              )
            )

            yield* _(STM.commit(TRef.set_(gate, true)))
          }

          return yield* _(I.never)
        })
      )
    )
  )
