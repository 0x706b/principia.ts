import type { Fiber, InterruptStatus, RuntimeFiber } from '../Fiber/core'
import type { FiberId } from '../Fiber/FiberId'
import type { TraceElement } from '../Fiber/Trace'
import type { FiberRef } from '../FiberRef'
import type { Exit } from '../IO/Exit/core'
import type { Instruction, IO, Match, Race, UIO } from '../IO/primitives'
import type { Maybe } from '../Maybe'
import type { Supervisor } from '../Supervisor'
import type { Stack } from '../util/support/Stack'
import type { Platform } from './Platform'

import { traceAs } from '@principia/compile/util'

import * as A from '../Array/core'
import * as E from '../Either'
import * as CS from '../Fiber/CancellerState'
import { FiberDescriptor, interruptStatus } from '../Fiber/core'
import { newFiberId } from '../Fiber/FiberId'
import * as State from '../Fiber/FiberState'
import * as Status from '../Fiber/FiberStatus'
import { SourceLocation, Trace, traceLocation, truncatedParentTrace } from '../Fiber/Trace'
import * as FR from '../FiberRef'
import { constVoid, flow } from '../function'
import * as C from '../IO/Cause'
import { interruptAs } from '../IO/combinators/interrupt'
import {
  async,
  asyncInterrupt,
  chain_,
  defer,
  failCause,
  foreachUnit_,
  fromExit,
  halt,
  map_,
  matchCauseIO_,
  succeed,
  succeedLazy,
  unit
} from '../IO/core'
import * as Ex from '../IO/Exit/core'
import { concrete, IOTag, isIOError, Succeed } from '../IO/primitives'
import * as L from '../List/core'
import * as M from '../Maybe'
import * as Scope from '../Scope'
import * as Super from '../Supervisor'
import { AtomicReference } from '../util/support/AtomicReference'
import { RingBuffer } from '../util/support/RingBuffer'
import { defaultScheduler } from '../util/support/Scheduler'
import { makeStack } from '../util/support/Stack'

export type FiberRefLocals = Map<FiberRef<any>, any>

type Erased = IO<any, any, any>
type Cont = (a: any) => Erased

export class TracingExit {
  readonly _tag = 'TracingExit'
  constructor(readonly apply: Cont) {}
}

export class InterruptExit {
  readonly _tag = 'InterruptExit'
  constructor(readonly apply: Cont) {}
}

export class HandlerFrame {
  readonly _tag = 'HandlerFrame'
  constructor(readonly apply: Cont) {}
}

export class ApplyFrame {
  readonly _tag = 'ApplyFrame'
  constructor(readonly apply: Cont) {}
}

export class Finalizer {
  readonly _tag = 'Finalizer'
  constructor(readonly finalizer: UIO<any>, readonly apply: Cont) {}
}

export type Frame =
  | InterruptExit
  | Match<any, any, any, any, any, any, any, any, any>
  | HandlerFrame
  | ApplyFrame
  | TracingExit
  | Finalizer

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export function unsafeCurrentFiber(): M.Maybe<FiberContext<any, any>> {
  return M.fromNullable(currentFiber.get)
}

/**
 * `FiberContext` provides all of the context and facilities required to run a `IO`
 */
export class FiberContext<E, A> implements RuntimeFiber<E, A> {
  readonly _tag = 'RuntimeFiber'

  private readonly state = new AtomicReference(State.initial<E, A>())

