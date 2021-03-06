import type { Annotations } from '../Annotation'
import type { Live } from './Live'
import type { Clock } from '@principia/base/Clock'
import type { HashMap } from '@principia/base/collection/immutable/HashMap'
import type { HashSet } from '@principia/base/collection/immutable/HashSet'
import type { List } from '@principia/base/collection/immutable/List'
import type { Fiber, FiberId, RuntimeFiber } from '@principia/base/Fiber'
import type { FiberStatus } from '@principia/base/Fiber/FiberStatus'
import type { Has } from '@principia/base/Has'
import type { IO, UIO } from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type { URef } from '@principia/base/Ref'
import type { USRef } from '@principia/base/SRef'

import { ClockTag, ProxyClock } from '@principia/base/Clock'
import * as C from '@principia/base/collection/immutable/Conc'
import * as HM from '@principia/base/collection/immutable/HashMap'
import * as HS from '@principia/base/collection/immutable/HashSet'
import * as Li from '@principia/base/collection/immutable/List'
import { Console } from '@principia/base/Console'
import * as E from '@principia/base/Either'
import { eqFiberId } from '@principia/base/Fiber'
import * as Fi from '@principia/base/Fiber'
import { flow, pipe } from '@principia/base/function'
import * as F from '@principia/base/Future'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import * as Ref from '@principia/base/Ref'
import * as RefM from '@principia/base/SRef'
import * as St from '@principia/base/Structural'
import { tuple } from '@principia/base/tuple'
import { matchTag } from '@principia/base/util/match'

import { AnnotationsTag, fibers } from '../Annotation'
import { HashEqFiber, HashEqFiberId } from '../util/util'
import { LiveTag } from './Live'

export class Data {
  constructor(readonly duration: number, readonly sleeps: List<readonly [number, F.Future<never, void>]>) {}
}

export class Sleep {
  constructor(readonly duration: number, readonly promise: F.Future<never, void>, readonly fiberId: FiberId) {}
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
    readonly warningState: USRef<WarningData>
  ) {}
  sleep = (ms: number) => {
    const self = this
    return I.gen(function* (_) {
      const promise = yield* _(F.make<never, void>())
      const wait    = yield* _(
        Ref.modify_(self.clockState, (data) => {
          const end = data.duration + ms
          if (end > data.duration) {
            return tuple(true, new Data(data.duration, Li.prepend_(data.sleeps, tuple(end, promise))))
          } else {
            return tuple(false, data)
          }
        })
      )
      yield* _(
        I.defer(() => {
          if (wait) {
            return I.apSecond_(self.warningStart, F.await(promise))
          } else {
            return I.apSecond_(F.succeed_(promise, undefined), I.unit())
          }
        })
      )
    })
  }

  currentTime = I.map_(this.clockState.get, (data) => data.duration)

  adjust(duration: number): UIO<void> {
    return pipe(this.warningDone, I.apSecond(this.run((d) => d + duration)))
  }

  setDate(date: Date): UIO<void> {
    return this.setTime(date.getTime())
  }

  setTime(time: number): UIO<void> {
    return pipe(this.warningDone, I.apSecond(this.run((_) => time)))
  }

  sleeps = I.map_(this.clockState.get, (data) => Li.map_(data.sleeps, ([_]) => _))

  get supervizedFibers(): UIO<HashSet<RuntimeFiber<any, any>>> {
    return I.descriptorWith((descriptor) =>
      I.chain_(
        this.annotations.get(fibers),
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
    return I.chain_(
      this.supervizedFibers,
      I.foldl(HM.make(HashEqFiberId), (map, fiber) =>
        I.chain_(fiber.status, (status) => {
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
      I.crossWith(pipe(this.live.provide(I.sleep(10)), I.apSecond(this.suspended)), St.equals),
      I.filterOrFail(
        (_: boolean) => _,
        (): void => undefined
      ),
      I.eventually,
      I.asUnit
    )
  }

  private run(f: (duration: number) => number): UIO<void> {
    return pipe(
      this.awaitSuspended,
      I.apSecond(
        Ref.modify_(this.clockState, (data) => {
          const end    = f(data.duration)
          const sorted = Li.sortWith_(data.sleeps, ([x], [y]) => N.Ord.compare_(x, y))
          return pipe(
            Li.head(sorted),
            M.chain(([duration, promise]) =>
              duration <= end
                ? M.just(tuple(M.just(tuple(end, promise)), new Data(duration, Li.unsafeTail(sorted))))
                : M.nothing()
            ),
            M.getOrElse(() => tuple(M.nothing(), new Data(end, data.sleeps)))
          )
        })
      ),
      I.chain(
        M.match(
          () => I.unit(),
          ([end, promise]) =>
            pipe(F.succeed_(promise, undefined), I.apSecond(I.yieldNow), I.apSecond(this.run((_) => end)))
        )
      )
    )
  }

  private get suspended(): IO<unknown, void, HashMap<FiberId, FiberStatus>> {
    return pipe(
      this.freeze,
      I.cross(I.apSecond_(this.delay, this.freeze)),
      I.chain(([first, last]) => {
        if (St.equals(first, last)) {
          return I.succeed(first)
        } else {
          return I.fail(undefined)
        }
      })
    )
  }

  private warningDone: UIO<void> = RefM.updateJustIO_(
    this.warningState,
    matchTag({
      Start: () => M.just(I.succeed(Done)),
      Pending: ({ fiber }) => M.just(I.as_(Fi.interrupt(fiber), Done)),
      Done: () => M.nothing()
    })
  )

  private warningStart: UIO<void> = RefM.updateJustIO_(
    this.warningState,
    matchTag(
      {
        Start: () =>
          pipe(
            this.live.provide(pipe(Console.putStrLn(warning), I.delay(5000))),
            I.interruptible,
            I.fork,
            I.map(Pending),
            M.just
          )
      },
      () => M.nothing<IO<unknown, never, WarningData>>()
    )
  )

  static live(data: Data): Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> {
    return L.fromRawManaged(
      pipe(
        Ma.asksServicesManaged({ live: LiveTag, annotations: AnnotationsTag })(({ live, annotations }) =>
          Ma.gen(function* (_) {
            const ref  = yield* _(Ref.make(data))
            const refM = yield* _(RefM.make(Start))
            const test = yield* _(
              Ma.bracket_(I.succeed(new TestClock(ref, live, annotations, refM)), (tc) => tc.warningDone)
            )
            return {
              [ClockTag.key]: new ProxyClock(test.currentTime, test.sleep),
              [TestClockTag.key]: test
            } as unknown as Has<Clock> & Has<TestClock>
          })
        )
      )
    )
  }

  static adjust = I.deriveLifted(TestClockTag)(['adjust'], [], []).adjust

  static default: Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> = TestClock.live(
    new Data(0, Li.nil())
  )
}
