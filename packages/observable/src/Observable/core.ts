import type { Notification } from '../Notification'
import type { Observer } from '../Observer'
import type { Operator } from '../Operator'
import type { SchedulerAction, SchedulerLike } from '../Scheduler/core'
import type { Subscriber } from '../Subscriber'
import type { Finalizer, Unsubscribable } from '../Subscription'
import type { ReadableStreamLike } from '../util'
import type { Either } from '@principia/base/Either'
import type { Eq, PredicateWithIndex, RefinementWithIndex } from '@principia/base/prelude'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import * as HS from '@principia/base/MutableHashSet'
import * as O from '@principia/base/Option'
import { identity, isFunction, isIterable, isObject, pipe, tuple } from '@principia/base/prelude'

import { popNumber } from '../args'
import * as N from '../Notification'
import { operate_, OperatorSubscriber, operatorSubscriber } from '../Operator'
import { asyncScheduler, caughtSchedule, isScheduler } from '../Scheduler/core'
import { isSubscriber, SafeSubscriber } from '../Subscriber'
import { Subscription } from '../Subscription'
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
} from '../util'

export interface Subscribable<E, A> {
  readonly _E: () => E
  readonly _A: () => A
  subscribe(observer: Partial<Observer<E, A>>): Unsubscribable
}

export type ObservableInput<E = never, A = never> =
  | Observable<E, A>
  | AsyncIterable<A>
  | PromiseLike<A>
  | ArrayLike<A>
  | Iterable<A>
  | ReadableStreamLike<A>

export type TypeOf<X> = X extends ObservableInput<any, infer A> ? A : never
export type ErrorOf<X> = X extends ObservableInput<infer E, any> ? E : never

export const ObservableTypeId = Symbol.for('@principia/observable/Observable')
export type ObservableTypeId = typeof ObservableTypeId

export class Observable<E, A> implements Subscribable<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A;

  readonly [ObservableTypeId]: ObservableTypeId = ObservableTypeId

  protected source: Observable<any, any> | undefined
  protected operator: Operator<E, A> | undefined

  constructor(subscribe?: (this: Observable<E, A>, subscriber: Subscriber<E, A>) => Finalizer) {
    if (subscribe) {
      this.subscribeInternal = subscribe
    }
  }

  lift<E1, A1>(operator: Operator<E1, A1>): Observable<E1, A1> {
    const observable    = new Observable<E1, A1>()
    observable.source   = this
    observable.operator = operator
    return observable
  }

  subscribe(observer?: Partial<Observer<E, A>>): Subscription {
    const subscriber: Subscriber<E, A> = isSubscriber(observer) ? observer : new SafeSubscriber(observer)

    const { operator, source } = this

    subscriber.add(
      operator
        ? operator.call(subscriber, source)
        : source
        ? this.subscribeInternal(subscriber)
        : this.trySubscribe(subscriber)
    )

    return subscriber
  }

  protected trySubscribe(sink: Subscriber<E, A>): Finalizer {
    try {
      return this.subscribeInternal(sink)
    } catch (err) {
      sink.defect(err)
      return noop
    }
  }

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
  return new Observable((s) => s.fail(e))
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
  ...sources: [...O, number?]
): Observable<ErrorOf<O[number]>, { [K in keyof O]: TypeOf<O[K]> }> {
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
  return scheduleObservable(input, scheduler)
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
            fail: (err) => {
              sub.add(scheduler.schedule(() => subscriber.fail(err)))
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

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: Observable<E, A>, f: (a: A, i: number) => B): Observable<E, B> {
  return operate_(fa, (source, subscriber) => {
    let i = 0
    source.subscribe(
      new OperatorSubscriber(subscriber, {
        next: (value) => {
          subscriber.next(f(value, i++))
        }
      })
    )
  })
}

export function map<A, B>(f: (a: A, i: number) => B): <E>(fa: Observable<E, A>) => Observable<E, B> {
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
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, B>
export function filter_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A>
export function filter_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, { next: (value) => predicate(value, index++) && subscriber.next(value) })
    )
  })
}

