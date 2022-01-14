import type { ReadableStreamLike } from '../internal/util'
import type { Notification } from '../Notification'
import type { Observer } from '../Observer'
import type { Operator } from '../Operator'
import type { SchedulerAction, SchedulerLike } from '../Scheduler'
import type { Subscriber } from '../Subscriber'
import type { Finalizer, Unsubscribable } from '../Subscription'
import type { Either } from '@principia/base/Either'
import type { FiberContext } from '@principia/base/Fiber'
import type { IOEnv } from '@principia/base/IOEnv'
import type { Eq, Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from '@principia/base/prelude'

import * as Ca from '@principia/base/Cause'
import * as A from '@principia/base/collection/immutable/Array'
import { HashSet } from '@principia/base/collection/mutable/HashSet'
import * as E from '@principia/base/Either'
import * as Ex from '@principia/base/Exit'
import * as Fi from '@principia/base/Fiber'
import { flow, identity, pipe } from '@principia/base/function'
import * as IO from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import { tuple } from '@principia/base/tuple'
import { isFunction, isIterable, isObject } from '@principia/base/util/predicates'

import { asyncScheduler } from '../AsyncScheduler'
import { popNumber } from '../internal/args'
import {
  arrayOrObject,
  arrayRemove,
  isArrayLike,
  isAsyncIterable,
  isPromiseLike,
  isReadableStream,
  isValidDate,
  noop,
  readableStreamToAsyncGenerator,
  reportUnhandledError
} from '../internal/util'
import * as N from '../Notification'
import { operate_, OperatorSubscriber, operatorSubscriber } from '../Operator'
import { caughtSchedule, isScheduler } from '../Scheduler'
import { isSubscriber, SafeSubscriber } from '../Subscriber'
import { Subscription } from '../Subscription'

export interface Subscribable<E, A> {
  subscribe(observer: Partial<Observer<E, A>>): Unsubscribable
}

export type ObservableInput<E = never, A = never> =
  | Observable<E, A>
  | Subscribable<E, A>
  | AsyncIterable<A>
  | PromiseLike<A>
  | ArrayLike<A>
  | Iterable<A>
  | ReadableStreamLike<A>
  | IO.IO<IOEnv, E, A>

export type TypeOf<X> = X extends ObservableInput<any, infer A> ? A : never
export type ErrorOf<X> = X extends ObservableInput<infer E, any> ? E : never

export const ObservableTypeId = Symbol.for('@principia/observable/Observable')
export type ObservableTypeId = typeof ObservableTypeId

export class Observable<E, A> implements Subscribable<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A;

  readonly [ObservableTypeId]: ObservableTypeId = ObservableTypeId

  /** @internal */
  protected source: Observable<any, any> | undefined
  /** @internal */
  protected operator: Operator<E, A> | undefined

  constructor(subscribe?: (this: Observable<E, A>, subscriber: Subscriber<E, A>) => Finalizer) {
    if (subscribe) {
      this.subscribeInternal = subscribe
    }
  }

  /** @internal */
  lift<E1, A1>(operator: Operator<E1, A1>): Observable<E1, A1> {
    const observable    = new Observable<E1, A1>()
    observable.source   = this
    observable.operator = operator
    return observable
  }

  subscribe(observer?: Partial<Observer<E, A>>): Subscription
  subscribe(observer?: (value: A) => void): Subscription
  subscribe(observer?: Partial<Observer<E, A>> | ((value: A) => void)): Subscription {
    const subscriber: Subscriber<E, A> = isSubscriber(observer) ? observer : new SafeSubscriber(observer)

    subscriber.add(
      this.operator
        ? this.operator.call(subscriber, this.source)
        : this.source
        ? this.subscribeInternal(subscriber)
        : this.trySubscribe(subscriber)
    )

    return subscriber
  }

  /** @internal */
  protected trySubscribe(subscriber: Subscriber<E, A>): Finalizer {
    try {
      return this.subscribeInternal(subscriber)
    } catch (err) {
      subscriber.defect(err)
      return noop
    }
  }

  /** @internal */
  protected subscribeInternal(subscriber: Subscriber<E, A>): Finalizer {
    this.source?.subscribe(subscriber)
  }
}

export const EMPTY: Observable<never, never> = new Observable((subscriber) => subscriber.complete())

export function isObservable(u: unknown): u is Observable<unknown, unknown> {
  return isObject(u) && ObservableTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function defect(defect: unknown): Observable<never, never> {
  return new Observable((s) => s.defect(defect))
}

export function defer<E, A>(observable: () => ObservableInput<E, A>): Observable<E, A> {
  return new Observable((s) => {
    from(observable()).subscribe(s)
  })
}

export function empty<A>(): Observable<never, A> {
  return EMPTY
}

export function fail<E>(e: E): Observable<E, never> {
  return new Observable((s) => s.error(e))
}

export function from<E = never, A = never>(input: ObservableInput<E, A>): Observable<E, A> {
  if (input instanceof Observable) {
    return input
  }
  if (isArrayLike(input)) {
    return fromArrayLike(input)
  }
  if (isPromiseLike(input)) {
    return fromPromise(input)
  }
  if (isAsyncIterable(input)) {
    return fromAsyncIterable(input)
  }
  if (isIterable(input)) {
    return fromIterable(input)
  }
  if (isReadableStream(input)) {
    return fromReadableStreamLike(input)
  }
  if (IO.isIO(input)) {
    return fromIO(input)
  }
  if ('subscribe' in input) {
    return fromSubscribable(input)
  }
  throw new TypeError('Invalid Observable input')
}

export function fromArrayLike<A>(input: ArrayLike<A>): Observable<never, A> {
  return new Observable((s) => {
    for (let i = 0; i < input.length && !s.closed; i++) {
      s.next(input[i])
    }
    s.complete()
  })
}

export function fromAsyncIterable<A>(asyncIterable: AsyncIterable<A>): Observable<never, A> {
  return new Observable((s) => {
    process(asyncIterable, s).catch((err) => s.defect(err))
  })
}

export function fromIterable<A>(iterable: Iterable<A>): Observable<never, A> {
  return new Observable((s) => {
    for (const value of iterable) {
      s.next(value)
      if (s.closed) {
        return
      }
    }
    s.complete()
  })
}

export function fromPromise<A>(promise: PromiseLike<A>): Observable<never, A> {
  return new Observable((s) => {
    promise
      .then(
        (value) => {
          if (!s.closed) {
            s.next(value)
            s.complete()
          }
        },
        (err) => s.defect(err)
      )
      .then(null, reportUnhandledError)
  })
}

export function fromReadableStreamLike<A>(readableStream: ReadableStreamLike<A>): Observable<never, A> {
  return fromAsyncIterable(readableStreamToAsyncGenerator(readableStream))
}

export function fromSubscribable<E, A>(subscribable: Subscribable<E, A>): Observable<E, A> {
  return new Observable((subscriber) => subscribable.subscribe(subscriber))
}

export function fromInterop<A>(subscribable: {
  subscribe: (observer: {
    next: (value: A) => void
    error: (err: unknown) => void
    complete: () => void
  }) => Unsubscribable
}): Observable<unknown, A> {
  return new Observable((subscriber) =>
    subscribable.subscribe({
      next: (value) => subscriber.next(value),
      error: (err) => subscriber.defect(err),
      complete: () => subscriber.complete()
    })
  )
}

function _if<E, A, E1, B>(
  condition: () => boolean,
  onTrue: ObservableInput<E, A>,
  onFalse: ObservableInput<E1, B>
): Observable<E | E1, A | B> {
  return defer<E | E1, A | B>(() => (condition() ? onTrue : onFalse))
}

export { _if as if }

export interface IterateOptions<S> {
  readonly initialState: S
  readonly cont?: (state: S) => boolean
  readonly iterate: (state: S) => S
  readonly scheduler?: SchedulerLike
}

export function iterate<S>(options: IterateOptions<S>): Observable<never, S> {
  const { initialState, cont, iterate, scheduler } = options

  function* gen() {
    for (let state = initialState; !cont || cont(state); state = iterate(state)) {
      yield state
    }
  }

  return defer(scheduler ? () => scheduleIterable(gen(), scheduler!) : gen)
}

async function process<A>(asyncIterable: AsyncIterable<A>, subscriber: Subscriber<never, A>) {
  for await (const value of asyncIterable) {
    subscriber.next(value)
    if (subscriber.closed) {
      return
    }
  }
  subscriber.complete()
}

export function interval(period = 0, scheduler: SchedulerLike = asyncScheduler): Observable<never, number> {
  if (period < 0) {
    // eslint-disable-next-line no-param-reassign
    period = 0
  }

  return timer(period, period, scheduler)
}

export function merge<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): Observable<ErrorOf<O[number]>, TypeOf<O[number]>>
export function merge<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: [...O, number?]
): Observable<ErrorOf<O[number]>, TypeOf<O[number]>>
export function merge<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: [...O, number?]
): Observable<ErrorOf<O[number]>, TypeOf<O[number]>> {
  const concurrency = popNumber(sources, Infinity)
  return !sources.length
    ? empty()
    : sources.length === 1
    ? from(sources[0] as ObservableInput<any, any>)
    : mergeAll_(fromArrayLike(sources as ReadonlyArray<ObservableInput<any, any>>), concurrency)
}

export function of<A>(...items: ReadonlyArray<A>): Observable<never, A> {
  return fromArrayLike(items)
}

export function single<A>(a: A): Observable<never, A> {
  return new Observable((s) => {
    s.next(a)
    s.complete()
  })
}