  private asyncEpoch = 0 | 0
  private scopeKey = undefined as Scope.Key | undefined
  private stack = undefined as Stack<Frame> | undefined
  private currentEnvironment = this.startEnv
  private interruptStatus = makeStack(this.initialInterruptStatus.toBoolean) as Stack<boolean> | undefined
  private currentSupervisor = this.initialSupervisor
  private currentForkScopeOverride: Maybe<Scope.Scope<Ex.Exit<any, any>>> = M.nothing()
  private traceStatusEnabled = this.platform.traceExecution || this.platform.traceStack
  private executionTraces = this.traceStatusEnabled
    ? new RingBuffer<TraceElement>(this.platform.executionTraceLength)
    : undefined
  private stackTraces = this.traceStatusEnabled
    ? new RingBuffer<TraceElement>(this.platform.stackTraceLength)
    : undefined
  private traceStatusStack = this.traceStatusEnabled ? makeStack(true) : undefined
  nextIO: Instruction | null = null

  constructor(
    protected readonly fiberId: FiberId,
    private readonly startEnv: any,
    private readonly initialInterruptStatus: InterruptStatus,
    private readonly fiberRefLocals: FiberRefLocals,
    private readonly initialSupervisor: Supervisor<any>,
    private readonly openScope: Scope.Open<Exit<E, A>>,
    private readonly maxOperations: number,
    private readonly reportFailure: (e: C.Cause<E>) => void,
    private readonly platform: Platform<unknown>,
    private readonly parentTrace: M.Maybe<Trace>
  ) {
    this.runUntil = this.runUntil.bind(this)
  }

  get poll() {
    return succeedLazy(() => this._poll())
  }

  private addTrace(f: Function) {
    if (this.inTracingRegion && '$trace' in f) {
      this.executionTraces!.push(new SourceLocation(f['$trace']))
    }
  }

  private addTraceValue(trace: string | undefined | TraceElement) {
    if (this.inTracingRegion && trace) {
      this.executionTraces!.push(typeof trace === 'string' ? new SourceLocation(trace) : trace)
    }
  }

  private tracingExit = new TracingExit((v: any) => {
    this.popTracingStatus()
    return new Succeed(v)
  })

  getRef<K>(fiberRef: FR.FiberRef<K>): UIO<K> {
    return succeedLazy(() => this.fiberRefLocals.get(fiberRef) || fiberRef.initial)
  }

  private _poll() {
    const state = this.state.get

    switch (state._tag) {
      case 'Executing': {
        return M.nothing()
      }
      case 'Done': {
        return M.just(state.value)
      }
    }
  }

  private interruptExit = new InterruptExit((v: any) => {
    if (this.isInterruptible) {
      this.popInterruptStatus()
      return succeed(v)
    } else {
      return succeedLazy(() => {
        this.popInterruptStatus()
        return v
      })
    }
  })

  private ensure(finalizer: UIO<any>): void {
    this.pushContinuation(
      new Finalizer(finalizer, (v) => {
        this.pushInterruptStatus(false)
        this.pushContinuation(this.interruptExit)
        return map_(finalizer, () => v)
      })
    )
  }

  get isInterruptible() {
    return this.interruptStatus ? this.interruptStatus.value : false
  }

  get isInterrupted() {
    return this.state.get.interruptors.size !== 0
  }

  get isInterrupting() {
    return Status.isInterrupting(this.state.get.status)
  }

  get shouldInterrupt() {
    return this.isInterrupted && this.isInterruptible && !this.isInterrupting
  }

  get isStackEmpty() {
    return !this.stack
  }

  get inTracingRegion() {
    return (
      this.traceStatusEnabled &&
      (this.traceStatusStack ? this.traceStatusStack.value : this.platform.initialTracingStatus)
    )
  }

  get id() {
    return this.fiberId
  }

  private popTracingStatus() {
    this.traceStatusStack = this.traceStatusStack?.previous
  }

  private pushTracingStatus(flag: boolean) {
    this.traceStatusStack = makeStack(flag, this.traceStatusStack)
  }

  private pushContinuation(k: Frame) {
    if (this.platform.traceStack && this.inTracingRegion) {
      this.stackTraces!.push(traceLocation(k.apply))
    }
    this.stack = makeStack(k, this.stack)
  }

  private popContinuation() {
    const current = this.stack?.value
    this.stack    = this.stack?.previous
    return current
  }

