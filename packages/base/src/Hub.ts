import type { MutableQueue } from './util/support/MutableQueue'

import { SourceMap } from 'module'

import * as C from './Chunk'
import { parallel } from './ExecutionStrategy'
import * as Ex from './Exit'
import * as F from './Fiber'
import { identity, pipe } from './function'
import * as I from './IO'
import * as M from './Managed'
import * as RM from './Managed/ReleaseMap'
import * as HS from './MutableHashSet'
import * as P from './Promise'
import * as Q from './Queue'
import { Queue, QueueInternal } from './Queue'
import * as Ref from './Ref'
import * as St from './Structural'
import { AtomicBoolean } from './util/support/AtomicBoolean'
import { Unbounded } from './util/support/MutableQueue'
import * as MQ from './util/support/MutableQueue'

export type HubDequeue<R, E, A> = Q.Queue<never, R, unknown, E, never, A>

export type HubEnqueue<R, E, A> = Q.Queue<R, never, E, unknown, A, never>

export type UHub<A> = Hub<unknown, unknown, never, never, A, A>

export const HubTypeId = Symbol()
export type HubTypeId = typeof HubTypeId

export interface Hub<RA, RB, EA, EB, A, B> {
  readonly _RA: (_: RA) => void
  readonly _RB: (_: RB) => void
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B
}

/**
 * A `Hub<RA, RB, EA, EB, A, B>` is an asynchronous message hub. Publishers
 * can publish messages of type `A` to the hub and subscribers can subscribe to
 * take messages of type `B` from the hub. Publishing messages can require an
 * environment of type `RA` and fail with an error of type `EA`. Taking
 * messages can require an environment of type `RB` and fail with an error of
 * type `EB`.
 */

export abstract class HubInternal<RA, RB, EA, EB, A, B> implements Hub<RA, RB, EA, EB, A, B> {
  readonly [HubTypeId]: HubTypeId = HubTypeId
  readonly _RA!: (_: RA) => void
  readonly _RB!: (_: RB) => void
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B
  readonly _U = 'Hub'

  /**
   * Waits for the hub to be shut down.
   */
  abstract awaitShutdown: I.UIO<void>

  /**
   * The maximum capacity of the hub.
   */
  abstract capacity: number

  /**
   * Checks whether the hub is shut down.
   */
  abstract isShutdown: I.UIO<boolean>

  /**
   * Publishes a message to the hub, returning whether the message was
   * published to the hub.
   */
  abstract publish(a: A): I.IO<RA, EA, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether
   * they were published to the hub.
   */
  abstract publishAll(as: Iterable<A>): I.IO<RA, EA, boolean>

  /**
   * Shuts down the hub.
   */
  abstract shutdown: I.UIO<void>

  /**
   * The current number of messages in the hub.
   */
  abstract size: I.UIO<number>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription
   * can be evaluated multiple times within the scope of the managed to take a
   * message from the hub each time.
   */
  abstract subscribe: M.Managed<unknown, never, HubDequeue<RB, EB, B>>
}

/**
 * @optimize remove
 */