export function scheduled<E, A>(input: ObservableInput<E, A>, scheduler: SchedulerLike): Observable<E, A> {
  if (isArrayLike(input)) {
    return scheduleArray(input, scheduler)
  }
  if (isPromiseLike(input)) {
    return schedulePromise(input, scheduler)
  }
  if (isIterable(input)) {
    return scheduleIterable(input, scheduler)
  }
  if (isAsyncIterable(input)) {
    return scheduleAsyncIterable(input, scheduler)
  }
  if (isReadableStream(input)) {
    return scheduleReadableStreamLike(input, scheduler)
  }
  return scheduleObservable(from(input), scheduler)
}

export function scheduleArray<A>(input: ArrayLike<A>, scheduler: SchedulerLike): Observable<never, A> {
  return new Observable<never, A>((s) => {
    let i = 0
    return scheduler.schedule(function () {
      if (i === input.length) {
        s.complete()
      } else {
        s.next(input[i++])
        if (!s.closed) {
          this.schedule()
        }
      }
    })
  })
}

export function scheduleAsyncIterable<A>(input: AsyncIterable<A>, scheduler: SchedulerLike): Observable<never, A> {
  return new Observable((subscriber) => {
    const sub = new Subscription()
    sub.add(
      scheduler.schedule(() => {
        const iterator = input[Symbol.asyncIterator]()
        sub.add(
          scheduler.schedule(function () {
            iterator.next().then((result) => {
              if (result.done) {
                subscriber.complete()
              } else {
                subscriber.next(result.value)
                this.schedule()
              }
            })
          })
        )
      })
    )
    return sub
  })
}

export function scheduleIterable<A>(input: Iterable<A>, scheduler: SchedulerLike): Observable<never, A> {
  return new Observable((s) => {
    let iterator: Iterator<A, A>
    s.add(
      scheduler.schedule(() => {
        iterator = input[Symbol.iterator]()
        caughtSchedule(s, scheduler, function () {
          const { value, done } = iterator.next()
          if (done) {
            s.complete()
          } else {
            s.next(value)
            this.schedule()
          }
        })
      })
    )

    return () => isFunction(iterator?.return) && iterator.return()
  })
}

export function scheduleObservable<E, A>(input: Observable<E, A>, scheduler: SchedulerLike): Observable<E, A> {
  return new Observable((subscriber) => {
    const sub = new Subscription()
    sub.add(
      scheduler.schedule(() => {
        sub.add(
          input.subscribe({
            next: (value) => {
              sub.add(scheduler.schedule(() => subscriber.next(value)))
            },
            error: (err) => {
              sub.add(scheduler.schedule(() => subscriber.error(err)))
            },
            defect: (err) => {
              sub.add(scheduler.schedule(() => subscriber.defect(err)))
            },
            complete: () => {
              sub.add(scheduler.schedule(() => subscriber.complete()))
            }
          })
        )
      })
    )
  })
}

export function schedulePromise<A>(input: PromiseLike<A>, scheduler: SchedulerLike): Observable<never, A> {
  return new Observable((subscriber) => {
    return scheduler.schedule(() => {
      input.then(
        (value) => {
          subscriber.add(
            scheduler.schedule(() => {
              subscriber.next(value)
              subscriber.add(scheduler.schedule(() => subscriber.complete()))
            })
          )
        },
        (err) => {
          subscriber.add(scheduler.schedule(() => subscriber.defect(err)))
        }
      )
    })
  })
}

export function scheduleReadableStreamLike<A>(
  input: ReadableStreamLike<A>,
  scheduler: SchedulerLike
): Observable<never, A> {
  return scheduleAsyncIterable(readableStreamToAsyncGenerator(input), scheduler)
}

export function timer(time: number | Date, interval?: number, scheduler?: SchedulerLike): Observable<never, number>
export function timer(time: number | Date, scheduler?: SchedulerLike): Observable<never, number>
export function timer(
  time: number | Date = 0,
  intervalOrScheduler?: number | SchedulerLike,
  scheduler: SchedulerLike = asyncScheduler
): Observable<never, number> {
  let intervalDuration = -1
  if (intervalOrScheduler != null) {
    if (isScheduler(intervalOrScheduler)) {
      // eslint-disable-next-line no-param-reassign
      scheduler = intervalOrScheduler
    } else {
      intervalDuration = intervalOrScheduler as number
    }
  }
  return new Observable((s) => {
    let due = isValidDate(time) ? +time - scheduler.now() : time
    if (due < 0) {
      due = 0
    }
    let n = 0
    return scheduler.schedule(function () {
      if (!s.closed) {
        s.next(n++)
        if (0 <= intervalDuration) {
          this.schedule(undefined, intervalDuration)
        } else {
          s.complete()
        }
      }
    }, due)
  })
}

export function zip<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): Observable<ErrorOf<O[number]>, { [K in keyof O]: TypeOf<O[K]> }> {
  return sources.length
    ? new Observable((subscriber) => {
        let buffers: unknown[][] = sources.map(() => [])
        let completed            = sources.map(() => false)
        subscriber.add(() => {
          buffers = completed = null!
        })
        for (let sourceIndex = 0; !subscriber.closed && sourceIndex < sources.length; sourceIndex++) {
          from(sources[sourceIndex]).subscribe(
            operatorSubscriber(subscriber, {
              next: (value) => {
                buffers[sourceIndex].push(value)
                if (buffers.every((buffer) => buffer.length)) {
                  const result: any = buffers.map((buffer) => buffer.shift()!)
                  subscriber.next(result)
                  if (buffers.some((buffer, i) => !buffer.length && completed[i])) {
                    subscriber.complete()
                  }
                }
              },
              complete: () => {
                completed[sourceIndex] = true
                !buffers[sourceIndex].length && subscriber.complete()
              }
            })
          )
        }
        return () => {
          buffers = completed = null!
        }
      })
    : empty()
}

export class InterruptedDefect<Id> {
  readonly _tag = 'InterruptedDefect'
  constructor(readonly id: Id) {}
}

export function fromIO<E, A>(io: IO.IO<IOEnv, E, A>): Observable<E, A> {
  return new Observable((s) => {
    let fiber: FiberContext<E, A>
    const scheduled = asyncScheduler.schedule(() => {
      fiber = IO.runFiber(io)
      fiber.awaitAsync((exit) => {
        if (!s.closed) {
          pipe(
            exit,
            Ex.match(
              (cause) =>
                pipe(
                  cause,
                  Ca.failureOrCause,
                  E.match(
                    (e) => {
                      s.error(e)
                    },
                    flow(
                      Ca.haltOption,
                      M.orElse(() =>
                        pipe(
                          cause,
                          Ca.interruptOption,
                          M.map((id) => new InterruptedDefect(id))
                        )
                      ),
                      M.match(noop, (defect) => {
                        s.defect(defect)
                      })
                    )
                  )
                ),
              (a) => {
                s.next(a)
              }
            )
          )
          s.complete()
        }
      })
    })
    return () => {
      scheduled.unsubscribe()
      fiber && IO.run_(Fi.interrupt(fiber))
    }
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Observable<never, A> {
  return new Observable((s) => {
    s.next(a)
    s.complete()
  })
}

export function unit(): Observable<never, void> {
  return pure(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<E, A, E1, B, C>(
  fa: Observable<E, A>,
  fb: Observable<E1, B>,
  f: (a: A, b: B) => C
): Observable<E | E1, C> {
  return mergeMap_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, E1, B, C>(
  fb: Observable<E1, B>,
  f: (a: A, b: B) => C
): <E>(fa: Observable<E, A>) => Observable<E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<E, A, E1, B>(fa: Observable<E, A>, fb: Observable<E1, B>): Observable<E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<E1, B>(
  fb: Observable<E1, B>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<E, A, E1, B>(fab: Observable<E, (a: A) => B>, fa: Observable<E1, A>): Observable<E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<E1, A>(fa: Observable<E1, A>): <E, B>(fab: Observable<E, (a: A) => B>) => Observable<E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function imap_<E, A, B>(fa: Observable<E, A>, f: (i: number, a: A) => B): Observable<E, B> {
  return operate_(fa, (source, subscriber) => {
    let i = 0
    source.subscribe(
      new OperatorSubscriber(subscriber, {
        next: (value) => {
          subscriber.next(f(i++, value))
        }
      })
    )
  })
}

export function imap<A, B>(f: (i: number, a: A) => B): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => imap_(fa, f)
}

export function map_<E, A, B>(fa: Observable<E, A>, f: (a: A) => B): Observable<E, B> {
  return imap_(fa, (_, a) => f(a))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => map_(fa, f)
}

export function as_<E, A, B>(fa: Observable<E, A>, b: B): Observable<E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <E, A>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => as_(fa, b)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<E, A, E1>(fa: Observable<E, A>, f: (e: E) => E1): Observable<E1, A> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      new OperatorSubscriber(subscriber, {
        error: (err) => {
          subscriber.error(f(err))
        }
      })
    )
  })
}

export function mapError<E, E1>(f: (e: E) => E1): <A>(fa: Observable<E, A>) => Observable<E1, A> {
  return (fa) => mapError_(fa, f)
}

export function swap<E, A>(fa: Observable<E, A>): Observable<A, E> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      new OperatorSubscriber(subscriber, {
        next: (value) => {
          subscriber.error(value)
        },
        error: (err) => {
          subscriber.next(err)
        }
      })
    )
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function ifilter_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, B>
export function ifilter_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A>
export function ifilter_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, { next: (value) => predicate(index++, value) && subscriber.next(value) })
    )
  })
}