  private pushInterruptStatus(flag: boolean) {
    this.interruptStatus = makeStack(flag, this.interruptStatus)
  }

  private popInterruptStatus() {
    const current        = this.interruptStatus?.value
    this.interruptStatus = this.interruptStatus?.previous
    return current
  }

  private popStackTrace() {
    this.stackTraces!.pop()
  }

  awaitAsync(k: State.Callback<E, A>) {
    const v = this.registerObserver((xx) => k(Ex.flatten(xx)))

    if (v) {
      k(v)
    }
  }

  private addSupressedCause(cause: C.Cause<never>): void {
    if (!C.isEmpty(cause)) {
      const oldState = this.state.get
      if (oldState._tag === 'Executing') {
        const newState = new State.Executing(
          oldState.status,
          oldState.observers,
          C.then(oldState.suppressed, cause),
          oldState.interruptors,
          oldState.asyncCanceller
        )
        this.state.set(newState)
      }
    }
  }

  /**
   * Unwinds the stack, looking for the first error handler, and exiting
   * interruptible / uninterruptible regions.
   */
  private unwindStack() {
    let unwinding      = true
    let discardedFolds = false

    // Unwind the stack, looking for an error handler:
    while (unwinding && !this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frame = this.popContinuation()!

      switch (frame._tag) {
        case 'InterruptExit': {
          this.popInterruptStatus()
          break
        }
        case 'TracingExit': {
          this.popTracingStatus()
          break
        }
        case 'Finalizer': {
          this.pushInterruptStatus(false)
          this.pushContinuation(
            new ApplyFrame((cause) =>
              matchCauseIO_(
                frame.finalizer,
                (finalizerCause) => {
                  this.popInterruptStatus()
                  this.addSupressedCause(finalizerCause)
                  return failCause(cause)
                },
                () => {
                  this.popInterruptStatus()
                  return failCause(cause)
                }
              )
            )
          )
          break
        }
        case IOTag.Match: {
          if (this.platform.traceStack && this.inTracingRegion) {
            this.popStackTrace()
          }
          if (!this.shouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            this.pushContinuation(new HandlerFrame(frame.onFailure))
            unwinding = false
          } else {
            discardedFolds = true
          }
          break
        }
        default: {
          if (this.platform.traceStack && this.inTracingRegion) {
            this.popStackTrace()
          }
        }
      }
    }

    return discardedFolds
  }