export function filter<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, B>
export function filter<A>(predicate: PredicateWithIndex<number, A>): <E>(fa: Observable<E, A>) => Observable<E, A>
export function filter<A>(predicate: PredicateWithIndex<number, A>): <E>(fa: Observable<E, A>) => Observable<E, A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMap_<E, A, B>(fa: Observable<E, A>, f: (a: A, i: number) => O.Option<B>): Observable<E, B> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, { next: (value) => O.match_(f(value, index++), noop, (b) => subscriber.next(b)) })
    )
  })
}

export function filterMap<A, B>(f: (a: A, i: number) => O.Option<B>): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => filterMap_(fa, f)
}

export function partition_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function partition_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): readonly [Observable<E, A>, Observable<E, A>]
export function partition_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): readonly [Observable<E, A>, Observable<E, A>] {
  return [filter_(fa, (a, i) => !predicate(a, i)), filter_(fa, predicate)]
}

export function partition<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
export function partition<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>]
export function partition<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, A>, Observable<E, A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<E, A, B, C>(
  fa: Observable<E, A>,
  f: (a: A, i: number) => E.Either<B, C>
): readonly [Observable<E, B>, Observable<E, C>] {
  return [
    operate_(fa, (source, subscriber) => {
      let index = 0
      source.subscribe(
        operatorSubscriber(subscriber, {
          next: (value) => {
            E.match_(f(value, index++), (b) => subscriber.next(b), noop)
          }
        })
      )
    }),
    operate_(fa, (source, subscriber) => {
      let index = 0
      source.subscribe(
        operatorSubscriber(subscriber, {
          next: (value) => {
            E.match_(f(value, index++), noop, (c) => subscriber.next(c))
          }
        })
      )
    })
  ]
}

export function partitionMap<A, B, C>(
  f: (a: A, i: number) => E.Either<B, C>
): <E>(fa: Observable<E, A>) => readonly [Observable<E, B>, Observable<E, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function mergeMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (a: A, i: number) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return operate_(ma, (source, sub) => mergeInternal(source, sub, f, concurrent))
}

export function mergeMap<A, E1, B>(
  f: (a: A, i: number) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => mergeMap_(ma, f, concurrent)
}

export function concatMap_<E, A, E1, B>(
  ma: Observable<E, A>,
  f: (a: A, i: number) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return mergeMap_(ma, f, 1)
}

export function concatMap<A, E1, B>(
  f: (a: A, i: number) => ObservableInput<E1, B>
): <E>(ma: Observable<E, A>) => Observable<E | E1, B> {
  return (ma) => concatMap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<E, A, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A, index: number) => B
): Observable<E, B> {
  return operate_(fa, scanInternal(f, initial, true, false, true))
}

export function foldl<A, B>(
  initial: B,
  f: (acc: B, value: A, index: number) => B
): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => foldl_(fa, initial, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function at_<E, A>(fa: Observable<E, A>, index: number): Observable<E, O.Option<A>> {
  return pipe(
    fa,
    filter((_, i) => i === index),
    take(1),
    map(O.some),
    onEmpty(() => O.none())
  )
}

export function at(index: number): <E, A>(fa: Observable<E, A>) => Observable<E, O.Option<A>> {
  return (fa) => at_(fa, index)
}

export function audit_<E, A, E1>(
  fa: Observable<E, A>,
  durationSelector: (value: A) => ObservableInput<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let lastValue: O.Option<A> = O.none()
    let durationSubscriber: Subscriber<any, any> | null = null
    let isComplete    = false
    const endDuration = () => {
      durationSubscriber?.unsubscribe()
      durationSubscriber = null
      if (O.isSome(lastValue)) {
        const { value } = lastValue
        lastValue       = O.none()
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
          lastValue = O.some(value)
          if (!durationSubscriber) {
            from(durationSelector(value)).subscribe(
              (durationSubscriber = operatorSubscriber(subscriber, { next: endDuration, complete: cleanupDuration }))
            )
          }
        },
        complete: () => {
          isComplete = true
          ;(O.isNone(lastValue) || !durationSubscriber || durationSubscriber.closed) && subscriber.complete()
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

export function countWith_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, number> {
  return foldl_(fa, 0, (total, v, i) => (predicate(v, i) ? total + 1 : total))
}

export function countWith<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number> {
  return (fa) => countWith_(fa, predicate)
}

export function combineLatestAll<E, E1, A>(
  fa: Observable<E, ObservableInput<E1, A>>
): Observable<E | E1, ReadonlyArray<A>> {
  return joinAllInternal(fa, (sources) => combineLatest(...sources) as any)
}

export function combineLatest<A extends ReadonlyArray<ObservableInput<any, any>>>(
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

export function debounceWith_<E, A, E1>(
  fa: Observable<E, A>,
  durationSelector: (value: A) => ObservableInput<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let lastValue: O.Option<A> = O.none()
    let durationSubscriber: Subscriber<E1, any> | null = null
    const emit = () => {
      durationSubscriber?.unsubscribe()
      durationSubscriber = null
      if (O.isSome(lastValue)) {
        const { value } = lastValue
        lastValue       = O.none()
        subscriber.next(value)
      }
    }
    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            durationSubscriber?.unsubscribe()
            lastValue          = O.some(value)
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
        fail: (error) => {
          subscriber.next(E.left(error))
        }
      })
    )
  })
}

