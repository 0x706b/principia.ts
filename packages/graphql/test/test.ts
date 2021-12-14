import '@principia/base/Operators'

import { flow, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as HM from '@principia/base/HashMap'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as O from '@principia/base/Option'
import * as Ref from '@principia/base/Ref'
import * as Sc from '@principia/base/Schedule'
import * as S from '@principia/base/Stream'
import * as K from '@principia/koa'
import * as M from '@principia/model'
import { runMain } from '@principia/node/Runtime'

import { DefaultGQLInterpreters } from '../src/schema'
import { makeGraphQl } from '../src/server/koa'

const gql = makeGraphQl(DefaultGQLInterpreters)(
  {
    subscriptions: { onConnect: () => I.effectTotal(() => console.log('Connected')) },
    playground: {
      subscriptionEndpoint: 'ws://localhost:4000'
    }
  },
  ({ ctx }) => I.succeed(ctx)
)

interface UserService {
  readonly getUser: (id: number) => I.UIO<Student | Employee | UserNotFoundError>
  readonly putUser: (user: Student | Employee) => I.FIO<Error, void>
}
const UserService = tag<UserService>()

interface User {
  _tag: string
  name: string
  id: number
}

interface Employee {
  _tag: 'Employee'
  name: string
  id: number
  position: string
}

interface Student {
  _tag: 'Student'
  name: string
  id: number
  major: string
}

const IUser = gql.interface(
  'IUser',
  (t) => ({
    _tag: t.string(),
    name: t.string(),
    id: t.int()
  }),
  ({ obj }) => obj._tag
)

const User = gql.object<User>()('User', (t) => ({}), { implements: [IUser] })

const Employee = gql.object<Employee>()(
  'Employee',
  (t) => ({
    position: t.string()
  }),
  { implements: [IUser] }
)

const Student = gql.object<Student>()(
  'Student',
  (t) => ({
    major: t.string()
  }),
  { implements: [IUser] }
)

interface UserNotFoundError {
  _tag: 'UserNotFoundError'
  message: string
}

const UserNotFoundError = gql.object<UserNotFoundError>()('UserNotFoundError', (t) => ({
  _tag: t.string(),
  message: t.string()
}))

const UserInput = gql.input('UserInput', (t) => ({
  id: t.intArg(),
  name: t.stringArg()
}))

const EmployeeInput = gql.input('EmployeeInput', (t) => ({
  ...UserInput.fields,
  position: t.stringArg()
}))

const StudentInput = gql.input('StudentInput', (t) => ({
  ...UserInput.fields,
  major: t.stringArg()
}))

const UserResponse = gql.union(Employee, Student, UserNotFoundError)('UserResponse', ({ obj }) => obj._tag)

const Query = gql.query((t) => ({
  getUser: t.field({
    type: t.union(() => UserResponse, { nullable: false, list: false }),
    args: {
      id: t.intArg()
    },
    resolve: ({ args }) => I.asksServiceM(UserService)((_) => _.getUser(args.id))
  })
}))

const Mutation = gql.mutation((t) => ({
  putEmployee: t.field({
    type: t.boolean(),
    args: {
      user: t.objectArg(() => EmployeeInput)
    },
    resolve: ({ args }) =>
      I.accessServiceIO(UserService)((_) => _.putUser({ _tag: 'Employee', ...args.user }))['|>'](
        I.match(
          (_) => false,
          () => true
        )
      )
  }),
  putStudent: t.field({
    type: t.boolean(),
    args: {
      user: t.objectArg(() => StudentInput)
    },
    resolve: ({ args }) =>
      I.accessServiceIO(UserService)((_) => _.putUser({ _tag: 'Student', ...args.user }))['|>'](
        I.match(
          (_) => false,
          () => true
        )
      )
  })
}))

const Subscription = gql.subscription((t) => ({
  numbers: t.subscription({
    type: t.float(),
    resolve: {
      subscribe: () => S.iterate(0, (n) => n + 1)['|>'](S.schedule(Sc.spaced(1000))),
      resolve: ({ result }) => I.succeed(result)
    }
  })
}))

const schemaParts = gql.generateSchema(
  Query,
  Mutation,
  Subscription,
  User,
  Student,
  Employee,
  StudentInput,
  EmployeeInput,
  IUser,
  UserNotFoundError,
  UserResponse
)

const liveGraphQl = gql.live({ schemaParts })

const LiveUserService = L.fromIO(UserService)(
  I.gen(function* (_) {
    const db      = yield* _(Ref.make<HM.HashMap<number, Student | Employee>>(HM.makeDefault()))
    const putUser = (user: Student | Employee) =>
      db.get['|>'](I.map(HM.get(user.id)))['|>'](
        I.chain(
          O.match(
            () => Ref.update_(db, HM.set(user.id, user)),
            (_) => I.fail(new Error('User already exists'))
          )
        )
      )

    const getUser = (id: number): I.UIO<Student | Employee | UserNotFoundError> =>
      db.get['|>'](
        I.map(
          flow(
            HM.get(id),
            O.getOrElse(() => ({ _tag: 'UserNotFoundError' as const, message: `User with id ${id} not found` }))
          )
        )
      )

    return {
      getUser,
      putUser
    }
  })
)

I.never['|>'](I.giveLayer(liveGraphQl))
  ['|>'](I.giveLayer(K.Koa('localhost', 4000)['<<<'](K.KoaRouterConfig.empty)))
  ['|>'](I.giveLayer(LiveUserService))
  ['|>']((x) => runMain(x))
