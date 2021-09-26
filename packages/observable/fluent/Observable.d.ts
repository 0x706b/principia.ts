import type { Either } from '@principia/base/Either'
import type { Eq } from '@principia/base/Eq'
import type { Option } from '@principia/base/Option'
import type { PredicateWithIndex } from '@principia/base/Predicate'
import type { RefinementWithIndex } from '@principia/base/Refinement'
import type { Notification } from '@principia/observable/Notification'
import type {
  BufferTimeConfig,
  ConnectConfig,
  ErrorOf,
  ObservableInput,
  ShareConfig,
  TypeOf
} from '@principia/observable/Observable'
import type * as O from '@principia/observable/Observable'
import type { Observer } from '@principia/observable/Observer'
import type { SchedulerLike } from '@principia/observable/Scheduler'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Observable: ObservableStaticOps
  export interface Observable<E, A> extends O.Observable<E, A> {}
}

interface ObservableStaticOps {
  /**
   * @rewriteStatic animationFrames from "@principia/observable/Observable"
   */
  animationFrames: typeof O.animationFrames
  /**
   * @rewriteStatic combineLatest from "@principia/observable/Observable"
   */
  combineLatest: typeof O.combineLatest
  /**
   * @rewriteStatic connectable from "@principia/observable/Observable"
   */
  connectable: typeof O.connectable
  /**
   * @rewriteStatic defect from "@principia/observable/Observable"
   */
  defect: typeof O.defect
  /**
   * @rewriteStatic defer from "@principia/observable/Observable"
   */
  defer: typeof O.defer
  /**
   * @rewriteStatic empty from "@principia/observable/Observable"
   */
  empty: typeof O.empty
  /**
   * @rewriteStatic fail from "@principia/observable/Observable"
   */
  fail: typeof O.fail
  /**
   * @rewriteStatic forkJoin from "@principia/observable/Observable"
   */
  forkJoin: typeof O.forkJoin
  /**
   * @rewriteStatic from from "@principia/observable/Observable"
   */
  from: typeof O.from
  /**
   * @rewriteStatic fromCallback from "@principia/observable/Observable"
   */
  fromCallback: typeof O.fromCallback
  /**
   * @rewriteStatic fromEvent from "@principia/observable/Observable"
   */
  fromEvent: typeof O.fromEvent
  /**
   * @rewriteStatic fromInterop from "@principia/observable/Observable"
   */
  fromInterop: typeof O.fromInterop
  /**
   * @rewriteStatic fromNodeCallback from "@principia/observable/Observable"
   */
  fromNodeCallback: typeof O.fromNodeCallback
  /**
   * @rewriteStatic if from "@principia/observable/Observable"
   */
  if: typeof O.if
  /**
   * @rewriteStatic interval from "@principia/observable/Observable"
   */
  interval: typeof O.interval
  /**
   * @rewriteStatic iterate from "@principia/observable/Observable"
   */
  iterate: typeof O.iterate
  /**
   * @rewriteStatic merge from "@principia/observable/Observable"
   */
  merge: typeof O.merge
  /**
   * @rewriteStatic of from "@principia/observable/Observable"
   */
  of: typeof O.of
  /**
   * @rewriteStatic pure from "@principia/observable/Observable"
   */
  pure: typeof O.pure
  /**
   * @rewriteStatic race from "@principia/observable/Observable"
   */
  race: typeof O.race
  /**
   * @rewriteStatic scheduled from "@principia/observable/Observable"
   */
  scheduled: typeof O.scheduled
  /**
   * @rewriteStatic single from "@principia/observable/Observable"
   */
  single: typeof O.single
  /**
   * @rewriteStatic timer from "@principia/observable/Observable"
   */
  timer: typeof O.timer
  /**
   * @rewriteStatic zip from "@principia/observable/Observable"
   */
  zip: typeof O.zip
}