export function delayWith_<E, A, E1>(
  fa: Observable<E, A>,
  f: (value: A, index: number) => Observable<E1, any>
): Observable<E | E1, A> {
  return mergeMap_(fa, (a, i) => pipe(f(a, i), take(1), as(a)))
}

export function delayWith<A, E1>(
  f: (value: A, index: number) => Observable<E1, any>
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

export function exhaustMap_<E, A, E1, B>(
  ffa: Observable<E, A>,
  f: (a: A, i: number) => ObservableInput<E1, B>
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
            from(f(outerValue, index++)).subscribe(innerSub)
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

export function exhaustMap<A, E1, B>(
  f: (a: A, i: number) => ObservableInput<E1, B>
): <E>(ffa: Observable<E, A>) => Observable<E | E1, B> {
  return (ffa) => exhaustMap_(ffa, f)
}

export function expand_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (a: A, i: number) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  // eslint-disable-next-line no-param-reassign
  concurrent = (concurrent || 0) < 1 ? Infinity : concurrent
  return operate_(fa, (source, subscriber) => mergeInternal(source, subscriber, f, concurrent, undefined, true))
}

export function expand<A, E1, B>(
  f: (a: A, i: number) => ObservableInput<E1, B>,
  concurrent = Infinity
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => expand_(fa, f, concurrent)
}

export function find_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, O.Option<B>>
export function find_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, O.Option<A>>
export function find_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, O.Option<A>> {
  return operate_(fa, findInternal(predicate, 'value'))
}

export function find<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, O.Option<B>>
export function find<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, O.Option<A>>
export function find<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, O.Option<A>> {
  return (fa) => find_(fa, predicate)
}

export function findIndex_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>
): Observable<E, number>
export function findIndex_<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, number>
export function findIndex_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>
): Observable<E, number> {
  return operate_(fa, findInternal(predicate, 'index'))
}

