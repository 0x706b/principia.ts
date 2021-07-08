import type { _A } from '@principia/base/util/types'

import { ActorSystemTag, LiveActorSystem } from '@principia/actors/ActorSystem'
import * as AM from '@principia/actors/Message'
import * as SUP from '@principia/actors/Supervisor'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
import * as O from '@principia/base/Option'
import { show } from '@principia/base/Structural'
import { matchTag_ } from '@principia/base/util/match'
import * as Z from '@principia/keeper'
import * as PG from '@principia/pg'
import * as S from '@principia/schema'

import * as Cluster from '../src/Cluster'
import * as D from '../src/Distributed'
import { RemotingExpress, StaticRemotingExpressConfig } from '../src/Remote'
import { LiveStateStorageAdapter, transactional } from '../src/Transactional'
import { TestPG } from './pg'
import { TestKeeperConfig } from './zookeeper'

const AppLayer = LiveActorSystem('EffectTsActorsDemo')
  ['>+>'](RemotingExpress)
  ['<<<'](StaticRemotingExpressConfig({ host: '127.0.0.1', port: 34322 }))
  ['>+>'](Cluster.LiveCluster)
  ['<+<'](Z.LiveKeeperClient['<<<'](TestKeeperConfig))
  ['<+<'](LiveStateStorageAdapter['<+<'](PG.LivePG['<<<'](TestPG)))

class User extends S.Model<User>()(S.properties({ _tag: S.prop(S.tag('User')), id: S.prop(S.string) })) {}

class UserNotFound extends S.Model<UserNotFound>()(S.properties({ _tag: S.prop(S.tag('UserNotFound')) })) {}

class UserAlreadyCreated extends S.Model<UserAlreadyCreated>()(
  S.properties({ _tag: S.prop(S.tag('UserAlreadyCreated')) })
) {}

class Get extends AM.Message('Get', S.properties({ id: S.prop(S.string) }), S.taggedUnion({ User, UserNotFound })) {}

class Create extends AM.Message(
  'Create',
  S.properties({ id: S.prop(S.string) }),
  S.taggedUnion({ User, UserAlreadyCreated })
) {}

const Message = AM.messages(Get, Create)
type Message = AM.TypeOf<typeof Message>

class Initial extends S.Model<Initial>()(S.properties({ _tag: S.prop(S.tag('Initial')) })) {}

const userHandler = transactional(
  Message,
  S.taggedUnion({ Initial, User }),
  O.some(S.string)
)(
  ({ event, state }) =>
    (msg) =>
      T.gen(function* (_) {
        switch (msg._tag) {
          case 'Get': {
            const maybeUser = matchTag_(yield* _(state.get), {
              Initial: () => new UserNotFound({}),
              User: (_) => _
            })

            return yield* _(msg.handle(T.succeed(maybeUser)))
          }
          case 'Create': {
            if ((yield* _(state.get))._tag !== 'Initial') {
              return yield* _(msg.handle(T.succeed(new UserAlreadyCreated({}))))
            }
            yield* _(event.emit('create-user'))
            yield* _(event.emit('setup-user'))
            const user = new User({ id: msg.payload.id })
            yield* _(state.set(user))
            return yield* _(msg.handle(T.succeed(user)))
          }
        }
      })
)

export const makeUsersService = M.gen(function* (_) {
  const system = yield* _(ActorSystemTag)

  const users = yield* _(
    system.make(
      'users',
      SUP.none,
      D.distributed(userHandler, ({ id }) => id, {
        passivateAfter: 2_000,
        shards: 3
      }),
      () => new Initial({})
    )
  )

  return {
    users
  }
})

export interface UsersService extends _A<typeof makeUsersService> {}
export const UsersService     = tag<UsersService>()
export const LiveUsersService = L.fromManaged(UsersService)(makeUsersService)

const program = T.gen(function* (_) {
  const { users } = yield* _(UsersService)
  console.log(yield* _(users.ask(new Get({ id: 'mike' }))))
  console.log(yield* _(users.ask(new Create({ id: 'mike' }))))
  console.log(yield* _(users.ask(new Get({ id: 'mike' }))))
  console.log(yield* _(users.ask(new Get({ id: 'mike-2' }))))
  console.log(yield* _(users.ask(new Create({ id: 'mike' }))))
  console.log((yield* _(PG.query('SELECT * FROM state_journal'))).rows)
  console.log((yield* _(PG.query('SELECT * FROM event_journal'))).rows)

  yield* _(T.sleep(2_000))
})

pipe(program, T.giveSomeLayer(AppLayer['>+>'](LiveUsersService)), T.runPromiseExit).then((ex) => {
  if (ex._tag === 'Failure') {
    console.error(show(ex.cause))
  }
})