export function ifilter<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, B>
export function ifilter<A>(predicate: PredicateWithIndex<number, A>): <E>(fa: Observable<E, A>) => Observable<E, A>
export function ifilter<A>(predicate: PredicateWithIndex<number, A>): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<E, A, B extends A>(fa: Observable<E, A>, refinement: Refinement<A, B>): Observable<E, B>
export function filter_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, A>
export function filter_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Observable<E, A>) => Observable<E, B>
export function filter<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, A>
export function filter<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<E, A, B>(fa: Observable<E, A>, f: (i: number, a: A) => M.Maybe<B>): Observable<E, B> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, { next: (value) => M.match_(f(index++, value), noop, (b) => subscriber.next(b)) })
    )
  })
}

export function ifilterMap<A, B>(f: (i: number, a: A) => M.Maybe<B>): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => ifilterMap_(fa, f)
}

export function filterMap_<E, A, B>(fa: Observable<E, A>, f: (a: A) => M.Maybe<B>): Observable<E, B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

export function filterMap<A, B>(f: (a: A) => M.Maybe<B>): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => filterMap_(fa, f)
}

export function ipartition_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function ipartition_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): readonly [Observable<E, A>, Observable<E, A>]
export function ipartition_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): readonly [Observable<E, A>, Observable<E, A>] {
  return [ifilter_(fa, (i, a) => !predicate(i, a)), ifilter_(fa, predicate)]
}

export function ipartition<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function ipartition<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>]
export function ipartition<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: Refinement<A, B>
): readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function partition_<E, A>(
  fa: Observable<E, A>,
  predicate: Predicate<A>
): readonly [Observable<E, A>, Observable<E, A>]
export function partition_<E, A>(
  fa: Observable<E, A>,
  predicate: Predicate<A>
): readonly [Observable<E, A>, Observable<E, A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function partition<A>(
  predicate: Predicate<A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>]
export function partition<A>(
  predicate: Predicate<A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>] {
  return (fa) => partition_(fa, predicate)
}

export function ipartitionMap_<E, A, B, C>(
  fa: Observable<E, A>,
  f: (i: number, a: A) => E.Either<B, C>
): readonly [Observable<E, B>, Observable<E, C>] {
  return [
    operate_(fa, (source, subscriber) => {
      let index = 0
      source.subscribe(
        operatorSubscriber(subscriber, {
          next: (value) => {
            E.match_(f(index++, value), (b) => subscriber.next(b), noop)
          }
        })
      )
    }),
    operate_(fa, (source, subscriber) => {
      let index = 0
      source.subscribe(
        operatorSubscriber(subscriber, {
          next: (value) => {
            E.match_(f(index++, value), noop, (c) => subscriber.next(c))
          }
        })
      )
    })
  ]
}

export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => E.Either<B, C>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, B>, Observable<E, C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<E, A, B, C>(
  fa: Observable<E, A>,
  f: (a: A) => E.Either<B, C>
): readonly [Observable<E, B>, Observable<E, C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, B>, Observable<E, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function imergeMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (i: number, a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return operate_(ma, (source, sub) => mergeInternal(source, sub, f, concurrent))
}

export function imergeMap<A, E1, B>(
  f: (i: number, a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => imergeMap_(ma, f, concurrent)
}

export function mergeMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return imergeMap_(ma, (_, a) => f(a), concurrent)
}

export function mergeMap<A, E1, B>(
  f: (a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => mergeMap_(ma, f, concurrent)
}

export function iconcatMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (i: number, a: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return imergeMap_(ma, f, 1)
}

export function iconcatMap<A, E1, B>(
  f: (i: number, a: A) => ObservableInput<E1, B>
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => iconcatMap_(ma, f)
}

export function concatMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (a: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return imergeMap_(ma, (_, a) => f(a), 1)
}

export function concatMap<A, E1, B>(
  f: (a: A) => ObservableInput<E1, B>
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => concatMap_(ma, f)
}

export function flatten<E, E1, A>(mma: Observable<E, Observable<E1, A>>): Observable<E | E1, A> {
  return concatAll(mma)
}

export function switchFlatten<E, E1, A>(mma: Observable<E, Observable<E1, A>>): Observable<E | E1, A> {
  return switchMap_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldl_<E, A, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (index: number, acc: B, value: A) => B
): Observable<E, B> {
  return operate_(fa, scanInternal(f, initial, true, false, true))
}

export function ifoldl<A, B>(
  initial: B,
  f: (index: number, acc: B, value: A) => B
): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => ifoldl_(fa, initial, f)
}

export function foldl_<E, A, B>(fa: Observable<E, A>, initial: B, f: (acc: B, value: A) => B): Observable<E, B> {
  return ifoldl_(fa, initial, (_, b, a) => f(b, a))
}

export function foldl<A, B>(initial: B, f: (acc: B, value: A) => B): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => foldl_(fa, initial, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function at_<E, A>(fa: Observable<E, A>, index: number): Observable<E, M.Maybe<A>> {
  return pipe(
    fa,
    ifilter((i, _) => i === index),
    take(1),
    map(M.just),
    onEmpty(() => M.nothing())
  )
}

export function at(index: number): <E, A>(fa: Observable<E, A>) => Observable<E, M.Maybe<A>> {
  return (fa) => at_(fa, index)
}

export function audit_<E, A, E1>(
  fa: Observable<E, A>,
  durationSelector: (value: A) => ObservableInput<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let lastValue: M.Maybe<A> = M.nothing()
    let durationSubscriber: Subscriber<any, any> | null = null
    let isComplete    = false
    const endDuration = () => {
      durationSubscriber?.unsubscribe()
      durationSubscriber = null
      if (M.isJust(lastValue)) {
        const { value } = lastValue
        lastValue       = M.nothing()
        subscriber.next(value)
      }
      isComplete && subscriber.complete()
    }

    const cleanupDuration = () => {
      durationSubscriber = null
      isComplete && subscriber.complete()
    }

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          lastValue = M.just(value)
          if (!durationSubscriber) {
            from(durationSelector(value)).subscribe(
              (durationSubscriber = operatorSubscriber(subscriber, { next: endDuration, complete: cleanupDuration }))
            )
          }
        },
        complete: () => {
          isComplete = true
          ;(M.isNothing(lastValue) || !durationSubscriber || durationSubscriber.closed) && subscriber.complete()
        }
      })
    )
  })
}

export function audit<A, E1>(
  durationSelector: (value: A) => ObservableInput<E1, any>
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => audit_(fa, durationSelector)
}

export function auditTime_<E, A>(
  fa: Observable<E, A>,
  duration: number,
  scheduler: SchedulerLike = asyncScheduler
): Observable<E, A> {
  return audit_(fa, () => timer(duration, scheduler))
}

export function auditTime(
  duration: number,
  scheduler: SchedulerLike = asyncScheduler
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => auditTime_(fa, duration, scheduler)
}

export function buffer_<E, A, E1>(
  fa: Observable<E, A>,
  closingNotifier: Observable<E1, any>
): Observable<E | E1, ReadonlyArray<A>> {
  return operate_(fa, (source, subscriber) => {
    let buffer: A[] = []
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => buffer.push(value),
        complete: () => {
          subscriber.next(buffer)
          subscriber.complete()
        }
      })
    )
    closingNotifier.subscribe(
      operatorSubscriber(subscriber, {
        next: () => {
          const b = buffer
          buffer  = []
          subscriber.next(b)
        },
        complete: noop
      })
    )
    return () => {
      buffer = null!
    }
  })
}

export function buffer<E1>(
  closingNotifier: Observable<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, ReadonlyArray<A>> {
  return (fa) => buffer_(fa, closingNotifier)
}

export function bufferCount_<E, A>(
  fa: Observable<E, A>,
  bufferSize: number,
  startBufferEvery?: number
): Observable<E, ReadonlyArray<A>> {
  // eslint-disable-next-line no-param-reassign
  startBufferEvery = startBufferEvery ?? bufferSize
  return operate_(fa, (source, subscriber) => {
    let buffers: A[][] = []
    let count          = 0
    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            let toEmit: A[][] | null = null
            if (count++ % startBufferEvery! === 0) {
              buffers.push([])
            }
            for (const buffer of buffers) {
              buffer.push(value)
              if (bufferSize <= buffer.length) {
                toEmit = toEmit ?? []
                toEmit.push(buffer)
              }
            }
            if (toEmit) {
              for (const buffer of toEmit) {
                arrayRemove(buffers, buffer)
                subscriber.next(buffer)
              }
            }
          },
          complete: () => {
            for (const buffer of buffers) {
              subscriber.next(buffer)
            }
            subscriber.complete()
          }
        },
        () => {
          buffers = null!
        }
      )
    )
  })
}

export interface BufferTimeConfig {
  readonly bufferTimeSpan: number
  readonly bufferCreationInterval?: number
  readonly maxBufferSize?: number
  readonly scheduler?: SchedulerLike
}