export function concrete<RA, RB, EA, EB, A, B>(
  _: Hub<RA, RB, EA, EB, A, B>
): asserts _ is HubInternal<RA, RB, EA, EB, A, B> {
  //
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeBounded<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.chain_(
    I.succeedLazy(() => _makeBounded<A>(requestedCapacity)),
    (_) => _make(_, new BackPressure())
  )
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeBounded<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeMake<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeMake(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new BackPressure()
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeDropping<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.chain_(
    I.succeedLazy(() => {
      return _makeBounded<A>(requestedCapacity)
    }),
    (_) => _make(_, new Dropping())
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeDropping<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeMake<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeMake(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Dropping()
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeSliding<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.chain_(
    I.succeedLazy(() => {
      return _makeBounded<A>(requestedCapacity)
    }),
    (_) => _make(_, new Sliding())
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeSliding<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeMake<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeMake(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Sliding()
  )
}

/**
 * Creates an unbounded hub.
 */
export function makeUnbounded<A>(): I.UIO<UHub<A>> {
  return I.chain_(
    I.succeedLazy(() => {
      return _makeUnbounded<A>()
    }),
    (_) => _make(_, new Dropping())
  )
}

/**
 * Creates an unbounded hub.
 */
export function unsafeMakeUnbounded<A>(): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeMake<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeMake(
    _makeUnbounded<A>(),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Dropping()
  )
}

function _make<A>(hub: UHubInternal<A>, strategy: Strategy<A>): I.UIO<UHub<A>> {
  return I.chain_(RM.make, (releaseMap) => {
    return I.map_(P.make<never, void>(), (promise) => {
      return _unsafeMake(hub, subscribersHashSet<A>(), releaseMap, promise, new AtomicBoolean(false), strategy)
    })
  })
}

export class UnsafeHub<A> extends HubInternal<unknown, unknown, never, never, A, A> {
  constructor(
    readonly hub: UHubInternal<A>,
    readonly subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
    readonly releaseMap: RM.ReleaseMap,
    readonly shutdownHook: P.Promise<never, void>,
    readonly shutdownFlag: AtomicBoolean,
    readonly strategy: Strategy<A>
  ) {
    super()
  }

  awaitShutdown = P.await(this.shutdownHook)
  capacity      = this.hub.capacity
  isShutdown    = I.succeedLazy(() => this.shutdownFlag.get)
  shutdown      = pipe(
    I.fiberId(),
    I.chain((fiberId) =>
      I.defer(() => {
        this.shutdownFlag.set(true)
        return pipe(
          M.releaseAll_(this.releaseMap, Ex.interrupt(fiberId), parallel)['*>'](this.strategy.shutdown),
          I.whenIO(P.succeed_(this.shutdownHook, undefined))
        )
      })
    ),
    I.uninterruptible
  )

  size = I.defer(() => {
    if (this.shutdownFlag.get) {
      return I.interrupt
    }

    return I.succeed(this.hub.size())
  })

  subscribe = pipe(
    M.do,
    M.chainS('dequeue', () => I.toManaged_(subscription(this.hub, this.subscribers, this.strategy))),
    M.tap(({ dequeue }) =>
      M.bracketExit_(
        RM.add(this.releaseMap, (_) => Q.shutdown(dequeue)),
        (finalizer, exit) => finalizer(exit)
      )
    ),
    M.map(({ dequeue }) => dequeue)
  )

  publish = (a: A): I.IO<unknown, never, boolean> =>
    I.defer(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      if (this.hub.publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
        return I.succeed(true)
      }

      return this.strategy.handleSurplus(this.hub, this.subscribers, C.single(a), this.shutdownFlag)
    })

  publishAll = (as: Iterable<A>): I.IO<unknown, never, boolean> =>
    I.defer(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      const surplus = _unsafePublishAll(this.hub, as)

      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)

      if (C.isEmpty(surplus)) {
        return I.succeed(true)
      }

      return this.strategy.handleSurplus(this.hub, this.subscribers, surplus, this.shutdownFlag)
    })
}

/**
 * Unsafely creates a hub with the specified strategy.
 */
function _unsafeMake<A>(
  hub: UHubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  releaseMap: RM.ReleaseMap,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): UHub<A> {
  return new UnsafeHub(hub, subscribers, releaseMap, shutdownHook, shutdownFlag, strategy)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

export class ToQueue<RA, RB, EA, EB, A, B> extends QueueInternal<RA, never, EA, unknown, A, never> {
  constructor(readonly source: HubInternal<RA, RB, EA, EB, A, B>) {
    super()
  }
  awaitShutdown = this.source.awaitShutdown
  capacity      = this.source.capacity
  isShutdown    = this.source.isShutdown
  shutdown      = this.source.shutdown
  size          = this.source.size
  take          = I.never
  takeAll       = I.succeed(C.empty<never>())
  offer         = (a: A): I.IO<RA, EA, boolean> => this.source.publish(a)
  offerAll      = (as: Iterable<A>): I.IO<RA, EA, boolean> => this.source.publishAll(as)
  takeUpTo      = (): I.IO<unknown, never, C.Chunk<never>> => I.succeed(C.empty())
}

/**
 * Views the hub as a queue that can only be written to.
 */
export function toQueue<RA, RB, EA, EB, A, B>(source: Hub<RA, RB, EA, EB, A, B>): HubEnqueue<RA, EA, A> {
  concrete(source)
  return new ToQueue(source)
}

/**
 * Creates a subscription with the specified strategy.
 */
function subscription<A>(
  hub: UHubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  strategy: Strategy<A>
): I.UIO<Q.Dequeue<A>> {
  return I.map_(P.make<never, void>(), (promise) => {
    return unsafeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      new Unbounded<P.Promise<never, A>>(),
      promise,
      new AtomicBoolean(false),
      strategy
    )
  })
}