export function findIndex<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): <E>(fa: Observable<E, A>) => Observable<E, number>
export function findIndex<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number>
export function findIndex<A>(
  predicate: PredicateWithIndex<number, A>
): <E>(fa: Observable<E, A>) => Observable<E, number> {
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
                    ? A.foldl_(keys, {}, (b, k, i) => {
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
        fail: (error) => {
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

export function mergeScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A, index: number) => ObservableInput<E1, B>,
  concurrent = Infinity
): Observable<E | E1, B> {
  return operate_(fa, (source, subscriber) => {
    let state = initial
    return mergeInternal(
      source,
      subscriber,
      (value, index) => f(state, value, index),
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

export function mergeScan<A, E1, B>(
  initial: B,
  f: (acc: B, value: A, index: number) => ObservableInput<E1, B>,
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
          const innerSub = operatorSubscriber(subscriber, { fail: noop, defect: noop, complete: noop })
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

export function scanl_<E, A, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A, index: number) => B
): Observable<E, B> {
  return operate_(fa, scanInternal(f, initial, true, true))
}

export function scanl<A, B>(
  initial: B,
  f: (acc: B, value: A, index: number) => B
): <E>(fa: Observable<E, A>) => Observable<E, B> {
  return (fa) => scanl_(fa, initial, f)
}

export function skip_<E, A>(fa: Observable<E, A>, count: number): Observable<E, A> {
  return filter_(fa, (_, index) => count <= index)
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
        next: (value) => (taking || (taking = !predicate(value, index++))) && subscriber.next(value)
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

export function switchMap_<E, A, E1, B>(
  fa: Observable<E, A>,
  f: (value: A, index: number) => ObservableInput<E1, B>
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
            from(f(value, outerIndex)).subscribe(
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

export function switchMap<A, E1, B>(
  f: (value: A, index: number) => ObservableInput<E1, B>
): <E>(fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => switchMap_(fa, f)
}

export function switchScan_<E, A, E1, B>(
  fa: Observable<E, A>,
  initial: B,
  f: (acc: B, value: A, index: number) => ObservableInput<E1, B>
): Observable<E | E1, B> {
  return operate_(fa, (source, subscriber) => {
    let state = initial
    switchMap_(source, (value, index) =>
      pipe(
        f(state, value, index),
        from,
        map((b) => ((state = b), b))
      )
    ).subscribe(subscriber)
    return () => {
      state = null!
    }
  })
}

export function switchScan<A, E1, B>(
  initial: B,
  f: (acc: B, value: A, index: number) => ObservableInput<E1, B>
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

export function takeWhile_<E, A, B extends A>(
  fa: Observable<E, A>,
  refinement: RefinementWithIndex<number, A, B>,
  inclusive?: boolean
): Observable<E, B>
export function takeWhile_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): Observable<E, A>
export function takeWhile_<E, A>(
  fa: Observable<E, A>,
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): Observable<E, A> {
  return operate_(fa, (source, subscriber) => {
    let index = 0
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const result = predicate(value, index++)
          ;(result || inclusive) && subscriber.next(value)
          !result && subscriber.complete()
        }
      })
    )
  })
}

export function takeWhile<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, B>
export function takeWhile<A>(
  predicate: PredicateWithIndex<number, A>,
  inclusive?: boolean
): <E>(fa: Observable<E, A>) => Observable<E, A>
export function takeWhile<A>(
  predicate: PredicateWithIndex<number, A>,
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
        fail: (err) => {
          observer.fail?.(err)
          subscriber.fail(err)
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
    let sendValue: O.Option<A>         = O.none()
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
      if (O.isSome(sendValue)) {
        const { value } = sendValue
        sendValue       = O.none()
        subscriber.next(value)
        !isComplete && startThrottling(value)
      }
    }

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          sendValue = O.some(value)
          !(throttled && !throttled.closed) && (leading ? send() : startThrottling(value))
        },
        complete: () => {
          isComplete = true
          !(trailing && O.isSome(sendValue) && throttled && !throttled.closed) && subscriber.complete()
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
  readonly lastValue: O.Option<A>
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
    let lastValue: O.Option<A> = O.none()
    let seen                   = 0
    const startTimer           = (delay: number) => {
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
            lastValue = O.some(value)
            subscriber.next(value)
            each! > 0 && startTimer(each!)
          }
        },
        () => {
          if (!timerSubscription?.closed) {
            timerSubscription?.unsubscribe()
          }
          lastValue = O.none()
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
    let distinctKeys = new HS.HashSet<A | K>()
    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          const key = toKey ? toKey(value) : value
          if (!distinctKeys.contains(key)) {
            distinctKeys.add(key)
            subscriber.next(value)
          }
        }
      })
    )
    flushes?.subscribe(
      operatorSubscriber(subscriber, { next: () => (distinctKeys = new HS.HashSet<A>()), complete: noop })
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
          if (predicate(value, index++)) {
            subscriber.next(findIndex ? i : O.some(value))
            subscriber.complete()
          }
        },
        complete: () => {
          subscriber.next(findIndex ? -1 : O.none())
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
  f: (a: A, i: number) => ObservableInput<E1, B>,
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
    from(f(a, index++)).subscribe(
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
  f: (acc: A, value: A, index: number) => B,
  initial: B,
  hasInitial: false,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
): (source: Observable<E, A>, subscriber: Subscriber<any, any>) => void
export function scanInternal<E, A, B>(
  f: (acc: B, value: A, index: number) => B,
  initial: B,
  hasInitial: true,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
): (source: Observable<E, A>, subscriber: Subscriber<any, any>) => void
export function scanInternal<E, A, B>(
  f: (acc: A | B, value: A, index: number) => B,
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
          state   = hasState ? f(state, value, i) : ((hasState = true), value)
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