export function bufferTime_<E, A>(fa: Observable<E, A>, config: BufferTimeConfig): Observable<E, ReadonlyArray<A>> {
  const { bufferTimeSpan, bufferCreationInterval = null, maxBufferSize = Infinity, scheduler = asyncScheduler } = config
  return operate_(fa, (source, subscriber) => {
    let bufferRecords: { buffer: A[], subs: Subscription }[] | null = []
    let restartOnEmit = true
    const emit        = (record: { buffer: A[], subs: Subscription }) => {
      const { buffer, subs } = record
      subs.unsubscribe()
      arrayRemove(bufferRecords, record)
      subscriber.next(buffer)
      restartOnEmit && startBuffer()
    }
    const startBuffer = () => {
      if (bufferRecords) {
        const subs = new Subscription()
        subscriber.add(subs)
        const buffer: A[] = []
        const record      = {
          buffer,
          subs
        }
        bufferRecords.push(record)
        subs.add(scheduler.schedule(() => emit(record), bufferTimeSpan))
      }
    }
    bufferCreationInterval !== null && bufferCreationInterval >= 0
      ? subscriber.add(
          scheduler.schedule(function () {
            startBuffer()
            !this.closed && subscriber.add(this.schedule(null, bufferCreationInterval))
          }, bufferCreationInterval)
        )
      : (restartOnEmit = true)
    startBuffer()
    const bufferTimeSubscriber = operatorSubscriber(
      subscriber,
      {
        next: (value: A) => {
          const recordsCopy = bufferRecords!.slice()
          for (const record of recordsCopy) {
            const { buffer } = record
            buffer.push(value)
            maxBufferSize <= buffer.length && emit(record)
          }
        },
        complete: () => {
          while (bufferRecords?.length) {
            subscriber.next(bufferRecords.shift()!.buffer)
          }
          bufferTimeSubscriber?.unsubscribe()
          subscriber.complete()
          subscriber.unsubscribe()
        }
      },
      () => (bufferRecords = null)
    )
    source.subscribe(bufferTimeSubscriber)
  })
}

export function bufferTime(config: BufferTimeConfig): <E, A>(fa: Observable<E, A>) => Observable<E, ReadonlyArray<A>> {
  return (fa) => bufferTime_(fa, config)
}

export function bufferToggle_<E, A, E1, B, E2>(
  fa: Observable<E, A>,
  openings: ObservableInput<E1, B>,
  closingSelector: (value: B) => ObservableInput<E2, any>
): Observable<E | E1 | E2, ReadonlyArray<A>> {
  return operate_(fa, (source, subscriber) => {
    const buffers: A[][] = []
    from(openings).subscribe(
      operatorSubscriber(subscriber, {
        next: (openValue) => {
          const buffer: A[] = []
          buffers.push(buffer)
          const closingSubscription = new Subscription()
          const emitBuffer          = () => {
            arrayRemove(buffers, buffer)
            subscriber.next(buffer)
            closingSubscription.unsubscribe()
          }
          closingSubscription.add(
            from(closingSelector(openValue)).subscribe(
              operatorSubscriber(subscriber, { next: emitBuffer, complete: noop })
            )
          )
        },
        complete: noop
      })
    )
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          for (const buffer of buffers) {
            buffer.push(value)
          }
        },
        complete: () => {
          while (buffers.length > 0) {
            subscriber.next(buffers.shift()!)
          }
          subscriber.complete()
        }
      })
    )
  })
}

export function bufferToggle<E1, B, E2>(
  openings: ObservableInput<E1, B>,
  closingSelector: (value: B) => ObservableInput<E2, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1 | E2, ReadonlyArray<A>> {
  return (fa) => bufferToggle_(fa, openings, closingSelector)
}

export function bufferWhen_<E, A, E1>(
  fa: Observable<E, A>,
  closingSelector: () => ObservableInput<E1, any>
): Observable<E | E1, ReadonlyArray<A>> {
  return operate_(fa, (source, subscriber) => {
    let buffer: A[] | null = null
    let closingSubscriber: Subscriber<E | E1, A> | null = null
    const openBuffer = () => {
      closingSubscriber?.unsubscribe()
      const b = buffer
      buffer  = []
      b && subscriber.next(b)
      from(closingSelector()).subscribe(
        (closingSubscriber = operatorSubscriber(subscriber, { next: openBuffer, complete: noop }))
      )
    }
    openBuffer()
    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => buffer?.push(value),
          complete: () => {
            buffer && subscriber.next(buffer)
            subscriber.complete()
          }
        },
        () => (buffer = closingSubscriber = null)
      )
    )
  })
}

export function bufferWhen<E1>(
  closingSelector: () => ObservableInput<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, ReadonlyArray<A>> {
  return (fa) => bufferWhen_(fa, closingSelector)
}

export function catchDefect_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (err: unknown, caught: Observable<E | E1, A | B>) => ObservableInput<E1, B>
): Observable<E | E1, A | B> {
  return operate_(fa, (source, subscriber) => {
    let innerSub: Subscription | null = null
    let syncUnsub                     = false
    let handledResult: Observable<E1, B>
    innerSub                          = source.subscribe(
      operatorSubscriber(subscriber, {
        defect: (err) => {
          handledResult = from(f(err, catchDefect_(source, f)))
          if (innerSub) {
            innerSub.unsubscribe()
            innerSub = null
            handledResult.subscribe(subscriber)
          } else {
            syncUnsub = true
          }
        }
      })
    )
    if (syncUnsub) {
      innerSub.unsubscribe()
      innerSub = null
      handledResult!.subscribe(subscriber)
    }
  })
}

export function catchDefect<E, A, E1, B>(
  f: (err: unknown, caught: Observable<E | E1, A | B>) => ObservableInput<E1, B>
): (fa: Observable<E, A>) => Observable<E | E1, A | B> {
  return (fa) => catchDefect_(fa, f)
}

export function concatAll<E, E1, A>(ffa: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A> {
  return mergeAll_(ffa, 1)
}

export function concat_<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
  fa: Observable<E, A>,
  ...sources: O
): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return operate_(fa, (source, subscriber) => {
    concatAll(fromArrayLike([source, ...sources])).subscribe(subscriber)
  })
}

export function concat<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): <E, A>(fa: Observable<E, A>) => Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return (fa) => concat_(fa, ...sources)
}

export function count<E, A>(fa: Observable<E, A>): Observable<E, number> {
  return foldl_(fa, 0, (total, _) => total + 1)
}

export function icountWith_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, number> {
  return ifoldl_(fa, 0, (i, total, v) => (predicate(i, v) ? total + 1 : total))
}

export function icountWith<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number> {
  return (fa) => icountWith_(fa, predicate)
}

export function countWith_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, number> {
  return icountWith_(fa, (_, a) => predicate(a))
}

export function countWith<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, number> {
  return (fa) => countWith_(fa, predicate)
}

export function combineLatestAll<E, E1, A>(
  fa: Observable<E, ObservableInput<E1, A>>
): Observable<E | E1, ReadonlyArray<A>> {
  return joinAllInternal(fa, (sources) => combineLatest_(...sources) as any)
}

export function combineLatest_<A extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: A
): Observable<ErrorOf<A[number]>, { [K in keyof A]: TypeOf<A[K]> }> {
  if (!sources.length) {
    return empty()
  }
  const [s0, ...rest] = sources
  return operate_(from(s0), (source, subscriber) => {
    combineLatestInternal(subscriber, [source, ...rest])
  })
}

export function combineLatest<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): <E, A>(fa: Observable<E, A>) => Observable<E | ErrorOf<O[number]>, [A, ...{ [K in keyof O]: TypeOf<O[K]> }]> {
  return (fa) => combineLatest_(fa, ...sources)
}

export function debounceWith_<E, A, E1>(
  fa: Observable<E, A>,
  durationSelector: (value: A) => ObservableInput<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let lastValue: M.Maybe<A> = M.nothing()
    let durationSubscriber: Subscriber<E1, any> | null = null
    const emit = () => {
      durationSubscriber?.unsubscribe()
      durationSubscriber = null
      if (M.isJust(lastValue)) {
        const { value } = lastValue
        lastValue       = M.nothing()
        subscriber.next(value)
      }
    }
    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            durationSubscriber?.unsubscribe()
            lastValue          = M.just(value)
            durationSubscriber = operatorSubscriber(subscriber, { next: emit, complete: noop })
            from(durationSelector(value)).subscribe(durationSubscriber)
          },
          complete: () => {
            emit()
            subscriber.complete()
          }
        },
        () => {
          lastValue = durationSubscriber = null!
        }
      )
    )
  })
}

export function debounceWith<A, E1>(
  durationSelector: (value: A) => ObservableInput<E1, any>
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => debounceWith_(fa, durationSelector)
}

export function debounce_<E, A>(
  fa: Observable<E, A>,
  dueTime: number,
  scheduler: SchedulerLike = asyncScheduler
): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let activeTask: Subscription | null = null
    let lastValue: A | null             = null
    let lastTime: number | null         = null

    const emit = () => {
      if (activeTask) {
        activeTask.unsubscribe()
        activeTask  = null
        const value = lastValue!
        lastValue   = null
        subscriber.next(value)
      }
    }
    function emitWhenIdle(this: SchedulerAction<unknown>) {
      const targetTime = lastTime! + dueTime
      const now        = scheduler.now()
      if (now < targetTime) {
        activeTask = this.schedule(undefined, targetTime - now)
        subscriber.add(activeTask)
        return
      }
      emit()
    }
    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            lastValue = value
            lastTime  = scheduler.now()
            if (!activeTask) {
              activeTask = scheduler.schedule(emitWhenIdle, dueTime)
              subscriber.add(activeTask)
            }
          },
          complete: () => {
            emit()
            subscriber.complete()
          }
        },
        () => {
          lastValue = activeTask = null
        }
      )
    )
  })
}

export function debounce(
  dueTime: number,
  scheduler: SchedulerLike = asyncScheduler
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => debounce_(fa, dueTime, scheduler)
}