  private registerObserver(k: State.Callback<never, Exit<E, A>>): Exit<E, A> | null {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        return oldState.value
      }
      case 'Executing': {
        const observers = [k, ...oldState.observers]

        this.state.set(
          new State.Executing(
            oldState.status,
            observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceller
          )
        )

        return null
      }
    }
  }

  private next(value: any): Instruction | null {
    if (!this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.popContinuation()!

      if (this.inTracingRegion && this.platform.traceExecution) {
        this.addTrace(k.apply)
      }
      if (this.platform.traceStack && k._tag !== 'InterruptExit' && k._tag !== 'TracingExit') {
        this.popStackTrace()
      }

      return concrete(k.apply(value))
    } else {
      return this.done(Ex.succeed(value))
    }
  }

  private notifyObservers(v: Exit<E, A>, observers: State.Callback<never, Exit<E, A>>[]) {
    if (observers.length > 0) {
      const result = Ex.succeed(v)
      observers.forEach((k) => k(result))
    }
  }

  get await(): UIO<Exit<E, A>> {
    return asyncInterrupt(
      (k): E.Either<UIO<void>, UIO<Exit<E, A>>> => {
        const cb: State.Callback<never, Exit<E, A>> = (x) => k(fromExit(x))
        const result = this.registerObserver(cb)
        if (result === null) {
          return E.left(succeedLazy(() => this.interruptObserver(cb)))
        } else {
          return E.right(succeed(result))
        }
      },
      [this.fiberId]
    )
  }

  private interruptObserver(k: State.Callback<never, Exit<E, A>>) {
    const oldState = this.state.get

    if (oldState._tag === 'Executing') {
      const observers = oldState.observers.filter((o) => o !== k)

      this.state.set(
        new State.Executing(
          oldState.status,
          observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceller
        )
      )
    }
  }

  interruptAs(fiberId: FiberId): UIO<Exit<E, A>> {
    const interruptedCause = C.interrupt(fiberId)

    return defer(() => {
      const oldState = this.state.get
      if (
        oldState._tag === 'Executing' &&
        oldState.status._tag === 'Suspended' &&
        oldState.status.interruptible &&
        oldState.asyncCanceller._tag === 'Registered'
      ) {
        const newState = new State.Executing(
          Status.withInterrupting(true)(oldState.status),
          oldState.observers,
          oldState.suppressed,
          new Set(oldState.interruptors).add(fiberId),
          new CS.Empty()
        )
        this.state.set(newState)
        const interrupt = failCause(interruptedCause)
        this.evaluateLater(concrete(interrupt))
      } else if (oldState._tag === 'Executing') {
        const newCause = C.then(oldState.suppressed, interruptedCause)
        this.state.set(
          new State.Executing(
            oldState.status,
            oldState.observers,
            newCause,
            new Set(oldState.interruptors).add(fiberId),
            oldState.asyncCanceller
          )
        )
      }
      return this.await
    })
  }

  private done(v: Exit<E, A>): Instruction | null {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        // Already done
        return null
      }
      case 'Executing': {
        if (this.openScope.scope.unsafeClosed) {
          const interruptorsCause = State.interruptorsCause(oldState)
          const newExit           = C.isEmpty(interruptorsCause)
            ? v
            : Ex.mapErrorCause_(v, (cause) => {
                if (C.contains_(cause, interruptorsCause)) {
                  return cause
                } else {
                  return C.then(cause, interruptorsCause)
                }
              })
          /*
           * We are truly "done" because all the children of this fiber have terminated,
           * and there are no more pending effects that we have to execute on the fiber.
           */
          this.state.set(new State.Done(newExit))
          this.reportUnhandled(newExit)
          this.notifyObservers(newExit, oldState.observers)

          return null
        } else {
          /*
           * We are not done yet, because we have to close the fiber's scope
           */
          this.setInterrupting(true)

          return concrete(chain_(this.openScope.close(v), () => fromExit(v)))
        }
      }
    }
  }

  private setAsyncCanceller(epoch: number, asyncCanceller0: Erased | null): void {
    const oldState       = this.state.get
    const asyncCanceller = !asyncCanceller0 ? unit() : asyncCanceller0
    if (oldState._tag === 'Executing') {
      if (
        oldState.status._tag === 'Suspended' &&
        oldState.asyncCanceller._tag === 'Pending' &&
        oldState.status.epoch === epoch
      ) {
        const newState = new State.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          new CS.Registered(asyncCanceller)
        )
        this.state.set(newState)
      }
    }
  }

  private reportUnhandled(exit: Ex.Exit<E, A>) {
    if (exit._tag === Ex.ExitTag.Failure) {
      this.reportFailure(exit.cause)
    }
  }

  private setInterrupting(value: boolean): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Executing': {
        this.state.set(
          new State.Executing(
            Status.withInterrupting(value)(oldState.status),
            oldState.observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceller
          )
        )
        return
      }
      case 'Done': {
        return
      }
    }
  }

  private enterAsync(epoch: number, blockingOn: ReadonlyArray<FiberId>): void {
    const oldState = this.state.get

    if (oldState._tag === 'Executing' && oldState.asyncCanceller._tag === 'Empty') {
      const newStatus = new Status.Suspended(oldState.status, this.isInterruptible, epoch, blockingOn)
      const newState  = new State.Executing(
        newStatus,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        new CS.Pending()
      )
      this.state.set(newState)
    }
  }

  private exitAsync(epoch: number): boolean {
    const oldState = this.state.get
    if (oldState._tag === 'Executing' && oldState.status._tag === 'Suspended' && oldState.status.epoch === epoch) {
      this.state.set(
        new State.Executing(
          oldState.status.previous,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          new CS.Empty()
        )
      )
      return true
    }
    return false
  }

  private resumeAsync(epoch: number) {
    return (_: Erased) => {
      if (this.exitAsync(epoch)) {
        this.evaluateLater(concrete(_))
      }
    }
  }

  evaluateLater(i0: Instruction) {
    this.nextIO = i0
    defaultScheduler(() => this.runUntil(this.platform.maxYieldOp))
  }

  get scope(): Scope.Scope<Exit<E, A>> {
    return this.openScope.scope
  }

  get status(): UIO<Status.FiberStatus> {
    return succeed(this.state.get.status)
  }

  private fork(
    i0: Instruction,
    forkScope: Maybe<Scope.Scope<Exit<any, any>>>,
    reportFailure: M.Maybe<(e: C.Cause<E>) => void>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope<Exit<any, any>> = M.getOrElse_(
      forkScope._tag === 'Just' ? forkScope : this.currentForkScopeOverride,
      () => this.scope
    )

    const currentEnv        = this.currentEnvironment
    const currentSupervisor = this.currentSupervisor
    const childId           = newFiberId()
    const childScope        = Scope.unsafeMakeScope<Exit<E, A>>()
    const ancestry          = this.inTracingRegion && (this.platform.traceExecution || this.platform.traceStack)
        ? M.just(this.cutAncestryTrace(this.captureTrace(undefined)))
        : M.nothing()

    const childContext = new FiberContext(
      childId,
      currentEnv,
      interruptStatus(this.isInterruptible),
      childFiberRefLocals,
      currentSupervisor,
      childScope,
      this.maxOperations,
      M.getOrElse_(reportFailure, () => this.reportFailure),
      this.platform,
      ancestry
    )

    if (currentSupervisor !== Super.none) {
      currentSupervisor.unsafeOnStart(currentEnv, i0, M.just(this), childContext)
      childContext.onDone((exit) => {
        currentSupervisor.unsafeOnEnd(Ex.flatten(exit), childContext)
      })
    }

    const childIO = this.parentScopeOp(parentScope, childContext, i0)

    childContext.nextIO = childIO
    defaultScheduler(() => childContext.runUntil(this.platform.maxYieldOp))

    return childContext
  }

  private parentScopeOp(
    parentScope: Scope.Scope<Exit<any, any>>,
    childContext: FiberContext<E, A>,
    i0: Instruction
  ): Instruction {
    if (parentScope !== Scope.globalScope) {
      const exitOrKey = parentScope.unsafeEnsure((exit) =>
        defer((): UIO<any> => {
          const _interruptors = exit._tag === Ex.ExitTag.Failure ? C.interruptors(exit.cause) : new Set<FiberId>()

          const head = _interruptors.values().next()

          if (head.done) {
            return childContext.interruptAs(this.fiberId)
          } else {
            return childContext.interruptAs(head.value)
          }
        })
      )

      return E.match_(
        exitOrKey,
        (exit) =>
          concrete(
            Ex.match_(
              exit,
              flow(
                C.interruptors,
                A.from,
                A.head,
                M.getOrElse(() => this.fiberId),
                interruptAs
              ),
              () => interruptAs(this.fiberId)
            )
          ),
        (key) => {
          childContext.scopeKey = key
          // Remove the finalizer key from the parent scope when the child fiber terminates:
          childContext.onDone(() => {
            parentScope.unsafeDeny(key)
          })

          return i0
        }
      )
    } else {
      return i0
    }
  }

  onDone(k: State.Callback<never, Exit<E, A>>): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        k(Ex.succeed(oldState.value))
        return
      }
      case 'Executing': {
        this.state.set(
          new State.Executing(
            oldState.status,
            [k, ...oldState.observers],
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceller
          )
        )
        return
      }
    }
  }

  private clearSuppressedCause(): C.Cause<never> {
    const oldState = this.state.get
    switch (oldState._tag) {
      case 'Executing': {
        const newState = new State.Executing(
          oldState.status,
          oldState.observers,
          C.empty,
          oldState.interruptors,
          oldState.asyncCanceller
        )
        this.state.set(newState)
        return oldState.suppressed
      }
      case 'Done': {
        return C.empty
      }
    }
  }

  private getDescriptor() {
    return new FiberDescriptor(
      this.fiberId,
      this.state.get.status,
      this.state.get.interruptors,
      interruptStatus(this.isInterruptible),
      this.scope
    )
  }

  private complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber<any, any>,
    loser: Fiber<any, any>,
    cont: (exit: Exit<any, any>, fiber: Fiber<any, any>) => Erased,
    winnerExit: Exit<any, any>,
    ab: AtomicReference<boolean>,
    cb: (_: IO<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
  ): void {
    if (ab.compareAndSet(true, false)) {
      Ex.match_(
        winnerExit,
        () => cb(cont(winnerExit, loser)),
        () => cb(chain_(winner.inheritRefs, () => cont(winnerExit, loser)))
      )
    }
  }

  get inheritRefs() {
    return defer(() => {
      const locals = this.fiberRefLocals
      if (locals.size === 0) {
        return unit()
      } else {
        return foreachUnit_(locals, ([fiberRef, value]) => FR.update((old) => fiberRef.join(old, value))(fiberRef))
      }
    })
  }

  private raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: Race<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
  ): IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)
    const left          = this.fork(concrete(race.left), race.scope, M.just(constVoid))
    const right         = this.fork(concrete(race.right), race.scope, M.just(constVoid))

    return async<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
      traceAs(race.trace, (cb) => {
        const leftRegister = left.registerObserver((exit) => {
          Ex.match_(
            exit,
            () => this.complete(left, right, race.leftWins, exit, raceIndicator, cb),
            (v) => this.complete(left, right, race.leftWins, v, raceIndicator, cb)
          )
        })
        if (leftRegister != null) {
          this.complete(left, right, race.leftWins, leftRegister, raceIndicator, cb)
        } else {
          const rightRegister = right.registerObserver((exit) => {
            Ex.match_(
              exit,
              () => this.complete(right, left, race.rightWins, exit, raceIndicator, cb),
              (v) => this.complete(right, left, race.rightWins, v, raceIndicator, cb)
            )
          })
          if (rightRegister != null) {
            this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb)
          }
        }
      }),
      [left.fiberId, right.fiberId]
    )
  }

  captureTrace(last: TraceElement | undefined): Trace {
    const exec   = this.executionTraces ? this.executionTraces.listReverse : L.empty()
    const stack_ = this.stackTraces ? this.stackTraces.listReverse : L.empty()
    const stack  = last ? L.prepend_(stack_, last) : stack_
    return new Trace(this.id, exec, stack, this.parentTrace)
  }

  cutAncestryTrace(trace: Trace): Trace {
    const maxExecLength  = this.platform.ancestorExecutionTraceLength
    const maxStackLength = this.platform.ancestorStackTraceLength
    const maxAncestors   = this.platform.ancestryLength - 1

    const truncated = truncatedParentTrace(trace, maxAncestors)

    return new Trace(
      trace.fiberId,
      L.take_(trace.executionTrace, maxExecLength),
      L.take_(trace.stackTrace, maxStackLength),
      truncated
    )
  }

  fastPathTrace(
    k: any,
    effect: any,
    fastPathChainContinuationTrace: AtomicReference<TraceElement | undefined>
  ): TraceElement | undefined {
    if (this.inTracingRegion) {
      const kTrace = traceLocation(k)

      if (this.platform.traceEffects) {
        this.addTrace(effect)
      }
      if (this.platform.traceStack) {
        fastPathChainContinuationTrace.set(kTrace)
      }
      return kTrace
    }
    return undefined
  }

  /**
   * The main evaluator loop for the fiber. For purely synchronous effects, this will run either
   * to completion, or for the specified maximum operation count. For effects with asynchronous
   * callbacks, the loop will proceed no further than the first asynchronous boundary.
   */
  runUntil(maxOpCount: number): void {
    try {
      let current: Instruction | null = this.nextIO
      this.nextIO                     = null
      const fastPathChainContinuationTrace = new AtomicReference<TraceElement | undefined>(undefined)
      currentFiber.set(this)

      while (current !== null) {
        try {
          let opCount = 0
          while (current !== null) {
            if (!this.shouldInterrupt) {
              if (opCount === maxOpCount) {
                this.evaluateLater(current)
                current = null
              } else {
                switch (current._tag) {
                  case IOTag.Chain: {
                    this.pushContinuation(new ApplyFrame(current.f))
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.SetTracingStatus: {
                    if (this.traceStatusStack) {
                      this.pushTracingStatus(current.flag)
                      this.stack = makeStack(this.tracingExit, this.stack)
                    }
                    current = concrete(current.effect)
                    break
                  }
                  case IOTag.GetTracingStatus: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = concrete(current.f(this.inTracingRegion))
                    break
                  }
                  case IOTag.GetTrace: {
                    current = this.next(this.captureTrace(undefined))
                    break
                  }
                  case IOTag.Succeed: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }
                    current = this.next(current.value)
                    break
                  }
                  case IOTag.SucceedLazy: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.effect)
                    }
                    current = this.next(current.effect())
                    break
                  }
                  case IOTag.SucceedLazyWith: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.effect)
                    }
                    current = this.next(current.effect(this.platform, this.fiberId))
                    break
                  }
                  case IOTag.Fail: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.fill)
                    }
                    const fast = fastPathChainContinuationTrace.get
                    fastPathChainContinuationTrace.set(undefined)
                    const tracedCause    = current.fill(() => this.captureTrace(fast))
                    const discardedFolds = this.unwindStack()
                    const fullCause      = C.then(
                      discardedFolds ? C.stripFailures(tracedCause) : tracedCause,
                      this.clearSuppressedCause()
                    )
                    if (this.isStackEmpty) {
                      this.setInterrupting(true)
                      current = this.done(Ex.failCause(fullCause))
                    } else {
                      this.setInterrupting(false)
                      current = this.next(fullCause)
                    }
                    break
                  }
                  case IOTag.Match: {
                    this.pushContinuation(current)
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.SetInterrupt: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }
                    this.pushInterruptStatus(current.flag.toBoolean)
                    this.pushContinuation(this.interruptExit)
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.GetInterrupt: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = concrete(current.f(interruptStatus(this.isInterruptible)))
                    break
                  }
                  case IOTag.Async: {
                    if (this.inTracingRegion && this.platform.traceEffects) {
                      this.addTrace(current.register)
                    }
                    const epoch     = this.asyncEpoch
                    this.asyncEpoch = epoch + 1
                    this.enterAsync(epoch, current.blockingOn)
                    const r = current.register(this.resumeAsync(epoch))
                    switch (r._tag) {
                      case 'Left': {
                        this.setAsyncCanceller(epoch, r.left)
                        if (this.shouldInterrupt) {
                          if (this.exitAsync(epoch)) {
                            this.setInterrupting(true)
                            current = concrete(chain_(r.left, () => failCause(this.clearSuppressedCause())))
                          } else {
                            current = null
                          }
                        } else {
                          current = null
                        }
                        break
                      }
                      case 'Right': {
                        if (!this.exitAsync(epoch)) {
                          current = null
                        } else {
                          current = concrete(r.right)
                        }
                      }
                    }
                    break
                  }
                  case IOTag.Fork: {
                    if (current.trace && this.platform.traceExecution && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }
                    current = this.next(this.fork(concrete(current.io), current.scope, current.reportFailure))
                    break
                  }
                  case IOTag.GetDescriptor: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = concrete(current.f(this.getDescriptor()))
                    break
                  }
                  case IOTag.Yield: {
                    current = null
                    this.evaluateLater(concrete(unit()))
                    break
                  }
                  case IOTag.Access: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = concrete(current.f(this.currentEnvironment))
                    break
                  }
                  case IOTag.Provide: {
                    const oldEnvironment    = this.currentEnvironment
                    this.currentEnvironment = current.env
                    this.ensure(
                      succeedLazy(() => {
                        this.currentEnvironment = oldEnvironment
                      })
                    )
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.Defer: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.make)
                    }
                    current = concrete(current.make())
                    break
                  }
                  case IOTag.DeferWith: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.make)
                    }
                    current = concrete(current.make(this.platform, this.fiberId))
                    break
                  }

                  case IOTag.NewFiberRef: {
                    const fiberRef = new FR.FiberRef(current.initial, current.onFork, current.onJoin)
                    this.fiberRefLocals.set(fiberRef, current.initial)
                    current = this.next(fiberRef)
                    break
                  }

                  case IOTag.ModifyFiberRef: {
                    const c                  = current
                    const oldValue           = M.fromNullable(this.fiberRefLocals.get(c.fiberRef))
                    const [result, newValue] = current.f(M.getOrElse_(oldValue, () => c.fiberRef.initial))
                    this.fiberRefLocals.set(c.fiberRef, newValue)
                    current = this.next(result)
                    break
                  }

                  case IOTag.GetPlatform: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = concrete(current.f(this.platform))
                    break
                  }

                  case IOTag.Race: {
                    current = concrete(this.raceWithImpl(current))
                    break
                  }

                  case IOTag.Supervise: {
                    const oldSupervisor    = this.currentSupervisor
                    const newSupervisor    = current.supervisor.and(oldSupervisor)
                    this.currentSupervisor = newSupervisor
                    this.ensure(
                      succeedLazy(() => {
                        this.currentSupervisor = oldSupervisor
                      })
                    )
                    current = concrete(current.io)
                    break
                  }

                  case IOTag.GetForkScope: {
                    current = concrete(current.f(M.getOrElse_(this.currentForkScopeOverride, () => this.scope)))
                    break
                  }

                  case IOTag.OverrideForkScope: {
                    if (current.trace && this.platform.traceExecution && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }

                    const oldForkScopeOverride    = this.currentForkScopeOverride
                    this.currentForkScopeOverride = current.forkScope
                    this.ensure(
                      succeedLazy(() => {
                        this.currentForkScopeOverride = oldForkScopeOverride
                      })
                    )
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.Ensuring: {
                    this.ensure(current.finalizer)
                    current = concrete(current.io)
                    break
                  }
                  default: {
                    console.log('Unrecognized Instruction', current)
                    throw new Error('Unrecognized Instruction')
                  }
                }
              }
            } else {
              current = concrete(failCause(this.clearSuppressedCause()))
              this.setInterrupting(true)
            }
            opCount++
          }
        } catch (e) {
          if (isIOError(e)) {
            switch (e.exit._tag) {
              case 'Success': {
                current = this.next(e.exit.value)
                break
              }
              case 'Failure': {
                current = concrete(failCause(e.exit.cause))
                break
              }
            }
          } else {
            this.setInterrupting(true)
            current = concrete(halt(e))
          }
        }
      }
    } finally {
      currentFiber.set(null)
    }
  }
}