class UnsafeSubscription<A> extends Q.QueueInternal<never, unknown, unknown, never, never, A> {
  constructor(
    readonly hub: UHubInternal<A>,
    readonly subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
    readonly subscription: SubscriptionInternal<A>,
    readonly pollers: MutableQueue<P.Promise<never, A>>,
    readonly shutdownHook: P.Promise<never, void>,
    readonly shutdownFlag: AtomicBoolean,
    readonly strategy: Strategy<A>
  ) {
    super()
  }

  awaitShutdown: I.UIO<void> = P.await(this.shutdownHook)

  capacity: number = this.hub.capacity

  isShutdown: I.UIO<boolean> = I.succeedLazy(() => this.shutdownFlag.get)

  shutdown: I.UIO<void> = pipe(
    I.fiberId(),
    I.chain((fiberId) =>
      I.defer(() => {
        this.shutdownFlag.set(true)
        return pipe(
          I.foreachPar_(_unsafePollAllQueue(this.pollers), P.interruptAs(fiberId))['*>'](
            I.succeedLazy(() => this.subscription.unsubscribe())
          ),
          I.whenIO(P.succeed_(this.shutdownHook, undefined))
        )
      })
    )
  )

  size: I.UIO<number> = I.defer(() => {
    if (this.shutdownFlag.get) {
      return I.interrupt
    }

    return I.succeed(this.subscription.size())
  })

  offer = (_: never): I.IO<never, unknown, boolean> => I.succeed(false)

  offerAll = (_: Iterable<never>): I.IO<never, unknown, boolean> => I.succeed(false)

  take: I.IO<unknown, never, A> = pipe(
    I.fiberId(),
    I.chain((fiberId) =>
      I.defer(() => {
        if (this.shutdownFlag.get) {
          return I.interrupt
        }

        const empty   = null as unknown as A
        const message = this.pollers.isEmpty ? this.subscription.poll(empty) : empty

        if (message === null) {
          const promise = P.unsafeMake<never, A>(fiberId)

          return I.onInterrupt_(
            I.defer(() => {
              this.pollers.offer(promise)
              this.subscribers.add(new HashedPair(this.subscription, this.pollers))
              this.strategy.unsafeCompletePollers(this.hub, this.subscribers, this.subscription, this.pollers)
              if (this.shutdownFlag.get) {
                return I.interrupt
              } else {
                return P.await(promise)
              }
            }),
            () =>
              I.succeedLazy(() => {
                _unsafeRemove(this.pollers, promise)
              })
          )
        } else {
          this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
          return I.succeed(message)
        }
      })
    )
  )

  takeAll: I.IO<unknown, never, C.Chunk<A>> = I.defer(() => {
    if (this.shutdownFlag.get) {
      return I.interrupt
    }

    const as = this.pollers.isEmpty ? _unsafePollAllSubscription(this.subscription) : C.empty<A>()

    this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)

    return I.succeed(as)
  })

  takeUpTo = (n: number): I.IO<unknown, never, C.Chunk<A>> => {
    return I.defer(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      const as = this.pollers.isEmpty ? _unsafePollN(this.subscription, n) : C.empty<A>()

      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return I.succeed(as)
    })
  }
}

/**
 * Unsafely creates a subscription with the specified strategy.
 */