export function either<E, A>(fa: Observable<E, A>): Observable<never, Either<E, A>> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          subscriber.next(E.right(value))
        },
        error: (error) => {
          subscriber.next(E.left(error))
        }
      })
    )
  })
}

export function idelayWith_<E, A, E1>(
  fa: Observable<E, A>,
  f: (index: number, value: A) => Observable<E1, any>
): Observable<E | E1, A> {
  return imergeMap_(fa, (i, a) => pipe(f(i, a), take(1), as(a)))
}

export function idelayWith<A, E1>(
  f: (index: number, value: A) => Observable<E1, any>
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => idelayWith_(fa, f)
}

export function delayWith_<E, A, E1>(
  fa: Observable<E, A>,
  f: (value: A) => Observable<E1, any>
): Observable<E | E1, A> {
  return idelayWith_(fa, (_, a) => f(a))
}

export function delayWith<A, E1>(
  f: (value: A) => Observable<E1, any>
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => delayWith_(fa, f)
}

export function delay_<E, A>(
  fa: Observable<E, A>,
  due: number | Date,
  scheduler: SchedulerLike = asyncScheduler
): Observable<E, A> {
  const duration = timer(due, scheduler)
  return delayWith_(fa, () => duration)
}

export function delay(
  due: number | Date,
  scheduler: SchedulerLike = asyncScheduler
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => delay_(fa, due, scheduler)
}

export function dematerialize<E, E1, A>(fa: Observable<E, Notification<E1, A>>): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(operatorSubscriber(subscriber, { next: (notification) => N.observe_(notification, subscriber) }))
  })
}

export function ensuring_<E, A>(fa: Observable<E, A>, finalizer: () => void): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(subscriber)
    subscriber.add(finalizer)
  })
}

export function ensuring(finalizer: () => void): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => ensuring_(fa, finalizer)
}

export function exhaustAll<E, E1, A>(ffa: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A> {
  return operate_(ffa, (source, subscriber) => {
    let isComplete                    = false
    let innerSub: Subscription | null = null
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (inner) => {
          if (!innerSub) {
            innerSub = from(inner).subscribe(
              operatorSubscriber(subscriber, {
                complete: () => {
                  innerSub = null
                  isComplete && subscriber.complete()
                }
              })
            )
          }
        },
        complete: () => {
          isComplete = true
          !innerSub && subscriber.complete()
        }
      })
    )
  })
}

export function iexhaustMap_<E, A, E1, B>(
  ffa: Observable<E, A>,
  f: (i: number, a: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return operate_(ffa, (source, subscriber) => {
    let index = 0
    let innerSub: Subscriber<E1, B> | null = null
    let isComplete = false
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (outerValue) => {
          if (!innerSub) {
            innerSub = operatorSubscriber(subscriber, {
              complete: () => {
                innerSub = null
                isComplete && subscriber.complete()
              }
            })
            from(f(index++, outerValue)).subscribe(innerSub)
          }
        },
        complete: () => {
          isComplete = true
          !innerSub && subscriber.complete()
        }
      })
    )
  })
}

export function iexhaustMap<A, E1, B>(
  f: (i: number, a: A) => ObservableInput<E1, B>
): <E>(ffa: Observable<E, A>) => Observable<E | E1, B> {
  return (ffa) => iexhaustMap_(ffa, f)
}

export function exhaustMap_<E, A, E1, B>(
  ffa: Observable<E, A>,
  f: (a: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return iexhaustMap_(ffa, (_, a) => f(a))
}

export function exhaustMap<A, E1, B>(
  f: (a: A) => ObservableInput<E1, B>
): <E>(ffa: Observable<E, A>) => Observable<E | E1, B> {
  return (ffa) => exhaustMap_(ffa, f)
}

export function iexpand_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (i: number, a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  // eslint-disable-next-line no-param-reassign
  concurrent = (concurrent || 0) < 1 ? Infinity : concurrent
  return operate_(fa, (source, subscriber) => mergeInternal(source, subscriber, f, concurrent, undefined, true))
}

export function iexpand<A, E1, B>(
  f: (i: number, a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => iexpand_(fa, f, concurrent)
}

export function expand_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return iexpand_(fa, (_, a) => f(a), concurrent)
}

export function expand<A, E1, B>(
  f: (a: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => expand_(fa, f, concurrent)
}

export function ifind_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, M.Maybe<B>>
export function ifind_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, M.Maybe<A>>
export function ifind_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, M.Maybe<A>> {
  return operate_(fa, findInternal(predicate, 'value'))
}

export function ifind<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<B>>
export function ifind<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<A>>
export function ifind<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<A>> {
  return (fa) => ifind_(fa, predicate)
}

export function find_<E, A, B extends A>(fa: Observable<E, A>, refinement: Refinement<A, B>): Observable<E, M.Maybe<B>>
export function find_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, M.Maybe<A>>
export function find_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, M.Maybe<A>> {
  return ifind_(fa, (_, a) => predicate(a))
}

export function find<A, B extends A>(
  refinement: Refinement<A, B>
): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<B>>
export function find<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<A>>
export function find<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, M.Maybe<A>> {
  return (fa) => find_(fa, predicate)
}

export function ifindIndex_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, number>
export function ifindIndex_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, number>
export function ifindIndex_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, number> {
  return operate_(fa, findInternal(predicate, 'index'))
}

export function ifindIndex<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, number>
export function ifindIndex<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number>
export function ifindIndex<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number> {
  return (fa) => ifindIndex_(fa, predicate)
}

export function findIndex_<E, A, B extends A>(fa: Observable<E, A>, refinement: Refinement<A, B>): Observable<E, number>
export function findIndex_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, number>
export function findIndex_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>): Observable<E, number> {
  return ifindIndex_(fa, (_, a) => predicate(a))
}

export function findIndex<A, B extends A>(
  refinement: Refinement<A, B>
): <E>(fa: Observable<E, A>) => Observable<E, number>
export function findIndex<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, number>
export function findIndex<A>(predicate: Predicate<A>): <E>(fa: Observable<E, A>) => Observable<E, number> {
  return (fa) => findIndex_(fa, predicate)
}

export function forkJoin<S extends Record<string, ObservableInput<any, any>>>(
  sources: S
): Observable<ErrorOf<S[keyof S]>, { [K in keyof S]: TypeOf<S[K]> }>
export function forkJoin<A extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: A
): Observable<ErrorOf<A[number]>, { [K in keyof A]: TypeOf<A[K]> }>
export function forkJoin(...args: any[]): Observable<any, any> {
  const { args: sources, keys } = arrayOrObject(args)
  return new Observable((s) => {
    const length = sources.length
    if (!length) {
      s.complete()
      return
    }
    const values             = new Array(length)
    let remainingCompletions = length
    let remainingEmissions   = length
    for (let sourceIndex = 0; sourceIndex < length; sourceIndex++) {
      let hasValue = false
      from(sources[sourceIndex]).subscribe(
        operatorSubscriber(s, {
          next: (value: any) => {
            if (!hasValue) {
              hasValue = true
              remainingEmissions--
            }
            values[sourceIndex] = value
          },
          complete: () => {
            if (!--remainingCompletions || !hasValue) {
              if (!remainingEmissions) {
                s.next(
                  keys
                    ? A.ifoldl_(keys, {}, (i, b, k) => {
                        b[k] = values[i]
                        return b
                      })
                    : values
                )
              }
              s.complete()
            }
          }
        })
      )
    }
  })
}

export function ignore<E, A>(fa: Observable<E, A>): Observable<E, never> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: noop
      })
    )
  })
}

export function isEmpty<E, A>(fa: Observable<E, A>): Observable<E, boolean> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: () => {
          subscriber.next(false)
          subscriber.complete()
        },
        complete: () => {
          subscriber.next(true)
          subscriber.complete()
        }
      })
    )
  })
}

export function materialize<E, A>(fa: Observable<E, A>): Observable<never, Notification<E, A>> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          subscriber.next(N.next(value))
        },
        error: (error) => {
          subscriber.next(N.error(error))
        },
        complete: () => {
          subscriber.next(N.complete())
        },
        defect: (err) => {
          subscriber.next(N.defect(err))
        }
      })
    )
  })
}

export function mergeAll_<E, E1, A>(
  ffa: Observable<E, ObservableInput<E1, A>>,
  concurrent = Infinity
): Observable<E | E1, A> {
  return mergeMap_(ffa, identity, concurrent)
}

export function mergeAll(
  concurrent = Infinity
): <E, E1, A>(ffa: Observable<E, ObservableInput<E1, A>>) => Observable<E | E1, A> {
  return (ffa) => mergeAll_(ffa, concurrent)
}

export function imergeScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (index: number, acc: B, value: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return operate_(fa, (source, subscriber) => {
    let state = initial
    return mergeInternal(
      source,
      subscriber,
      (index, value) => f(index, state, value),
      concurrent,
      (value) => {
        state = value
      },
      false,
      undefined,
      () => (state = null!)
    )
  })
}

export function imergeScan<A, E1, B>(
  initial: B,
  f: (index: number, acc: B, value: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => imergeScan_(fa, initial, f, concurrent)
}

export function mergeScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return imergeScan_(fa, initial, (_, b, a) => f(b, a), concurrent)
}

export function mergeScan<A, E1, B>(
  initial: B,
  f: (acc: B, value: A) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => mergeScan_(fa, initial, f, concurrent)
}

