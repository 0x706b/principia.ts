import type { Annotations } from '../Annotation'
import type { Live } from './Live'
import type { Clock } from '@principia/base/Clock'
import type { Fiber, FiberId, FiberStatus, RuntimeFiber } from '@principia/base/Fiber'
import type { Has } from '@principia/base/Has'
import type { HashMap } from '@principia/base/HashMap'
import type { HashSet } from '@principia/base/HashSet'
import type { IO, UIO } from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type { List } from '@principia/base/List'
import type { URef } from '@principia/base/Ref'
import type { URefM } from '@principia/base/RefM'

import * as C from '@principia/base/Chunk'
import { ClockTag, ProxyClock } from '@principia/base/Clock'
import { Console } from '@principia/base/Console'
import * as E from '@principia/base/Either'
import { eqFiberId } from '@principia/base/Fiber'
import * as Fi from '@principia/base/Fiber'
import { flow, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as HM from '@principia/base/HashMap'
import * as HS from '@principia/base/HashSet'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Li from '@principia/base/List'
import * as M from '@principia/base/Managed'
import * as N from '@principia/base/number'
import * as O from '@principia/base/Option'
import * as P from '@principia/base/Promise'
import * as Ref from '@principia/base/Ref'
import * as RefM from '@principia/base/RefM'
import { intersect } from '@principia/base/Struct'
import { tuple } from '@principia/base/tuple'
import { matchTag } from '@principia/base/util/match'

import { AnnotationsTag, fibers } from '../Annotation'
import { HashEqFiber, HashEqFiberId } from '../util'
import { LiveTag } from './Live'

export class Data {
  constructor(readonly duration: number, readonly sleeps: List<readonly [number, P.Promise<never, void>]>) {}
}

export class Sleep {
  constructor(readonly duration: number, readonly promise: P.Promise<never, void>, readonly fiberId: FiberId) {}
}

interface Start {
  readonly _tag: 'Start'
}

interface Pending {
  readonly _tag: 'Pending'
  readonly fiber: Fiber<never, void>
}

interface Done {
  readonly _tag: 'Done'
}

type WarningData = Start | Pending | Done

const Start: WarningData = { _tag: 'Start' }

const Pending = (fiber: Fiber<never, void>): WarningData => ({ _tag: 'Pending', fiber })

const Done: WarningData = { _tag: 'Done' }

const warning =
  'Warning: A test is using time, but is not advancing the test clock, ' +
  'which may result in the test hanging. Use TestClock.adjust to ' +
  'manually advance the time.'

export const TestClockTag = tag<TestClock>()

export class TestClock implements Clock {
  constructor(
    readonly clockState: URef<Data>,
    readonly live: Live,
    readonly annotations: Annotations,
    readonly warningState: URefM<WarningData>
  ) {}
  sleep = (ms: number) => {
    const self = this
    return I.gen(function* (_) {
      const promise = yield* _(P.make<never, void>())
      const wait    = yield* _(
        Ref.modify_(self.clockState, (data) => {
          const end = data.duration + ms
          if (end > data.duration) {
            return tuple(true, new Data(data.duration, Li.append_(data.sleeps, tuple(end, promise))))
          } else {
            return tuple(false, data)
          }
        })
      )
      yield* _(
        I.defer(() => {
          if (wait) {
            return self.warningStart['*>'](P.await(promise))
          } else {
            return P.succeed_(promise, undefined)['*>'](I.unit())
          }
        })
      )
    })
  }

  currentTime = this.clockState.get['<$>']((data) => data.duration)

  adjust(duration: number): UIO<void> {
    return this.warningDone['*>'](this.run((d) => d + duration))
  }

  setDate(date: Date): UIO<void> {
    return this.setTime(date.getTime())
  }

  setTime(time: number): UIO<void> {
    return this.warningDone['*>'](this.run((_) => time))
  }

  sleeps = this.clockState.get['<$>']((data) => Li.map_(data.sleeps, ([_]) => _))

  get supervizedFibers(): UIO<HashSet<RuntimeFiber<any, any>>> {
    return I.descriptorWith((descriptor) =>
      this.annotations
        .get(fibers)
        ['>>='](
          E.match(
            (_) => I.succeed(HS.make(HashEqFiber)),
            flow(
              I.foreach(Ref.get),
              I.map(C.foldl(HS.make(HashEqFiber), HS.union_)),
              I.map(HS.filter((f) => !eqFiberId.equals_(f.id, descriptor.id)))
            )
          )
        )
    )
  }

  private get freeze(): IO<unknown, void, HashMap<FiberId, FiberStatus>> {
    return this.supervizedFibers['>>='](
      I.foldl(HM.make(HashEqFiberId), (map, fiber) =>
        fiber.status['>>=']((status) => {
          switch (status._tag) {
            case 'Done': {
              return I.succeed(HM.set_(map, fiber.id, status))
            }
            case 'Suspended': {
              return I.succeed(HM.set_(map, fiber.id, status))
            }
            default: {
              return I.fail(undefined)
            }
          }
        })
      )
    )
  }

  private get delay(): UIO<void> {
    return this.live.provide(I.sleep(5))
  }

  private get awaitSuspended(): UIO<void> {
    return pipe(
      this.suspended,
      I.crossWith(this.live.provide(I.sleep(10))['*>'](this.suspended), (x, y) => x === y),
      I.filterOrFail(
        (_: boolean) => _,
        (): void => undefined
      ),
      I.eventually,
      I.asUnit
    )
  }

  private run(f: (duration: number) => number): UIO<void> {
    return this.awaitSuspended['*>'](
      Ref.modify_(this.clockState, (data) => {
        const end    = f(data.duration)
        const sorted = Li.sortWith_(data.sleeps, ([x], [y]) => N.Ord.compare_(x, y))
        return pipe(
          sorted,
          Li.head,
          O.chain(([duration, promise]) =>
            duration <= end ? O.some(tuple(O.some(tuple(end, promise)), new Data(duration, Li.tail(sorted)))) : O.none()
          ),
          O.getOrElse(() => tuple(O.none(), new Data(end, data.sleeps)))
        )
      })
    )['>>='](
      O.match(
        () => I.unit(),
        ([end, promise]) =>
          P.succeed_(promise, undefined)
            ['*>'](I.yieldNow)
            ['*>'](this.run((_) => end))
      )
    )
  }

  private get suspended(): IO<unknown, void, HashMap<FiberId, FiberStatus>> {
    return this.freeze['<*>'](this.delay['*>'](this.freeze))['>>='](([first, last]) => {
      if (
        /* first.size === last.size &&
         * HM.ifilterMap_(first, (i, s) =>
         *   pipe(
         *     last,
         *     HM.get(i),
         *     O.filter((s1) => s1._tag === s._tag)
         *   )
         * ).size === 0
         */
        first === last
      ) {
        return I.succeed(first)
      } else {
        return I.fail(undefined)
      }
    })
  }

  private warningDone: UIO<void> = RefM.updateSomeIO_(
    this.warningState,
    matchTag({
      Start: () => O.some(I.succeed(Done)),
      Pending: ({ fiber }) => O.some(Fi.interrupt(fiber)['$>'](Done)),
      Done: () => O.none()
    })
  )

  private warningStart: UIO<void> = RefM.updateSomeIO_(
    this.warningState,
    matchTag(
      {
        Start: () =>
          pipe(
            this.live.provide(pipe(Console.putStrLn(warning), I.delay(5000))),
            I.interruptible,
            I.fork,
            I.map(Pending),
            O.some
          )
      },
      () => O.none<IO<unknown, never, WarningData>>()
    )
  )

  static live(data: Data): Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> {
    return L.fromRawManaged(
      pipe(
        M.asksServicesManaged({ live: LiveTag, annotations: AnnotationsTag })(({ live, annotations }) =>
          M.gen(function* (_) {
            const ref  = yield* _(Ref.make(data))
            const refM = yield* _(RefM.make(Start))
            const test = yield* _(
              M.bracket_(I.succeed(new TestClock(ref, live, annotations, refM)), (tc) => tc.warningDone)
            )
            return intersect(ClockTag.of(new ProxyClock(test.currentTime, test.sleep)), TestClockTag.of(test))
          })
        )
      )
    )
  }

  static default: Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> = TestClock.live(
    new Data(0, Li.empty())
  )
}