function unsafeSubscription<A>(
  hub: UHubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  subscription: SubscriptionInternal<A>,
  pollers: MutableQueue<P.Promise<never, A>>,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Q.Dequeue<A> {
  return new UnsafeSubscription(hub, subscribers, subscription, pollers, shutdownHook, shutdownFlag, strategy)
}

function subscribersHashSet<A>(): HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>> {
  return HS.hashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 */
export function mapIO_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): Hub<RA, RC & RB, EA, EB | EC, A, C> {
  return dimapIO_(self, I.succeed, f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst mapIO_
 */
export function mapIO<B, C, EC, RC>(f: (b: B) => I.IO<RC, EC, C>) {
  return <A, EA, EB, RA, RB>(self: Hub<RA, RB, EA, EB, A, B>) => mapIO_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): Hub<RA, RB, EA, EB, A, C> {
  return mapIO_(self, (b) => I.succeed(f(b)))
}

/**
 * Transforms messages taken from the hub using the specified function.
 *
 * @dataFirst map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 */
export function contramapIO_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): Hub<RC & RA, RB, EA | EC, EB, C, B> {
  return dimapIO_(self, f, I.succeed)
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst contramapIO_
 */
export function contramapIO<RC, EC, A, C>(f: (c: C) => I.IO<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => contramapIO_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export class DimapIO<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D> extends HubInternal<
  RC & RA,
  RD & RB,
  EA | EC,
  EB | ED,
  C,
  D
> {
  constructor(
    readonly source: HubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => I.IO<RC, EC, A>,
    readonly g: (b: B) => I.IO<RD, ED, D>
  ) {
    super()
  }
  awaitShutdown = this.source.awaitShutdown
  capacity      = this.source.capacity
  isShutdown    = this.source.isShutdown
  shutdown      = this.source.shutdown
  size          = this.source.size
  subscribe     = M.map_(this.source.subscribe, Q.mapIO(this.g))
  publish       = (c: C) => I.chain_(this.f(c), (a) => this.source.publish(a))
  publishAll    = (cs: Iterable<C>) => I.chain_(I.foreach_(cs, this.f), (as) => this.source.publishAll(as))
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 */
export function dimapIO_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): Hub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  concrete(source)
  return new DimapIO(source, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 *
 * @dataFirst dimapIO_
 */
export function dimapIO<A, B, C, D, EC, ED, RC, RD>(f: (c: C) => I.IO<RC, EC, A>, g: (b: B) => I.IO<RD, ED, D>) {
  return <RA, RB, EA, EB>(self: Hub<RA, RB, EA, EB, A, B>) => dimapIO_(self, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): Hub<RA, RB, EA, EB, C, D> {
  return dimapIO_(
    self,
    (c) => I.succeed(f(c)),
    (b) => I.succeed(g(b))
  )
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 *
 * @dataFirst dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: Hub<RA, RB, EA, EB, A, B>) => dimap_(self, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filter
 * -------------------------------------------------------------------------------------------------
 */

export class FilterInputIO<RA, RA1, RB, EA, EA1, EB, A, B> extends HubInternal<RA & RA1, RB, EA | EA1, EB, A, B> {
  constructor(readonly source: HubInternal<RA, RB, EA, EB, A, B>, readonly f: (a: A) => I.IO<RA1, EA1, boolean>) {
    super()
  }
  awaitShutdown = this.source.awaitShutdown
  capacity      = this.source.capacity
  isShutdown    = this.source.isShutdown
  shutdown      = this.source.shutdown
  size          = this.source.size
  subscribe     = this.source.subscribe
  publish       = (a: A) => I.chain_(this.f(a), (b) => (b ? this.source.publish(a) : I.succeed(false)))
  publishAll    = (as: Iterable<A>) =>
    I.chain_(I.filter_(as, this.f), (as) => (C.isNonEmpty(as) ? this.source.publishAll(as) : I.succeed(false)))
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 */
export function filterInputIO_<RA, RA1, RB, EA, EA1, EB, A, B>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (a: A) => I.IO<RA1, EA1, boolean>
): Hub<RA & RA1, RB, EA | EA1, EB, A, B> {
  concrete(source)
  return new FilterInputIO(source, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst filterInputIO_
 */
export function filterInputIO<RA1, EA1, A>(f: (a: A) => I.IO<RA1, EA1, boolean>) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => filterInputIO_(self, f)
}

/**
 * Filters messages published to the hub using the specified function.
 */
export function filterInput_<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>, f: (a: A) => boolean) {
  return filterInputIO_(self, (a) => I.succeed(f(a)))
}

/**
 * Filters messages published to the hub using the specified function.
 *
 * @dataFirst filterInput_
 */
export function filterInput<A>(f: (a: A) => boolean) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => filterInput_(self, f)
}

export class FilterOutputIO<RA, RB, RB1, EA, EB, EB1, A, B> extends HubInternal<RA, RB & RB1, EA, EB | EB1, A, B> {
  constructor(readonly source: HubInternal<RA, RB, EA, EB, A, B>, readonly f: (a: B) => I.IO<RB1, EB1, boolean>) {
    super()
  }
  awaitShutdown = this.source.awaitShutdown
  capacity      = this.source.capacity
  isShutdown    = this.source.isShutdown
  shutdown      = this.source.shutdown
  size          = this.source.size
  subscribe     = M.map_(this.source.subscribe, Q.filterOutputIO(this.f))
  publish       = (a: A) => this.source.publish(a)
  publishAll    = (as: Iterable<A>) => this.source.publishAll(as)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 */
export function filterOutputIO_<RA, RB, RB1, EA, EB, EB1, A, B>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (a: B) => I.IO<RB1, EB1, boolean>
): Hub<RA, RB & RB1, EA, EB | EB1, A, B> {
  concrete(source)
  return new FilterOutputIO(source, f)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst filterOutputIO_
 */
export function filterOutputIO<RB1, EB1, B>(f: (a: B) => I.IO<RB1, EB1, boolean>) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => filterOutputIO_(self, f)
}

/**
 * Filters messages taken from the hub using the specified function.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): Hub<RA, RB, EA, EB, A, B> {
  return filterOutputIO_(self, (b) => I.succeed(f(b)))
}

/**
 * Filters messages taken from the hub using the specified function.
 *
 * @dataFirst filterOutput_
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => filterOutput_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Waits for the hub to be shut down.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.awaitShutdown
}

/**
 * The maximum capacity of the hub.
 */
export function capacity<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): number {
  concrete(self)
  return self.capacity
}

/**
 * Checks whether the hub is shut down.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<boolean> {
  concrete(self)
  return self.isShutdown
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 */
export function publish_<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>, a: A): I.IO<RA, EA, boolean> {
  concrete(self)
  return self.publish(a)
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 *
 * @dataFirst publish_
 */
export function publish<A>(a: A) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => publish_(self, a)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 */
export function publishAll_<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
): I.IO<RA, EA, boolean> {
  concrete(self)
  return self.publishAll(as)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 *
 * @dataFirst publishAll_
 */
export function publishAll<A>(as: Iterable<A>) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => publishAll_(self, as)
}

/**
 * Shuts down the hub.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.shutdown
}

/**
 * The current number of messages in the hub.
 */
export function size<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<number> {
  concrete(self)
  return self.size
}

/**
 * Subscribes to receive messages from the hub. The resulting subscription
 * can be evaluated multiple times within the scope of the managed to take a
 * message from the hub each time.
 */
export function subscribe<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>
): M.Managed<unknown, never, HubDequeue<RB, EB, B>> {
  concrete(self)
  return self.subscribe
}

/*
 * -------------------------------------------------------------------------------------------------
 * Strategy
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A `Strategy<A>` describes the protocol for how publishers and subscribers
 * will communicate with each other through the hub.
 */
export abstract class Strategy<A> {
  /**
   * Describes how publishers should signal to subscribers that they are
   * waiting for space to become available in the hub.
   */
  abstract handleSurplus(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): I.UIO<boolean>

  /**
   * Describes any finalization logic associated with this strategy.
   */
  abstract shutdown: I.UIO<void>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the hub that space may be available.
   */
  abstract unsafeOnHubEmptySpace(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void

  /**
   * Describes how subscribers waiting for additional values from the hub
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  unsafeCompletePollers(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    subscription: SubscriptionInternal<A>,
    pollers: MQ.MutableQueue<P.Promise<never, A>>
  ): void {
    let keepPolling  = true
    const nullPoller = null as unknown as P.Promise<never, A>
    const empty      = null as unknown as A

    while (keepPolling && !subscription.isEmpty()) {
      const poller = pollers.poll(nullPoller)!

      if (poller === nullPoller) {
        const subPollerPair = new HashedPair(subscription, pollers)

        subscribers.remove(subPollerPair)

        if (!pollers.isEmpty) {
          subscribers.add(subPollerPair)
        }
        keepPolling = false
      } else {
        const pollResult = subscription.poll(empty)

        if (pollResult === null) {
          _unsafeOfferAll(pollers, C.prepend_(_unsafePollAllQueue(pollers), poller))
        } else {
          _unsafeCompletePromise(poller, pollResult)
          this.unsafeOnHubEmptySpace(hub, subscribers)
        }
      }
    }
  }

  /**
   * Describes how publishers should signal to subscribers waiting for
   * additional values from the hub that new values are available.
   */
  unsafeCompleteSubscribers(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    for (const { first: subscription, second: pollers } of subscribers) {
      this.unsafeCompletePollers(hub, subscribers, subscription, pollers)
    }
  }
}

/**
 * A strategy that applies back pressure to publishers when the hub is at
 * capacity. This guarantees that all subscribers will receive all messages
 * published to the hub while they are subscribed. However, it creates the
 * risk that a slow subscriber will slow down the rate at which messages
 * are published and received by other subscribers.
 */
export class BackPressure<A> extends Strategy<A> {
  publishers: MQ.MutableQueue<readonly [A, P.Promise<never, boolean>, boolean]> = new MQ.Unbounded()

  handleSurplus(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return pipe(
      I.fiberId(),
      I.chain((fiberId) =>
        I.defer(() => {
          const promise = P.unsafeMake<never, boolean>(fiberId)

          return pipe(
            I.defer(() => {
              this.unsafeOffer(as, promise)
              this.unsafeOnHubEmptySpace(hub, subscribers)
              this.unsafeCompleteSubscribers(hub, subscribers)

              return isShutdown.get ? I.interrupt : P.await(promise)
            }),
            I.onInterrupt(() => I.succeedLazy(() => this.unsafeRemove(promise)))
          )
        })
      )
    )
  }

  get shutdown(): I.UIO<void> {
    return pipe(
      I.do,
      I.chainS('fiberId', () => I.fiberId()),
      I.chainS('publishers', () => I.succeedLazy(() => _unsafePollAllQueue(this.publishers))),
      I.tap(({ fiberId, publishers }) =>
        I.foreachPar_(publishers, ([_, promise, last]) =>
          last ? I.asUnit(P.interruptAs_(promise, fiberId)) : I.unit()
        )
      ),
      I.asUnit
    )
  }

  unsafeOnHubEmptySpace(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    const empty     = null as unknown as readonly [A, P.Promise<never, boolean>, boolean]
    let keepPolling = true

    while (keepPolling && !hub.isFull()) {
      const publisher = this.publishers.poll(empty)!

      if (publisher === null) {
        keepPolling = false
      } else {
        const published = hub.publish(publisher[0])

        if (published && publisher[2]) {
          _unsafeCompletePromise(publisher[1], true)
        } else if (!published) {
          _unsafeOfferAll(this.publishers, C.prepend_(_unsafePollAllQueue(this.publishers), publisher))
        }
        this.unsafeCompleteSubscribers(hub, subscribers)
      }
    }
  }

  private unsafeOffer(as: Iterable<A>, promise: P.Promise<never, boolean>): void {
    const it = as[Symbol.iterator]()
    let curr = it.next()

    if (!curr.done) {
      let next
      while ((next = it.next()) && !next.done) {
        this.publishers.offer([curr.value, promise, false] as const)
        curr = next
      }
      this.publishers.offer([curr.value, promise, true] as const)
    }
  }

  private unsafeRemove(promise: P.Promise<never, boolean>): void {
    _unsafeOfferAll(
      this.publishers,
      C.filter_(_unsafePollAllQueue(this.publishers), ([_, a]) => a !== promise)
    )
  }
}

/**
 * A strategy that drops new messages when the hub is at capacity. This
 * guarantees that a slow subscriber will not slow down the rate at which
 * messages are published. However, it creates the risk that a slow
 * subscriber will slow down the rate at which messages are received by
 * other subscribers and that subscribers may not receive all messages
 * published to the hub while they are subscribed.
 */
export class Dropping<A> extends Strategy<A> {
  handleSurplus(
    _hub: UHubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    _as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.succeed(false)
  }

  shutdown: I.UIO<void> = I.unit()

  unsafeOnHubEmptySpace(
    _hub: UHubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    //
  }
}

/**
 * A strategy that adds new messages and drops old messages when the hub is
 * at capacity. This guarantees that a slow subscriber will not slow down
 * the rate at which messages are published and received by other
 * subscribers. However, it creates the risk that a slow subscriber will
 * not receive some messages published to the hub while it is subscribed.
 */
export class Sliding<A> extends Strategy<A> {
  private unsafeSlidingPublish(hub: UHubInternal<A>, as: Iterable<A>): void {
    const it = as[Symbol.iterator]()
    let next = it.next()

    if (!next.done && hub.capacity > 0) {
      let a    = next.value
      let loop = true
      while (loop) {
        hub.slide()
        const pub = hub.publish(a)
        if (pub && (next = it.next()) && !next.done) {
          a = next.value
        } else if (pub) {
          loop = false
        }
      }
    }
  }

  handleSurplus(
    hub: UHubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.succeedLazy(() => {
      this.unsafeSlidingPublish(hub, as)
      this.unsafeCompleteSubscribers(hub, subscribers)
      return true
    })
  }

  shutdown: I.UIO<void> = I.unit()

  unsafeOnHubEmptySpace(
    _hub: UHubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    //
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

export abstract class SubscriptionInternal<A> {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): C.Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void
}

export abstract class UHubInternal<A> {
  abstract readonly capacity: number
  abstract isEmpty(): boolean
  abstract isFull(): boolean
  abstract publish(a: A): boolean
  abstract publishAll(as: Iterable<A>): C.Chunk<A>
  abstract size(): number
  abstract slide(): void
  abstract subscribe(): SubscriptionInternal<A>
}

/* eslint-disable functional/immutable-data */

export class BoundedHubArb<A> extends UHubInternal<A> {
  array: Array<A>
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array       = Array.from({ length: requestedCapacity })
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex % this.capacity

      this.array[index]       = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex % this.capacity
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex % this.capacity

      this.array[index]       = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubArbSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubArbSubscription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubArb<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = null as unknown as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex % this.self.capacity
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex !== this.self.publisherIndex) {
        const index                   = this.subscriberIndex % this.self.capacity
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = null as unknown as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}
export class BoundedHubPow2<A> extends UHubInternal<A> {
  array: Array<A>
  mask: number
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array = Array.from({ length: requestedCapacity })
    // eslint-disable-next-line no-param-reassign
    this.mask        = requestedCapacity = 1
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex & this.mask

      this.array[index] = a

      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex & this.mask
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex & this.mask

      this.array[index]       = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubPow2Subcription(this, this.publisherIndex, false)
  }
}

class BoundedHubPow2Subcription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubPow2<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex & this.self.mask
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = null as unknown as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex & this.self.mask
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex < this.self.publisherIndex) {
        const index                   = this.subscriberIndex & this.self.mask
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = null as unknown as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}

export class BoundedHubSingle<A> extends UHubInternal<A> {
  publisherIndex  = 0
  subscriberCount = 0
  subscribers     = 0
  value: A        = null as unknown as A

  readonly capacity = 1

  constructor() {
    super()
  }

  isEmpty(): boolean {
    return this.subscribers === 0
  }

  isFull(): boolean {
    return !this.isEmpty()
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      this.value           = a
      this.subscribers     = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const list = C.from(as)

    if (C.isEmpty(list)) {
      return C.empty()
    }

    if (this.publish(C.unsafeHead(list)!)) {
      return C.drop_(list, 1)
    } else {
      return list
    }
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value       = null as unknown as A
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubSingleSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubSingleSubscription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubSingle<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return this.unsubscribed || this.self.subscribers === 0 || this.subscriberIndex === this.self.publisherIndex
  }

  poll(default_: A): A {
    if (this.isEmpty()) {
      return default_
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }

    this.subscriberIndex += 1

    return a
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.isEmpty() || n < 1) {
      return C.empty()
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }

    this.subscriberIndex += 1

    return C.single(a)
  }

  size() {
    return this.isEmpty() ? 0 : 1
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1

      if (this.subscriberIndex !== this.self.publisherIndex) {
        this.self.subscribers -= 1

        if (this.self.subscribers === 0) {
          this.self.value = null as unknown as A
        }
      }
    }
  }
}

class Node<A> {
  constructor(public value: A | null, public subscribers: number, public next: Node<A> | null) {}
}

export class UnboundedHub<A> extends UHubInternal<A> {
  publisherHead  = new Node<A>(null, 0, null)
  publisherIndex = 0
  publisherTail: Node<A>
  subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    super()

    this.publisherTail = this.publisherHead
  }

  isEmpty(): boolean {
    return this.publisherHead === this.publisherTail
  }

  isFull(): boolean {
    return false
  }

  publish(a: A): boolean {
    const subscribers = this.publisherTail.subscribers

    if (subscribers !== 0) {
      this.publisherTail.next = new Node(a, subscribers, null)
      this.publisherTail      = this.publisherTail.next
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    for (const a of as) {
      this.publish(a)
    }
    return C.empty()
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.publisherHead !== this.publisherTail) {
      this.publisherHead       = this.publisherHead.next!
      this.publisherHead.value = null
      this.subscribersIndex   += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.publisherTail.subscribers += 1

    return new UnboundedHubSubscription(this, this.publisherTail, this.publisherIndex, false)
  }
}

class UnboundedHubSubscription<A> extends SubscriptionInternal<A> {
  constructor(
    private self: UnboundedHub<A>,
    private subscriberHead: Node<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
  }

  isEmpty(): boolean {
    if (this.unsubscribed) {
      return true
    }

    let empty = true
    let loop  = true

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        if (this.subscriberHead.next!.value !== null) {
          empty = false
          loop  = false
        } else {
          this.subscriberHead   = this.subscriberHead.next!
          this.subscriberIndex += 1
        }
      }
    }

    return empty
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    let loop   = true
    let polled = default_

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        const a = this.subscriberHead.next!.value

        if (a !== null) {
          polled                           = a
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }

          loop = false
        }

        this.subscriberHead   = this.subscriberHead.next!
        this.subscriberIndex += 1
      }
    }

    return polled
  }

  pollUpTo(n: number): C.Chunk<A> {
    let builder    = C.empty<A>()
    const default_ = null
    let i          = 0

    while (i !== n) {
      const a = this.poll(default_ as unknown as A)
      if (a === default_) {
        i = n
      } else {
        builder = C.append_(builder, a)
        i      += 1
      }
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed                    = true
      this.self.publisherTail.subscribers -= 1

      while (this.subscriberHead !== this.self.publisherTail) {
        if (this.subscriberHead.next!.value !== null) {
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }
        }
        this.subscriberHead = this.subscriberHead.next!
      }
    }
  }
}