export function onDefectResumeNext_<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
  fa: Observable<E, A>,
  ...sources: O
): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return operate_(fa, (source, subscriber) => {
    const remaining     = [source, ...sources]
    const subscribeNext = () => {
      if (!subscriber.closed) {
        if (remaining.length > 0) {
          let nextSource: Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>>
          try {
            nextSource = from(remaining.shift()!)
          } catch (err) {
            subscribeNext()
            return
          }
          const innerSub = operatorSubscriber(subscriber, { error: noop, defect: noop, complete: noop })
          subscriber.add(nextSource.subscribe(innerSub))
          innerSub.add(subscribeNext)
        } else {
          subscriber.complete()
        }
      }
    }
    subscribeNext()
  })
}

export function onDefectResumeNext<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): <E, A>(fa: Observable<E, A>) => ObservableInput<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return (fa) => onDefectResumeNext_(fa, ...sources)
}

export function onEmpty_<E, A, B>(fa: Observable<E, A>, f: () => B): Observable<E, A | B> {
  return operate_(fa, (source, subscriber) => {
    let hasValue = false
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          hasValue = true
          subscriber.next(value)
        },
        complete: () => {
          if (hasValue) {
            subscriber.complete()
          } else {
            subscriber.next(f())
            subscriber.complete()
          }
        }
      })
    )
  })
}

export function onEmpty<B>(f: () => B): <E, A>(fa: Observable<E, A>) => Observable<E, A | B> {
  return (fa) => onEmpty_(fa, f)
}

export function repeat_<E, A>(fa: Observable<E, A>, count = Infinity): Observable<E, A> {
  return count <= 0
    ? empty()
    : operate_(fa, (source, subscriber) => {
        let repeats = 0
        let innerSub: Subscription | null
        const loop  = () => {
          let syncUnsub = false
          innerSub      = source.subscribe(
            operatorSubscriber(subscriber, {
              complete: () => {
                if (++repeats < count) {
                  if (innerSub) {
                    innerSub.unsubscribe()
                    innerSub = null
                    loop()
                  } else {
                    syncUnsub = true
                  }
                } else {
                  subscriber.complete
                }
              }
            })
          )

          if (syncUnsub) {
            innerSub.unsubscribe()
            innerSub = null
            loop()
          }
        }
        loop()
      })
}

export function repeat(count = Infinity): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => repeat_(fa, count)
}

export interface RetryConfig {
  readonly count: number
  readonly resetOnSuccess?: boolean
}

export function retry_<E, A>(fa: Observable<E, A>, count?: number): Observable<E, A>
export function retry_<E, A>(fa: Observable<E, A>, config: RetryConfig): Observable<E, A>
export function retry_<E, A>(fa: Observable<E, A>, configOrCount: number | RetryConfig = Infinity): Observable<E, A> {
  let config: RetryConfig
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount
  } else {
    config = {
      count: configOrCount
    }
  }

  const { count, resetOnSuccess = false } = config

  return count <= 0
    ? fa
    : operate_(fa, (source, subscriber) => {
        let retries = 0
        let innerSub: Subscription | null
        const loop  = () => {
          let syncUnsub = false
          innerSub      = source.subscribe(
            operatorSubscriber(subscriber, {
              next: (value) => {
                if (resetOnSuccess) {
                  retries = 0
                }
                subscriber.next(value)
              },
              defect: (err) => {
                if (retries++ < count) {
                  if (innerSub) {
                    innerSub.unsubscribe()
                    innerSub = null
                    loop()
                  } else {
                    syncUnsub = true
                  }
                } else {
                  subscriber.defect(err)
                }
              }
            })
          )
          if (syncUnsub) {
            innerSub.unsubscribe()
            innerSub = null
            loop()
          }
        }
        loop()
      })
}

export function retry(count?: number): <E, A>(fa: Observable<E, A>) => Observable<E, A>
export function retry(config: RetryConfig): <E, A>(fa: Observable<E, A>) => Observable<E, A>
export function retry(
  configOrCount: number | RetryConfig = Infinity
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  // @ts-expect-error
  return (fa) => retry_(fa, configOrCount)
}

export function sample_<E, A, E1>(fa: Observable<E, A>, notifier: Observable<E1, any>): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let hasValue            = false
    let lastValue: A | null = null
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          hasValue  = true
          lastValue = value
        }
      })
    )
    const emit = () => {
      if (hasValue) {
        hasValue    = false
        const value = lastValue!
        lastValue   = null
        subscriber.next(value)
      }
    }
    notifier.subscribe(operatorSubscriber(subscriber, { next: emit, complete: noop }))
  })
}

export function sample<E1>(notifier: Observable<E1, any>): <E, A>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => sample_(fa, notifier)
}

export function sampleTime_<E, A>(
  fa: Observable<E, A>,
  period: number,
  scheduler: SchedulerLike = asyncScheduler
): Observable<E, A> {
  return sample_(fa, interval(period, scheduler))
}

export function sampleTime(
  period: number,
  scheduler: SchedulerLike = asyncScheduler
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => sampleTime_(fa, period, scheduler)
}

export function iscanl_<E, A, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (index: number, acc: B, value: A) => B
): Observable<E, B> {
  return operate_(fa, scanInternal(f, initial, true, true))
}

export function iscanl<A, B>(
  initial: B,
  f: (index: number, acc: B, value: A) => B
): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => iscanl_(fa, initial, f)
}

export function scanl_<E, A, B>(fa: Observable<E, A>, initial: B, f: (acc: B, value: A) => B): Observable<E, B> {
  return iscanl_(fa, initial, (_, b, a) => f(b, a))
}

export function scanl<A, B>(initial: B, f: (acc: B, value: A) => B): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => scanl_(fa, initial, f)
}

export function skip_<E, A>(fa: Observable<E, A>, count: number): Observable<E, A> {
  return ifilter_(fa, (index, _) => count <= index)
}

export function skip(count: number): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => skip_(fa, count)
}

export function skipLast_<E, A>(fa: Observable<E, A>, skipCount: number): Observable<E, A> {
  return skipCount <= 0
    ? fa
    : operate_(fa, (source, subscriber) => {
        let ring: A[] = new Array(skipCount)
        let seen      = 0
        source.subscribe(
          operatorSubscriber(subscriber, {
            next: (value) => {
              const valueIndex = seen++
              if (valueIndex < skipCount) {
                ring[valueIndex] = value
              } else {
                const index    = valueIndex % skipCount
                const oldValue = ring[index]
                ring[index]    = value
                subscriber.next(oldValue)
              }
            }
          })
        )

        return () => {
          ring = null!
        }
      })
}

export function skipLast(skipCount: number): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => skipLast_(fa, skipCount)
}

export function skipUntil_<E, A, E1>(fa: Observable<E, A>, notifier: Observable<E1, any>): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let taking           = false
    const skipSubscriber = operatorSubscriber(subscriber, {
      next: () => {
        skipSubscriber?.unsubscribe()
        taking = true
      },
      complete: noop
    })

    from(notifier).subscribe(skipSubscriber)

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => taking && subscriber.next(value)
      })
    )
  })
}

export function skipUntil<E1>(notifier: Observable<E1, any>): <E, A>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => skipUntil_(fa, notifier)
}

export function skipWhile_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let taking = false
    let index  = 0
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => (taking || (taking = !predicate(index++, value))) && subscriber.next(value)
      })
    )
  })
}

export function skipWhile<A>(predicate: PredicateWithIndex<number, A>): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => skipWhile_(fa, predicate)
}

export function startWith_<E, A, B extends ReadonlyArray<unknown>>(
  fa: Observable<E, A>,
  ...values: B
): Observable<E, A | B[number]> {
  return operate_(fa, (source, subscriber) => {
    // @ts-expect-error
    concat_(source, values).subscribe(subscriber)
  })
}

export function startWith<B extends ReadonlyArray<unknown>>(
  ...values: B
): <E, A>(fa: Observable<E, A>) => Observable<E, A | B[number]> {
  return (fa) => startWith_(fa, ...values)
}

export function subscribeOn_<E, A>(fa: Observable<E, A>, scheduler: SchedulerLike, delay = 0): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    subscriber.add(scheduler.schedule(() => source.subscribe(subscriber), delay))
  })
}

export function subscribeOn(scheduler: SchedulerLike, delay = 0): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => subscribeOn_(fa, scheduler, delay)
}

export function switchAll<E, E1, A>(ffa: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A> {
  return switchMap_(ffa, identity)
}

export function iswitchMap_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (index: number, value: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return operate_(fa, (source, subscriber) => {
    let innerSubscriber: Subscriber<E | E1, B> | null = null
    let index      = 0
    let isComplete = false

    const checkComplete = () => isComplete && !innerSubscriber && subscriber.complete()

    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            innerSubscriber?.unsubscribe()
            const outerIndex = index++
            from(f(outerIndex, value)).subscribe(
              (innerSubscriber = operatorSubscriber(subscriber, {
                next: (innerValue) => subscriber.next(innerValue),
                complete: () => {
                  innerSubscriber = null!
                  checkComplete()
                }
              }))
            )
          }
        },
        () => {
          isComplete = true
          checkComplete()
        }
      )
    )
  })
}

export function iswitchMap<A, E1, B>(
  f: (index: number, value: A) => ObservableInput<E1, B>
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => iswitchMap_(fa, f)
}

export function switchMap_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (value: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return iswitchMap_(fa, (_, a) => f(a))
}

export function switchMap<A, E1, B>(
  f: (value: A) => ObservableInput<E1, B>
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => switchMap_(fa, f)
}

