import type { IOEnv } from '@principia/base/IOEnv'
import type { _A } from '@principia/base/util/types'

import { ActorProxy } from '@principia/actors/Actor'
import { ActorRefRemote } from '@principia/actors/ActorRef'
import * as AS from '@principia/actors/ActorSystem'
import { Message, messages } from '@principia/actors/Message'
import * as SUP from '@principia/actors/Supervisor'
import { Tagged } from '@principia/base/Case'
import * as Chunk from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as OT from '@principia/base/MaybeT'
import * as Ord from '@principia/base/Ord'
import * as OSet from '@principia/base/OrderedSet'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import * as Str from '@principia/base/string'
import * as Th from '@principia/base/These'
import * as K from '@principia/keeper'
import * as S from '@principia/schema'
import * as G from '@principia/schema/Guard'

export const EO = pipe(OT.getMaybeT(T.Monad), (Monad) => ({
  map: Monad.map,
  chain: Monad.chain,
  chainT:
    <R2, E2, A, B>(f: (a: A) => T.IO<R2, E2, B>) =>
    <R, E>(fa: T.IO<R, E, M.Maybe<A>>): T.IO<R2 & R, E2 | E, M.Maybe<B>> =>
      Monad.chain_(fa, (a: A) => T.map_(f(a), M.just))
}))

export const ClusterSym = Symbol()

export class HostPort extends Tagged('HostPort')<{
  readonly host: string
  readonly port: number
}> {}

export class ClusterException extends Tagged('ClusterException')<{
  readonly message: string
}> {}

export class ActorError extends Tagged('ActorError')<{
  readonly message: string
}> {}

export interface MemberIdBrand {
  readonly MemberIdBrand: unique symbol
}

export type MemberId = string & MemberIdBrand

export class Member extends S.Model<Member>()(
  S.properties({
    id: S.prop(S.string['|>'](S.brand<MemberId>()))
  })
) {}

const OrdMember = Ord.contramap_(Str.Ord, (m: Member) => m.id)

export class Members extends S.Model<Members>()(
  S.properties({
    members: S.prop(sortedSet(Member, OrdMember))
  })
) {}

export class GetMembers extends Message('GetMembers', S.properties({}), Members) {}
export class Init extends Message('Init', S.properties({}), S.properties({})) {}
export class Join extends Message(
  'Join',
  S.properties({
    id: S.prop(S.string['|>'](S.brand<MemberId>()))
  }),
  S.properties({})
) {}
export class Leave extends Message(
  'Leave',
  S.properties({
    id: S.prop(S.string['|>'](S.brand<MemberId>()))
  }),
  S.properties({})
) {}

export type Protocol = GetMembers | Join | Init | Leave

export function sortedSet<X extends S.AnyUS>(child: X, ord: Ord.Ord<S.TypeOf<X>>) {
  return S.chunk(child)['>>>'](
    pipe(
      S.identity<OSet.OrderedSet<S.TypeOf<X>>>()({
        [G.GuardSURI]: G.Guard(
          (u): u is OSet.OrderedSet<S.TypeOf<X>> => u instanceof OSet.OrderedSet && OSet.every_(u, G.for(child))
        )
      }),
      S.decode((u: Chunk.Chunk<S.TypeOf<X>>) => Th.right(Chunk.foldl_(u, OSet.make<S.TypeOf<X>>(ord), OSet.add_))),
      S.encode(Chunk.from)
    )
  )
}

export function fromChunk(u: Chunk.Chunk<Member>): OSet.OrderedSet<Member> {
  return Chunk.foldl_(u, OSet.make(OrdMember), OSet.add_)
}