export class HashedPair<A, B> implements St.Hashable, St.Equatable {
  constructor(readonly first: A, readonly second: B) {}

  get [St.$hash]() {
    return St._combineHash(St.hash(this.first), St.hash(this.second))
  }

  [St.$equals](that: unknown) {
    return that instanceof HashedPair && St.equals(this.first, that.first) && St.equals(this.second, that.second)
  }
}

export class InvalidCapacityError extends Error {
  readonly _tag = 'InvalidCapacityError'

  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

function _ensureCapacity(capacity: number): asserts capacity {
  if (capacity <= 0) {
    throw new InvalidCapacityError(`A Hub cannot have a capacity of ${capacity}`)
  }
}

function _isInvalidCapacityError(u: unknown): u is InvalidCapacityError {
  return u instanceof Error && '_tag' in u && u['_tag'] === 'InvalidCapacityError'
}

function _nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))

  return Math.max(Math.pow(2, nextPow), 2)
}

function _makeBounded<A>(requestedCapacity: number): UHubInternal<A> {
  _ensureCapacity(requestedCapacity)

  if (requestedCapacity === 1) {
    return new BoundedHubSingle()
  } else if (_nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedHubPow2(requestedCapacity)
  } else {
    return new BoundedHubArb(requestedCapacity)
  }
}