export function iswitchScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (index: number, acc: B, value: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return operate_(fa, (source, subscriber) => {
    let state = initial
    iswitchMap_(source, (index, value) =>
      pipe(
        f(index, state, value),
        from,
        map((b) => ((state = b), b))
      )
    ).subscribe(subscriber)
    return () => {
      state = null!
    }
  })
}

export function iswitchScan<A, E1, B>(
  initial: B,
  f: (index: number, acc: B, value: A) => ObservableInput<E1, B>
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => iswitchScan_(fa, initial, f)
}

export function switchScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return iswitchScan_(fa, initial, (_, b, a) => f(b, a))
}

export function switchScan<A, E1, B>(
  initial: B,
  f: (acc: B, value: A) => ObservableInput<E1, B>
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => switchScan_(fa, initial, f)
}

export function take_<E, A>(fa: Observable<E, A>, count: number): Observable<E, A> {
  return count <= 0
    ? empty()
    : operate_(fa, (source, sub) => {
        let seen = 0
        source.subscribe(
          new OperatorSubscriber(sub, {
            next: (value) => {
              if (++seen <= count) {
                sub.next(value)
                if (count <= seen) {
                  sub.complete()
                }
              }
            }
          })
        )
      })
}

export function take(count: number): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => take_(fa, count)
}

export function takeLast_<E, A>(fa: Observable<E, A>, count: number): Observable<E, A> {
  return count <= 0
    ? empty()
    : operate_(fa, (source, subscriber) => {
        let buffer: A[] = []
        source.subscribe(
          operatorSubscriber(
            subscriber,
            {
              next: (value) => {
                buffer.push(value)
                count < buffer.length && buffer.shift()
              },
              complete: () => {
                for (const value of buffer) {
                  subscriber.next(value)
                }
                subscriber.complete()
              }
            },
            () => {
              buffer = null!
            }
          )
        )
      })
}

export function takeLast(count: number): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => takeLast_(fa, count)
}

export function takeUntil_<E, A, E1>(fa: Observable<E, A>, notifier: ObservableInput<E1, any>): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    from(notifier).subscribe(operatorSubscriber(subscriber, { next: () => subscriber.complete(), complete: noop }))
    !subscriber.closed && source.subscribe(subscriber)
  })
}

export function takeUntil<E1>(
  notifier: ObservableInput<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => takeUntil_(fa, notifier)
}

export function itakeWhile_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>,
  inclusive?: boolean
): Observable<E, B>
export function itakeWhile_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): Observable<E, A>
export function itakeWhile_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const result = predicate(index++, value)
          ;(result || inclusive) && subscriber.next(value)
          !result && subscriber.complete()
        }
      })
    )
  })
}

export function itakeWhile<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, B>
export function itakeWhile<A>(
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function itakeWhile<A>(
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => itakeWhile_(fa, predicate, inclusive)
}

export function takeWhile_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: Refinement<A, B>,
  inclusive?: boolean
): Observable<E, B>
export function takeWhile_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>, inclusive?: boolean): Observable<E, A>
export function takeWhile_<E, A>(fa: Observable<E, A>, predicate: Predicate<A>, inclusive?: boolean): Observable<E, A> {
  return itakeWhile_(fa, (_, a) => predicate(a), inclusive)
}

export function takeWhile<A, B extends A>(
  refinement: Refinement<A, B>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, B>
export function takeWhile<A>(
  predicate: Predicate<A>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function takeWhile<A>(
  predicate: Predicate<A>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => takeWhile_(fa, predicate, inclusive)
}

export function tap_<E, A>(fa: Observable<E, A>, observer: Partial<Observer<E, A>>): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          observer.next?.(value)
          subscriber.next(value)
        },
        error: (err) => {
          observer.error?.(err)
          subscriber.error(err)
        },
        complete: () => {
          observer.complete?.()
          subscriber.complete()
        },
        defect: (err) => {
          observer.defect?.(err)
          subscriber.defect(err)
        }
      })
    )
  })
}

export function tap<E, A>(observer: Partial<Observer<E, A>>): (fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => tap_(fa, observer)
}

export interface ThrottleConfig {
  readonly leading?: boolean
  readonly trailing?: boolean
}

export const defaultThrottleConfig: ThrottleConfig = {
  leading: true,
  trailing: false
}

export function throttle_<E, A, E1>(
  fa: Observable<E, A>,
  durationSelector: (a: A) => ObservableInput<E1, any>,
  { leading, trailing }: ThrottleConfig = defaultThrottleConfig
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let sendValue: M.Maybe<A>          = M.nothing()
    let throttled: Subscription | null = null
    let isComplete                     = false

    const endThrottling = () => {
      throttled?.unsubscribe()
      throttled = null
      if (trailing) {
        send()
        isComplete && subscriber.complete()
      }
    }

    const cleanupThrottling = () => {
      throttled = null
      isComplete && subscriber.complete()
    }

    const startThrottling = (value: A) =>
      (throttled = from(durationSelector(value)).subscribe(
        operatorSubscriber(subscriber, { next: endThrottling, complete: cleanupThrottling })
      ))

    const send = () => {
      if (M.isJust(sendValue)) {
        const { value } = sendValue
        sendValue       = M.nothing()
        subscriber.next(value)
        !isComplete && startThrottling(value)
      }
    }

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          sendValue = M.just(value)
          !(throttled && !throttled.closed) && (leading ? send() : startThrottling(value))
        },
        complete: () => {
          isComplete = true
          !(trailing && M.isJust(sendValue) && throttled && !throttled.closed) && subscriber.complete()
        }
      })
    )
  })
}

export function throttle<A, E1>(
  durationSelector: (a: A) => ObservableInput<E1, any>,
  config: ThrottleConfig = defaultThrottleConfig
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => throttle_(fa, durationSelector, config)
}

export function throttleTime_<E, A>(
  fa: Observable<E, A>,
  duration: number,
  scheduler: SchedulerLike = asyncScheduler,
  config = defaultThrottleConfig
): Observable<E, A> {
  const duration$ = timer(duration, scheduler)
  return throttle_(fa, () => duration$, config)
}

export function throttleTime(
  duration: number,
  scheduler: SchedulerLike = asyncScheduler,
  config = defaultThrottleConfig
): <E, A>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => throttleTime_(fa, duration, scheduler, config)
}

export type TimeoutConfig<A, E, B, M = unknown> = (
  | { readonly each: number, readonly first?: number | Date }
  | { readonly each?: number, readonly first: number | Date }
) & {
  readonly scheduler?: SchedulerLike
  readonly with?: (info: TimeoutInfo<A, M>) => ObservableInput<E, B>
  meta?: M
}

export interface TimeoutInfo<A, M> {
  readonly meta?: M
  readonly seen: number
  readonly lastValue: M.Maybe<A>
}

export class TimeoutError<A, M> extends Error {
  constructor(readonly info: TimeoutInfo<A, M> | null) {
    super('Timeout has occurred')
    this.name = 'TimeoutError'
  }
}

export function timeout_<E, A, E1, B, M = unknown>(
  fa: Observable<E, A>,
  config: TimeoutConfig<A, E1, B, M> & { readonly with: (info: TimeoutInfo<A, M>) => ObservableInput<E1, B> }
): Observable<E | E1, A | B>
export function timeout_<E, A, M = unknown>(
  fa: Observable<E, A>,
  config: Omit<TimeoutConfig<A, never, any, M>, 'with'>
): Observable<E | TimeoutError<A, M>, A>
export function timeout_<E, A, E1, B, M = unknown>(
  fa: Observable<E, A>,
  config: any
): Observable<E | E1 | TimeoutError<A, M>, A | B> {
  const {
    first,
    each,
    with: _with = timeoutError,
    scheduler = asyncScheduler,
    meta = null!
  } = config as TimeoutConfig<A, E1, B, M>
  return operate_(fa, (source, subscriber) => {
    let originalSourceSubscription: Subscription
    let timerSubscription: Subscription
    let lastValue: M.Maybe<A> = M.nothing()
    let seen                  = 0
    const startTimer          = (delay: number) => {
      timerSubscription = caughtSchedule(
        subscriber,
        scheduler,
        () => {
          originalSourceSubscription.unsubscribe()
          from<E1 | TimeoutError<A, M>, B>(
            _with({
              meta,
              lastValue,
              seen
            })
          ).subscribe(subscriber)
        },
        delay
      )
    }

    originalSourceSubscription = source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            timerSubscription?.unsubscribe()
            seen++
            lastValue = M.just(value)
            subscriber.next(value)
            each! > 0 && startTimer(each!)
          }
        },
        () => {
          if (!timerSubscription?.closed) {
            timerSubscription?.unsubscribe()
          }
          lastValue = M.nothing()
        }
      )
    )

    startTimer(first != null ? (typeof first === 'number' ? first : +first - scheduler.now()) : each!)
  })
}

function timeoutError<A, M>(info: TimeoutInfo<A, M>): Observable<TimeoutError<A, M>, never> {
  return fail(new TimeoutError(info))
}

export function timeout<A, E1, B, M = unknown>(
  config: TimeoutConfig<A, E1, B, M> & { readonly with: (info: TimeoutInfo<A, M>) => ObservableInput<E1, B> }
): <E>(fa: Observable<E, A>) => Observable<E | E1, A | B>
export function timeout<A, M = unknown>(
  config: Omit<TimeoutConfig<A, never, any, M>, 'with'>
): <E>(fa: Observable<E, A>) => Observable<E | TimeoutError<A, M>, A>
export function timeout<A, E1, B, M = unknown>(
  config: any
): <E>(fa: Observable<E, A>) => Observable<E | E1 | TimeoutError<A, M>, A | B> {
  return (fa) => timeout_(fa, config)
}