export const makeCluster = Ma.gen(function* (_) {
  const cli        = yield* _(K.KeeperClient)
  const system     = yield* _(AS.ActorSystemTag)
  const clusterDir = `/cluster/${system.actorSystemName}`
  const membersDir = `${clusterDir}/members`

  if (M.isNothing(system.remoteConfig)) {
    return yield* _(T.halt(`actor system ${system.actorSystemName} doesn't support remoting`))
  }

  yield* _(cli.mkdir(membersDir))

  const prefix = `${membersDir}/member_`

  const nodePath = yield* _(
    cli
      .create(prefix, {
        mode: 'EPHEMERAL_SEQUENTIAL',
        data: Buffer.from(
          JSON.stringify({
            host: system.remoteConfig.value.host,
            port: system.remoteConfig.value.port
          })
        )
      })
      ['|>'](Ma.bracket((p) => cli.remove(p)['|>'](T.orHalt)))
  )

  const nodeId = `member_${nodePath.substr(prefix.length)}` as MemberId

  const membersRef = yield* _(
    Ref.make(
      new Members({
        members: OSet.add_(OSet.make(OrdMember), new Member({ id: nodeId }))
      })
    )
  )

  const ops = yield* _(Q.makeUnbounded<Join | Leave>())

  const isLeader = yield* _(Ref.make(false))

  const manager = yield* _(
    pipe(
      system.make(
        'cluster-manager',
        SUP.none,
        new ActorProxy(messages(GetMembers, Join, Init, Leave), (queue, context) =>
          T.gen(function* (_) {
            while (1) {
              const [m, p] = yield* _(Q.take(queue))

              switch (m._tag) {
                case 'Init': {
                  const members = Chunk.map_(
                    yield* _(cli.getChildren(membersDir)),
                    (s) => new Member({ id: s as MemberId })
                  )
                  yield* _(Ref.update_(membersRef, (x) => x.copy({ members: fromChunk(members) })))
                  yield* _(pipe(T.succeed({}), T.fulfill(p)))
                  break
                }
                case 'Join': {
                  yield* _(
                    Ref.update_(membersRef, (x) =>
                      x.copy({
                        members: OSet.add_(x.members, new Member({ id: m.id }))
                      })
                    )
                  )
                  if (yield* _(Ref.get(isLeader))) {
                    yield* _(Q.offer_(ops, m))
                    yield* _(
                      pipe(
                        cli.waitDelete(`${membersDir}/${m.id}`),
                        T.chain(() =>
                          pipe(
                            context.self,
                            T.chain((self) => self.ask(new Leave({ id: m.id })))
                          )
                        ),
                        T.fork
                      )
                    )
                  }
                  yield* _(pipe(T.succeed({}), T.fulfill(p)))
                  break
                }
                case 'Leave': {
                  yield* _(
                    Ref.update_(membersRef, (x) =>
                      x.copy({
                        members: OSet.filter_(x.members, (_) => _.id !== m.id)
                      })
                    )
                  )
                  if (yield* _(Ref.get(isLeader))) {
                    yield* _(Q.offer_(ops, m))
                  }
                  yield* _(pipe(T.succeed({}), T.fulfill(p)))
                  break
                }
                case 'GetMembers': {
                  yield* _(
                    pipe(
                      Ref.get(membersRef),
                      T.map((_) =>
                        _.copy({
                          members: _.members
                        })
                      ),
                      T.fulfill(p)
                    )
                  )
                  break
                }
              }
            }
            return yield* _(T.never)
          })
        ),
        {}
      ),
      Ma.bracket((s) => s.stop['|>'](T.orHalt))
    )
  )

  const runOnClusterLeader = <R, E, R2, E2>(
    onLeader: T.IO<R, E, never>,
    whileFollower: (leader: MemberId) => T.IO<R2, E2, never>
  ): T.IO<R & R2 & IOEnv, K.ZooError | E | E2, never> => {
    return T.gen(function* (_) {
      while (1) {
        const leader = Chunk.head(yield* _(cli.getChildren(membersDir)))
        if (M.isJust(leader)) {
          if (leader.value === nodeId) {
            yield* _(onLeader)
          } else {
            yield* _(T.race_(whileFollower(leader.value as MemberId), watchMember(leader.value as MemberId)))
          }
        } else {
          yield* _(T.sleep(5))
        }
      }
      return yield* _(T.never)
    })
  }

  yield* _(
    T.forkManaged(
      runOnClusterLeader(
        T.gen(function* (_) {
          yield* _(Ref.set_(isLeader, true))
          yield* _(manager.ask(new Init()))
          while (1) {
            const j = yield* _(Q.take(ops))
            if (j._tag === 'Join') {
              const { host, port } = yield* _(memberHostPort(j.id))
              const recipient      = `zio://${system.actorSystemName}@${host}:${port}/cluster-manager`
              const ref            = new ActorRefRemote<Protocol>(recipient, system)
              const { members }    = yield* _(Ref.get(membersRef))
              yield* _(
                T.foreach_(
                  OSet.filter_(members, (m) => m.id !== j.id),
                  (m) => ref.ask(new Join({ id: m.id }))
                )
              )
              yield* _(
                T.foreach_(
                  OSet.filter_(members, (m) => m.id !== j.id && m.id !== nodeId),
                  (m) =>
                    T.gen(function* (_) {
                      const { host, port } = yield* _(memberHostPort(m.id))
                      const recipient      = `zio://${system.actorSystemName}@${host}:${port}/cluster-manager`
                      const ref            = new ActorRefRemote<Protocol>(recipient, system)
                      yield* _(ref.ask(new Join({ id: j.id })))
                    })
                )
              )
            } else {
              const { members } = yield* _(Ref.get(membersRef))
              yield* _(
                T.foreach_(
                  OSet.filter_(members, (m) => m.id !== j.id && m.id !== nodeId),
                  (m) =>
                    T.gen(function* (_) {
                      const { host, port } = yield* _(memberHostPort(m.id))
                      const recipient      = `zio://${system.actorSystemName}@${host}:${port}/cluster-manager`
                      const ref            = new ActorRefRemote<Protocol>(recipient, system)
                      yield* _(ref.ask(new Leave({ id: j.id })))
                    })
                )
              )
            }
          }
          return yield* _(T.never)
        }),
        (l: MemberId) =>
          T.gen(function* (_) {
            yield* _(manager.ask(new Init()))
            const { host, port } = yield* _(memberHostPort(l))
            const recipient      = `zio://${system.actorSystemName}@${host}:${port}/cluster-manager`
            const ref            = new ActorRefRemote<Protocol>(recipient, system)

            yield* _(ref.ask(new Join({ id: nodeId })))

            return yield* _(T.never)
          })
      )
    )
  )

  const memberHostPort = yield* _(
    T.memoize(
      (member: MemberId): T.IO<unknown, K.ZooError, HostPort> =>
        pipe(
          cli.getData(`${membersDir}/${member}`),
          T.chain(
            M.match(
              () =>
                T.halt(
                  new ClusterException({
                    message: `cannot find metadata on path: ${membersDir}/${member}`
                  })
                ),
              T.succeed
            )
          ),
          T.map((b) => new HostPort(JSON.parse(b.toString('utf8'))))
        )
    )
  )

  const members = pipe(cli.getChildren(membersDir), T.chain(T.foreach((x) => memberHostPort(x as MemberId))))

  const init = (scope: string) => cli.mkdir(`${clusterDir}/elections/${scope}`)

  const join = (scope: string) =>
    cli.create(`${clusterDir}/elections/${scope}/w_`, {
      mode: 'EPHEMERAL_SEQUENTIAL',
      data: Buffer.from(nodeId)
    })

  const leave = (nodePath: string) => cli.remove(nodePath)

  const leaderPath = (scope: string) => pipe(cli.getChildren(`${clusterDir}/elections/${scope}`), T.map(Chunk.head))

  const leaderId = (scope: string) =>
    pipe(
      leaderPath(scope),
      EO.chain((s) => cli.getData(`${clusterDir}/elections/${scope}/${s}`)),
      EO.map((b) => b.toString('utf-8') as MemberId)
    )

  const runOnLeader =
    (scope: string) =>
    <R, E, R2, E2>(
      onLeader: T.IO<R, E, never>,
      whileFollower: (leader: MemberId) => T.IO<R2, E2, never>
    ): T.IO<R & R2, K.ZooError | E | E2, never> => {
      return T.gen(function* (_) {
        while (1) {
          const leader = yield* _(leaderId(scope))
          if (M.isNothing(leader)) {
            return yield* _(T.halt('cannot find a leader'))
          }
          if (leader.value === nodeId) {
            yield* _(onLeader)
          } else {
            yield* _(T.race_(watchLeader(scope), whileFollower(leader.value)))
          }
        }
        return yield* _(T.never)
      })
    }

  const watchMember = (member: MemberId) => cli.waitDelete(`${membersDir}/${member}`)

  const watchLeader = (scope: string) =>
    pipe(
      leaderPath(scope),
      T.chain((o) =>
        M.isNothing(o) ? T.halt('cannot find a leader') : cli.waitDelete(`${clusterDir}/elections/${scope}/${o.value}`)
      )
    )

  return {
    [ClusterSym]: ClusterSym,
    members,
    init,
    join,
    leave,
    nodeId,
    memberHostPort,
    leaderId,
    runOnLeader,
    watchLeader,
    watchMember,
    manager
  } as const
})

export interface Cluster extends _A<typeof makeCluster> {}
export const Cluster     = tag<Cluster>()
export const LiveCluster = L.fromManaged(Cluster)(makeCluster)