function _makeUnbounded<A>(): UHubInternal<A> {
  return new UnboundedHub()
}

/**
 * Unsafely completes a promise with the specified value.
 */
function _unsafeCompletePromise<A>(promise: P.Promise<never, A>, a: A): void {
  P.unsafeDone(I.succeed(a))(promise)
}

/**
 * Unsafely offers the specified values to a queue.
 */
function _unsafeOfferAll<A>(queue: MutableQueue<A>, as: Iterable<A>): C.Chunk<A> {
  return queue.offerAll(as)
}

/**
 * Unsafely polls all values from a queue.
 */
function _unsafePollAllQueue<A>(queue: MutableQueue<A>): C.Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls all values from a subscription.
 */
function _unsafePollAllSubscription<A>(subscription: SubscriptionInternal<A>): C.Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls the specified number of values from a subscription.
 */
function _unsafePollN<A>(subscription: SubscriptionInternal<A>, max: number): C.Chunk<A> {
  return subscription.pollUpTo(max)
}

/**
 * Unsafely publishes the specified values to a hub.
 */
function _unsafePublishAll<A>(hub: UHubInternal<A>, as: Iterable<A>): C.Chunk<A> {
  return hub.publishAll(as)
}

/**
 * Unsafely removes the specified item from a queue.
 */
function _unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  _unsafeOfferAll(
    queue,
    C.filter_(_unsafePollAllQueue(queue), (_) => _ !== a)
  )
}