function toArrayAccumulator(arr: any[], value: any) {
  return arr.push(value), arr
}

export function toArray<E, A>(fa: Observable<E, A>): Observable<E, ReadonlyArray<A>> {
  return operate_(fa, (source, subscriber) => {
    foldl_(source, [] as A[], toArrayAccumulator).subscribe(subscriber)
  })
}

export function unique_<E, A, K, E1 = never>(
  fa: Observable<E, A>,
  toKey?: (value: A) => K,
  flushes?: Observable<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let distinctKeys = HashSet.empty<A | K>()
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const key = toKey ? toKey(value) : value
          if (!distinctKeys.has(key)) {
            distinctKeys.add(key)
            subscriber.next(value)
          }
        }
      })
    )
    flushes?.subscribe(
      operatorSubscriber(subscriber, { next: () => (distinctKeys = HashSet.empty<A>()), complete: noop })
    )
  })
}

export function unique<A, K, E1 = never>(
  toKey?: (value: A) => K,
  flushes?: Observable<E1, any>
): <E>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => unique_(fa, toKey, flushes)
}

export function uniqueUntilChanged_<E, A, K>(
  fa: Observable<E, A>,
  E: Eq<K>,
  keySelector: (value: A) => K
): Observable<E, A>
export function uniqueUntilChanged_<E, A, K>(
  fa: Observable<E, A>,
  equals: (x: K, y: K) => boolean,
  keySelector: (value: A) => K
): Observable<E, A>
export function uniqueUntilChanged_<E, A>(fa: Observable<E, A>, E: Eq<A>): Observable<E, A>
export function uniqueUntilChanged_<E, A>(fa: Observable<E, A>, equals: (x: A, y: A) => boolean): Observable<E, A>
export function uniqueUntilChanged_<E, A, K = A>(
  fa: Observable<E, A>,
  E: Eq<K> | ((x: K, y: K) => boolean),
  keySelector: (value: A) => K = identity as (_: A) => K
): Observable<E, A> {
  const compare = 'equals_' in E ? E.equals_ : E
  return operate_(fa, (source, subscriber) => {
    let previousKey: K
    let first = true
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const currentKey = keySelector(value)
          if (first || !compare(previousKey, currentKey)) {
            first       = false
            previousKey = currentKey
            subscriber.next(value)
          }
        }
      })
    )
  })
}

export function uniqueUntilChanged<A, K>(
  E: Eq<K>,
  keySelector: (value: A) => K
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilChanged<A, K>(
  equals: (x: K, y: K) => boolean,
  keySelector: (value: A) => K
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilChanged<A>(E: Eq<A>): <E, A>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilChanged<A>(equals: (x: A, y: A) => boolean): <E, A>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilChanged<A, K = A>(
  E: Eq<K> | ((x: K, y: K) => boolean),
  keySelector?: (value: A) => K
): <E>(fa: Observable<E, A>) => Observable<E, A> {
  // @ts-expect-error
  return (fa) => uniqueUntilChanged_(fa, E as Eq<K>, keySelector)
}

export function uniqueUntilKeyChanged_<E, A, K extends keyof A>(
  fa: Observable<E, A>,
  key: K,
  E: Eq<A[K]>
): Observable<E, A>
export function uniqueUntilKeyChanged_<E, A, K extends keyof A>(
  fa: Observable<E, A>,
  key: K,
  equals: (x: A[K], y: A[K]) => boolean
): Observable<E, A>
export function uniqueUntilKeyChanged_<E, A, K extends keyof A>(
  fa: Observable<E, A>,
  key: K,
  equals: Eq<A[K]> | ((x: A[K], y: A[K]) => boolean)
): Observable<E, A> {
  const compare = 'equals_' in equals ? equals.equals_ : equals
  return uniqueUntilChanged_(fa, (x, y) => compare(x[key], y[key]))
}

export function uniqueUntilKeyChanged<A, K extends keyof A>(
  key: K,
  E: Eq<A[K]>
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilKeyChanged<A, K extends keyof A>(
  key: K,
  equals: (x: A[K], y: A[K]) => boolean
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function uniqueUntilKeyChanged<A, K extends keyof A>(
  key: K,
  equals: Eq<A[K]> | ((x: A[K], y: A[K]) => boolean)
): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => uniqueUntilKeyChanged_(fa, key, equals as Eq<A[K]>)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

function combineLatestInternal(
  subscriber: Subscriber<any, any>,
  observables: ObservableInput<any, any>[],
  scheduler?: SchedulerLike,
  valueTransform: (values: any[]) => any = identity
) {
  return maybeSchedule(subscriber, scheduler, () => {
    const { length }         = observables
    const values             = new Array(length)
    let active               = length
    let remainingFirstValues = length
    for (let i = 0; i < length; i++) {
      maybeSchedule(subscriber, scheduler, () => {
        const source      = scheduler ? scheduled(observables[i], scheduler) : from(observables[i])
        let hasFirstValue = false
        source.subscribe(
          operatorSubscriber(subscriber, {
            next: (value) => {
              values[i] = value
              if (!hasFirstValue) {
                hasFirstValue = true
                remainingFirstValues--
              }
              if (!remainingFirstValues) {
                subscriber.next(valueTransform(values.slice()))
              }
            },
            complete: () => {
              if (!--active) {
                subscriber.complete()
              }
            }
          })
        )
      })
    }
  })
}

function findInternal<A>(
  predicate: PredicateWithIndex<number, A>,
  emit: 'value' | 'index'
): <E>(source: Observable<E, A>, subscriber: Subscriber<E, any>) => void {
  const findIndex = emit === 'index'
  return (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const i = index++
          if (predicate(index++, value)) {
            subscriber.next(findIndex ? i : M.just(value))
            subscriber.complete()
          }
        },
        complete: () => {
          subscriber.next(findIndex ? -1 : M.nothing())
          subscriber.complete()
        }
      })
    )
  }
}

export function joinAllInternal<E, E1, A, E2, B>(
  fa: Observable<E, ObservableInput<E1, A>>,
  joiner: (sources: ReadonlyArray<ObservableInput<E1, A>>) => Observable<E2, B>
): Observable<E | E1 | E2, B> {
  return pipe(fa, toArray, mergeMap(joiner))
}

function maybeSchedule(subscription: Subscription, scheduler: SchedulerLike | undefined, execute: () => void) {
  if (scheduler) {
    subscription.add(scheduler.schedule(execute))
  } else {
    execute()
  }
}

function mergeInternal<E, A, E1, B>(
  source: Observable<E, A>,
  subscriber: Subscriber<E | E1, B>,
  f: (i: number, a: A) => ObservableInput<E1, B>,
  concurrent: number,
  onBeforeNext?: (innerValue: B) => void,
  expand?: boolean,
  innerSubScheduler?: SchedulerLike,
  additionalTeardown?: () => void
) {
  const buffer: Array<A> = []
  let active             = 0
  let index              = 0
  let isComplete         = false

  const checkComplete = () => {
    if (isComplete && !buffer.length && !active) {
      subscriber.complete()
    }
  }

  const outerNext = (a: A) => (active < concurrent ? doInnerSub(a) : buffer.push(a))

  const doInnerSub = (a: A) => {
    expand && subscriber.next(a as any)
    active++
    let innerComplete = false
    from(f(index++, a)).subscribe(
      new OperatorSubscriber(
        subscriber,
        {
          next: (b) => {
            onBeforeNext?.(b)

            if (expand) {
              outerNext(b as any)
            } else {
              subscriber.next(b)
            }
          },
          complete: () => {
            innerComplete = true
          }
        },
        () => {
          if (innerComplete) {
            try {
              active--
              while (buffer.length && active < concurrent) {
                const bufferedValue = buffer.shift()!
                innerSubScheduler
                  ? subscriber.add(innerSubScheduler.schedule(() => doInnerSub(bufferedValue)))
                  : doInnerSub(bufferedValue)
              }
              checkComplete()
            } catch (err) {
              subscriber.defect(err)
            }
          }
        }
      )
    )
  }

  source.subscribe(
    new OperatorSubscriber(subscriber, {
      next: outerNext,
      complete: () => {
        isComplete = true
        checkComplete()
      }
    })
  )

  return () => {
    additionalTeardown?.()
  }
}

export function scanInternal<E, A, B>(
  f: (index: number, acc: A, value: A) => B,
  initial: B,
  hasInitial: false,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
): (source: Observable<E, A>, subscriber: Subscriber<any, any>) => void
export function scanInternal<E, A, B>(
  f: (index: number, acc: B, value: A) => B,
  initial: B,
  hasInitial: true,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
): (source: Observable<E, A>, subscriber: Subscriber<any, any>) => void
export function scanInternal<E, A, B>(
  f: (index: number, acc: A | B, value: A) => B,
  initial: B,
  hasInitial: boolean,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
): (source: Observable<E, A>, subscriber: Subscriber<any, any>) => void {
  return (source, subscriber) => {
    let hasState   = hasInitial
    let state: any = initial
    let index      = 0
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const i = index++
          state   = hasState ? f(i, state, value) : ((hasState = true), value)
          emitOnNext && subscriber.next(state)
        },
        complete:
          emitBeforeComplete &&
          (() => {
            hasState && subscriber.next(state)
            subscriber.complete()
          })
      })
    )
  }
}