declare module '@principia/observable/Observable/core' {
  interface Observable<E, A> {
    /**
     * @rewrite as_ from "@principia/observable/Observable"
     */
    as<E, A, B>(this: Observable<E, A>, value: B): Observable<E, B>
    /**
     * @rewrite at_ from "@principia/observable/Observable"
     */
    at<E, A>(this: Observable<E, A>, index: number): Observable<E, Option<A>>
    /**
     * @rewrite audit_ from "@principia/observable/Observable"
     */
    audit<E, A, E1>(
      this: Observable<E, A>,
      durationSelector: (value: A) => ObservableInput<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite auditTime_ from "@principia/observable/Observable"
     */
    auditTime<E, A>(this: Observable<E, A>, duration: number, scheduler?: SchedulerLike): Observable<E, A>
    /**
     * @rewrite buffer_ from "@principia/observable/Observable"
     */
    buffer<E, A, E1>(this: Observable<E, A>, closingNotifier: Observable<E1, any>): Observable<E | E1, ReadonlyArray<A>>
    /**
     * @rewrite bufferCount_ from "@principia/observable/Observable"
     */
    bufferCount<E, A>(
      this: Observable<E, A>,
      bufferSize: number,
      startBufferEvery?: number
    ): Observable<E, ReadonlyArray<A>>
    /**
     * @rewrite bufferTime_ from "@principia/observable/Observable"
     */
    bufferTime<E, A>(this: Observable<E, A>, config: BufferTimeConfig): Observable<E, ReadonlyArray<A>>
    /**
     * @rewrite bufferToggle_ from "@principia/observable/Observable"
     */
    bufferToggle<E, A, E1, B, E2>(
      this: Observable<E, A>,
      openings: ObservableInput<E1, B>,
      closingSelector: (value: B) => ObservableInput<E2, any>
    ): Observable<E | E1 | E2, ReadonlyArray<A>>
    /**
     * @rewrite bufferWhen_ from "@principia/observable/Observable"
     */
    bufferWhen<E, A, E1>(
      this: Observable<E, A>,
      closingSelector: () => Observable<E1, any>
    ): Observable<E | E1, ReadonlyArray<A>>
    /**
     * @rewrite catchDefect_ from "@principia/observable/Observable"
     */
    catchDefect<E, A, E1, B>(
      this: Observable<E, A>,
      f: (err: unknown, caught: Observable<E | E1, A | B>) => ObservableInput<E1, B>
    ): Observable<E | E1, A | B>
    /**
     * @rewrite combineLatest from "@principia/observable/Observable"
     */
    combineLatest<E, A, B extends ReadonlyArray<ObservableInput<any, any>>>(
      this: Observable<E, A>,
      ...sources: B
    ): Observable<E | ErrorOf<B[number]>, readonly [A, ...{ [K in keyof B]: TypeOf<B[K]> }]>
    /**
     * @rewrite combineLatestAll from "@principia/observable/Observable"
     */
    combineLatestAll<E, E1, A>(fa: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, ReadonlyArray<A>>
    /**
     * @rewrite concat_ from "@principia/observable/Observable"
     */
    concat<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
      this: Observable<E, A>,
      ...sources: O
    ): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>>
    /**
     * @rewrite concatAll from "@principia/observable/Observable"
     */
    concatAll<E, E1, A>(this: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A>
    /**
     * @rewrite concatMap_ from "@principia/observable/Observable"
     */
    concatMap<E, A, E1, B>(
      this: Observable<E, A>,
      f: (value: A, index: number) => ObservableInput<E1, B>
    ): Observable<E | E1, B>
    /**
     * @rewrite connnect_ from "@principia/observable/Observable"
     */
    connect<E, A, E1, B>(
      fa: Observable<E, A>,
      selector: (shared: Observable<E, A>) => ObservableInput<E1, B>,
      config?: ConnectConfig<E, A>
    ): Observable<E | E1, B>
    /**
     * @rewrite countWith_ from "@principia/observable/Observable"
     */
    countWith<E, A>(this: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, number>
    /**
     * @rewrite cross_ from "@principia/observable/Observable"
     */
    cross<E, A, E1, B>(this: Observable<E, A>, that: Observable<E1, B>): Observable<E | E1, readonly [A, B]>
    /**
     * @rewrite crossWith_ from "@principia/observable/Observable"
     */
    crossWith<E, A, E1, B, C>(
      this: Observable<E, A>,
      that: Observable<E1, B>,
      f: (a: A, b: B) => C
    ): Observable<E | E1, C>
    /**
     * @rewrite debounce_ from "@principia/observable/Observable"
     */
    debounce<E, A>(this: Observable<E, A>, dueTime: number, scheduler?: SchedulerLike): Observable<E, A>
    /**
     * @rewrite debounceWith_ from "@principia/observable/Observable"
     */
    debounceWith<E, A, E1>(
      this: Observable<E, A>,
      durationSelector: (value: A) => ObservableInput<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite delay_ from "@principia/observable/Observable"
     */
    delay<E, A>(this: Observable<E, A>, due: number | Date, scheduler?: SchedulerLike): Observable<E, A>
    /**
     * @rewrite delayWith_ from "@principia/observable/Observable"
     */
    delayWith<E, A, E1>(
      this: Observable<E, A>,
      f: (value: A, index: number) => Observable<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite dematerialize from "@principia/observable/Observable"
     */
    dematerialize<E, E1, A>(this: Observable<E, Notification<E1, A>>): Observable<E | E1, A>
    /**
     * @rewrite either from "@principia/observable/Observable"
     */
    either<E, A>(this: Observable<E, A>): Observable<never, Either<E, A>>
    /**
     * @rewrite ensuring_ from "@principia/observable/Observable"
     */
    ensuring<E, A>(this: Observable<E, A>, finalizer: () => void): Observable<E, A>
    /**
     * @rewrite exhaustAll from "@principia/observable/Observable"
     */
    exhaustAll<E, E1, A>(this: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A>
    /**
     * @rewrite exhaustMap_ from "@principia/observable/Observable"
     */
    exhaustMap<E, A, E1, B>(
      this: Observable<E, A>,
      f: (a: A, i: number) => ObservableInput<E1, B>
    ): Observable<E | E1, B>
    /**
     * @rewrite expand_ from "@principia/observable/Observable"
     */
    expand<E, A, E1, B>(
      this: Observable<E, A>,
      f: (a: A, i: number) => ObservableInput<E1, B>,
      concurrent?: number
    ): Observable<E | E1, B>
    /**
     * @rewrite filter_ from "@principia/observable/Observable"
     */
    filter<E, A, B extends A>(this: Observable<E, A>, refinement: RefinementWithIndex<number, A, B>): Observable<E, B>
    /**
     * @rewrite filter_ from "@principia/observable/Observable"
     */
    filter<E, A>(this: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A>
    /**
     * @rewrite filterMap_ from "@principia/observable/Observable"
     */
    filterMap<E, A, B>(this: Observable<E, A>, f: (value: A, index: number) => Option<B>): Observable<E, B>
    /**
     * @rewrite find_ from "@principia/observable/Observable"
     */
    find<E, A, B extends A>(
      this: Observable<E, A>,
      refinement: RefinementWithIndex<number, A, B>
    ): Observable<E, Option<B>>
    /**
     * @rewrite find_ from "@principia/observable/Observable"
     */
    find<E, A>(this: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, Option<A>>
    /**
     * @rewrite findIndex_ from "@principia/observable/Observable"
     */
    findIndex<E, A, B extends A>(
      this: Observable<E, A>,
      refinement: RefinementWithIndex<number, A, B>
    ): Observable<E, number>
    /**
     * @rewrite findIndex_ from "@principia/observable/Observable"
     */
    findIndex<E, A>(this: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, number>
    /**
     * @rewrite foldl_ from "@principia/observable/Observable"
     */
    foldl<E, A, B>(this: Observable<E, A>, initial: B, f: (acc: B, value: A, index: number) => B): Observable<E, B>
    /**
     * @rewrite forkJoin from "@principia/observable/Observable"
     */
    forkJoin<E, A, B extends ReadonlyArray<ObservableInput<any, any>>>(
      this: Observable<E, A>,
      ...sources: B
    ): Observable<E | ErrorOf<B[number]>, readonly [A, ...{ [K in keyof B]: TypeOf<B[K]> }]>
    /**
     * @rewrite ignore from "@principia/observable/Observable"
     */
    ignore<E, A>(this: Observable<E, A>): Observable<E, never>
    /**
     * @rewrite isEmpty from "@principia/observable/Observable"
     */
    isEmpty<E, A>(this: Observable<E, A>): Observable<E, boolean>
    /**
     * @rewrite map_ from "@principia/observable/Observable"
     */
    map<E, A, B>(this: Observable<E, A>, f: (a: A, i: number) => B): Observable<E, B>
    /**
     * @rewrite materialize from "@principia/observable/Observable"
     */
    materialize<E, A>(this: Observable<E, A>): Observable<never, Notification<E, A>>
    /**
     * @rewrite mergeAll_ from "@principia/observable/Observable"
     */
    mergeAll<E, E1, A>(this: Observable<E, ObservableInput<E1, A>>, concurrent?: number): Observable<E | E1, A>
    /**
     * @rewrite mergeMap_ from "@principia/observable/Observable"
     */
    mergeMap<E, A, E1, B>(
      this: Observable<E, A>,
      f: (value: A, index: number) => ObservableInput<E1, B>,
      concurrency?: number
    ): Observable<E | E1, B>
    /**
     * @rewrite mergeScan_ from "@principia/observable/Observable"
     */
    mergeScan<E, A, E1, B>(
      this: Observable<E, A>,
      initial: B,
      f: (acc: B, value: A, index: number) => ObservableInput<E1, B>,
      concurrent?: number
    ): Observable<E | E1, B>
    /**
     * @rewrite onErrorResumeNext_ from "@principia/observable/Observable"
     */
    onDefectResumeNext<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
      this: Observable<E, A>,
      ...sources: O
    ): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>>
    /**
     * @rewrite onEmpty_ from "@principia/observable/Observable"
     */
    onEmpty_<E, A, B>(this: Observable<E, A>, f: () => B): Observable<E, A | B>
    /**
     * @rewrite partition_ from "@principia/observable/Observable"
     */
    partition<E, A>(
      this: Observable<E, A>,
      predicate: PredicateWithIndex<number, A>
    ): readonly [Observable<E, A>, Observable<E, A>]
    /**
     * @rewrite partition_ from "@principia/observable/Observable"
     */
    partition<E, A, B extends A>(
      this: Observable<E, A>,
      refinement: RefinementWithIndex<number, A, B>
    ): readonly [Observable<E, Exclude<A, B>>, Observable<E, B>]
    /**
     * @rewrite partitionMap_ from "@principia/observable/Observable"
     */
    partitionMap<E, A, B, C>(
      this: Observable<E, A>,
      f: (value: A, index: number) => Either<B, C>
    ): readonly [Observable<E, B>, Observable<E, C>]
    /**
     * @rewrite raceWith_ from "@principia/observable/Observable"
     */
    raceWith<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
      this: Observable<E, A>,
      ...sources: O
    ): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>>
    /**
     * @rewrite repeat_ from "@principia/observable/Observable"
     */
    repeat<E, A>(this: Observable<E, A>, count?: number): Observable<E, A>
    /**
     * @rewrite repeatWhen_ from "@principia/observable/Observable"
     */
    repeatWhen<E, A, E1>(
      this: Observable<E, A>,
      notifier: (notifications: Observable<never, void>) => Observable<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite retry_ from "@principia/observable/Observable"
     */
    retry<E, A>(this: Observable<E, A>, count?: number): Observable<E, A>
    /**
     * @rewrite retry_ from "@principia/observable/Observable"
     */
    retry<E, A>(this: Observable<E, A>, config: RetryConfig): Observable<E, A>
    /**
     * @rewrite retryWhen_ from "@principia/observable/Observable"
     */
    retryWhen<E, A, E1>(
      this: Observable<E, A>,
      notifier: (defects: Observable<never, any>) => Observable<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite sample_ from "@principia/observable/Observable"
     */
    sample<E, A, E1>(this: Observable<E, A>, notifier: Observable<E1, any>): Observable<E | E1, A>
    /**
     * @rewrite sampletime_ from "@principia/observable/Observable"
     */
    sampleTime<E, A>(this: Observable<E, A>, period: number, scheduler?: SchedulerLike): Observable<E, A>
    /**
     * @rewrite scanl_ from "@principia/observable/Observable"
     */
    scanl<E, A, B>(this: Observable<E, A>, initial: B, f: (acc: B, value: A, index: number) => B): Observable<E, B>
    /**
     * @rewrite share_ from "@principia/observable/Observable"
     */
    share<E, A, E1 = never, E2 = never, E3 = never>(
      this: Observable<E, A>,
      options?: ShareConfig<E, A, E1, E2, E3>
    ): Observable<E | E1 | E2 | E3, A>
    /**
     * @rewrite skip_ from "@principia/observable/Observable"
     */
    skip<E, A>(this: Observable<E, A>, count: number): Observable<E, A>
    /**
     * @rewrite skipLast_ from "@principia/observable/Observable"
     */
    skipLast<E, A>(this: Observable<E, A>, skipCount: number): Observable<E, A>
    /**
     * @rewrite skipUntil_ from "@principia/observable/Observable"
     */
    skipUntil<E, A, E1>(this: Observable<E, A>, notifier: Observable<E1, any>): Observable<E | E1, A>
    /**
     * @rewrite skipWhile_ from "@principia/observable/Observable"
     */
    skipWhile<E, A>(fa: Observable<E, A>, predicate: PredicateWithIndex<number, A>): Observable<E, A>
    /**
     * @rewrite startWith_ from "@principia/observable/Observable"
     */
    startWith<E, A, B extends ReadonlyArray<unknown>>(
      this: Observable<E, A>,
      ...values: B
    ): Observable<E, A | B[number]>
    /**
     * @rewrite subscribeOn_ from "@principia/observable/Observable"
     */
    subscribeOn<E, A>(this: Observable<E, A>, scheduler: SchedulerLike, delay?: number): Observable<E, A>
    /**
     * @rewrite switchAll from "@principia/observable/Observable"
     */
    switchAll<E, E1, A>(this: Observable<E, ObservableInput<E1, A>>): Observable<E | E1, A>
    /**
     * @rewrite switchMap_ from "@principia/observable/Observable"
     */
    switchMap<E, A, E1, B>(
      this: Observable<E, A>,
      f: (value: A, index: number) => ObservableInput<E1, B>
    ): Observable<E | E1, B>
    /**
     * @rewrite switchScan_ from "@principia/observable/Observable"
     */
    switchScan<E, A, E1, B>(
      this: Observable<E, A>,
      initial: B,
      f: (acc: B, value: A, index: number) => ObservableInput<E1, B>
    ): Observable<E | E1, B>
    /**
     * @rewrite take_ from "@principia/observable/Observable"
     */
    take<E, A>(this: Observable<E, A>, count: number): Observable<E, A>
    /**
     * @rewrite takeLast_ from "@principia/observable/Observable"
     */
    takeLast<E, A>(this: Observable<E, A>, count: number): Observable<E, A>
    /**
     * @rewrite takeUntil_ from "@principia/observable/Observable"
     */
    takeUntil<E, A, E1>(this: Observable<E, A>, notifier: ObservableInput<E1, any>): Observable<E | E1, A>
    /**
     * @rewrite takeWhile_ from "@principia/observable/Observable"
     */
    takeWhile<E, A, B extends A>(
      this: Observable<E, A>,
      refinement: RefinementWithIndex<number, A, B>,
      inclusive?: boolean
    ): Observable<E, B>
    /**
     * @rewrite takeWhile_ from "@principia/observable/Observable"
     */
    takeWhile<E, A>(
      this: Observable<E, A>,
      predicate: PredicateWithIndex<number, A>,
      inclusive?: boolean
    ): Observable<E, A>
    /**
     * @rewrite tap_ from "@principia/observable/Observable"
     */
    tap<E, A>(this: Observable<E, A>, observer: Partial<Observer<E, A>>): Observable<E, A>
    /**
     * @rewrite throttle_ from "@principia/observable/Observable"
     */
    throttle<E, A, E1>(
      this: Observable<E, A>,
      durationSelector: (a: A) => ObservableInput<E1, any>,
      config?: ThrottleConfig
    ): Observable<E | E1, A>
    /**
     * @rewrite throttleTime_ from "@principia/observable/Observable"
     */
    throttleTime<E, A>(
      this: Observable<E, A>,
      duration: number,
      scheduler?: SchedulerLike,
      config?: ThrottleConfig
    ): Observable<E, A>
    /**
     * @rewrite timeout_ from "@principia/observable/Observable"
     */
    timeout<E, A, E1, B, M = unknown>(
      this: Observable<E, A>,
      config: TimeoutConfig<A, E1, B, M> & { readonly with: (info: TimeoutInfo<A, M>) => ObservableInput<E1, B> }
    ): Observable<E | E1, A | B>
    /**
     * @rewrite timeout_ from "@principia/observable/Observable"
     */
    timeout<E, A, M = unknown>(
      this: Observable<E, A>,
      config: Omit<TimeoutConfig<A, never, any, M>, 'with'>
    ): Observable<E | TimeoutError<A, M>, A>
    /**
     * @rewriteGetter toArray_ from "@principia/observable/Observable"
     */
    toArray: Observable<E, ReadonlyArray<A>>
    /**
     * @rewrite unique_ from "@principia/observable/Observable"
     */
    unique<E, A, K, E1 = never>(
      this: Observable<E, A>,
      toKey?: (value: A) => K,
      flushes?: Observable<E1, any>
    ): Observable<E | E1, A>
    /**
     * @rewrite uniqueUntilChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilChanged<E, A, K>(this: Observable<E, A>, E: Eq<K>, keySelector: (value: A) => K): Observable<E, A>
    /**
     * @rewrite uniqueUntilChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilChanged<E, A, K>(
      this: Observable<E, A>,
      equals: (x: K, y: K) => boolean,
      keySelector: (value: A) => K
    ): Observable<E, A>
    /**
     * @rewrite uniqueUntilChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilChanged<E, A>(this: Observable<E, A>, E: Eq<A>): Observable<E, A>
    /**
     * @rewrite uniqueUntilChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilChanged<E, A>(this: Observable<E, A>, equals: (x: A, y: A) => boolean): Observable<E, A>
    /**
     * @rewrite uniqueUntilKeyChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilKeyChanged<E, A, K extends keyof A>(this: Observable<E, A>, key: K, E: Eq<A[K]>): Observable<E, A>
    /**
     * @rewrite uniqueUntilKeyChanged_ from "@principia/observable/Observable"
     */
    uniqueUntilKeyChanged<E, A, K extends keyof A>(
      this: Observable<E, A>,
      key: K,
      equals: (x: A[K], y: A[K]) => boolean
    ): Observable<E, A>
    /**
     * @rewrite window_ from "@principia/observable/Observable"
     */
    window<E, A, E1>(this: Observable<E, A>, windowBoundaries: Observable<E1, any>): Observable<E1, Observable<E, A>>
    /**
     * @rewrite windowCount_ from "@principia/observable/Observable"
     */
    windowCount<E, A>(
      this: Observable<E, A>,
      windowSize: number,
      startWindowEvery?: number
    ): Observable<never, Observable<E, A>>
    /**
     * @rewrite windowTime_ from "@principia/observable/Observable"
     */
    windowTime<E, A>(
      this: Observable<E, A>,
      windowTimeSpan: number,
      scheduler?: SchedulerLike
    ): Observable<never, Observable<E, A>>
    /**
     * @rewrite windowTime_ from "@principia/observable/Observable"
     */
    windowTime<E, A>(
      this: Observable<E, A>,
      windowTimeSpan: number,
      windowCreationInterval: number,
      scheduler?: SchedulerLike
    ): Observable<never, Observable<E, A>>
    /**
     * @rewrite windowTime_ from "@principia/observable/Observable"
     */
    windowTime<E, A>(
      this: Observable<E, A>,
      windowTimeSpan: number,
      windowCreationInterval: number,
      maxWindowSize: number,
      scheduler?: SchedulerLike
    ): Observable<never, Observable<E, A>>
    /**
     * @rewrite windowToggle_ from "@principia/observable/Observable"
     */
    windowToggle<E, A, E1, B, E2>(
      this: Observable<E, A>,
      openings: ObservableInput<E1, B>,
      closingSelector: (openValue: B) => ObservableInput<E2, any>
    ): Observable<E1 | E2, Observable<E, A>>
    /**
     * @rewrite windowWhen_ from "@principia/observable/Observable"
     */
    windowWhen<E, A, E1>(
      this: Observable<E, A>,
      closingSelector: () => ObservableInput<E1, any>
    ): Observable<E1, Observable<E, A>>
  }
}
