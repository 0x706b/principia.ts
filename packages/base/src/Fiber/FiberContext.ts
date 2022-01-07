import type { Platform } from '../internal/Platform'
import type { Stack } from '../internal/Stack'
import type { Exit } from '../IO/Exit/core'
import type { Instruction, IO, Match, Race, UIO } from '../IO/primitives'
import type { Maybe } from '../Maybe'
import type { Supervisor } from '../Supervisor'
import type { Fiber, InterruptStatus, RuntimeFiber } from './core'
import type { FiberId } from './FiberId'
import type { TraceElement } from './Trace'

import { traceAs } from '@principia/compile/util'

import * as L from '../collection/immutable/List'
import * as E from '../Either'
import * as FR from '../FiberRef'
import { constVoid, identity, pipe } from '../function'
import { AtomicReference } from '../internal/AtomicReference'
import * as MQ from '../internal/MutableQueue'
import { defaultScheduler } from '../internal/Scheduler'
import { makeStack } from '../internal/Stack'
import * as C from '../IO/Cause'
import { interruptAs } from '../IO/combinators/interrupt'
import {
  asUnit,
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
import * as M from '../Maybe'
import * as Scope from '../Scope'
import * as Super from '../Supervisor'
import * as CS from './CancellerState'
import { FiberDescriptor, interruptStatus } from './core'
import { newFiberId } from './FiberId'
import * as FId from './FiberId'
import { fiberName } from './fiberName'
import * as State from './FiberState'
import * as Status from './FiberStatus'
import { SourceLocation, Trace, traceLocation, truncatedParentTrace } from './trace'

export type FiberRefLocals = Map<FR.Runtime<any>, unknown>

const forkScopeOverride = FR.unsafeMake<M.Maybe<Scope.Scope>>(M.nothing())

const currentEnvironment = FR.unsafeMake<any>(undefined, identity, (a, _) => a)

type Erased = IO<any, any, any>
type ErasedCont = (a: any) => Erased

export class TracingExit {
  readonly _tag = 'TracingExit'
  constructor(readonly apply: ErasedCont) {}
}

export class InterruptExit {
  readonly _tag = 'InterruptExit'
  constructor(readonly apply: ErasedCont) {}
}

export class HandlerFrame {
  readonly _tag = 'HandlerFrame'
  constructor(readonly apply: ErasedCont) {}
}

export class ApplyFrame {
  readonly _tag = 'ApplyFrame'
  constructor(readonly apply: ErasedCont) {}
}

export class Finalizer {
  readonly _tag = 'Finalizer'
  constructor(readonly finalizer: UIO<any>, readonly apply: ErasedCont) {}
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

  private state = State.initial<E, A>()

  private asyncEpoch = 0 | 0
  private stack = undefined as Stack<Frame> | undefined
  private interruptStatus = makeStack(this.initialInterruptStatus.toBoolean) as Stack<boolean> | undefined
  private currentSupervisor = this.initialSupervisor
  private traceStatusEnabled = this.platform.traceExecution || this.platform.traceStack
  private executionTraces = this.traceStatusEnabled
    ? MQ.bounded<TraceElement>(this.platform.executionTraceLength)
    : undefined
  private stackTraces = this.traceStatusEnabled ? MQ.bounded<TraceElement>(this.platform.stackTraceLength) : undefined
  private traceStatusStack = this.traceStatusEnabled ? makeStack(true) : undefined
  nextIO: Instruction | null = null

  constructor(
    protected readonly fiberId: FiberId,
    private readonly initialInterruptStatus: InterruptStatus,
    private readonly fiberRefLocals: FiberRefLocals,
    private readonly initialSupervisor: Supervisor<any>,
    private readonly children: Set<FiberContext<unknown, unknown>>,
    private readonly maxOperations: number,
    private readonly reportFailure: (e: C.Cause<E>) => void,
    private readonly platform: Platform<unknown>,
    private readonly parentTrace: M.Maybe<Trace>
  ) {
    this.runUntil = this.runUntil.bind(this)
  }

  get poll() {
    return succeedLazy(() => this.unsafePoll())
  }

  get inheritRefs() {
    return defer(() => {
      if (this.fiberRefLocals.size === 0) {
        return unit()
      } else {
        return foreachUnit_(this.fiberRefLocals, ([fiberRef, value]) =>
          FR.update_(fiberRef, (old) => fiberRef.join(old, value))
        )
      }
    })
  }

  getRef<A>(ref: FR.Runtime<A>): UIO<A> {
    return succeedLazy(() => (this.fiberRefLocals.get(ref) as A) || ref.initial)
  }

  get id() {
    return this.fiberId
  }

  awaitAsync(k: State.Callback<E, A>) {
    const exit = this.unsafeAddObserver((exit) => k(Ex.flatten(exit)))

    if (exit != null) {
      k(exit)
    }
  }

  get await(): UIO<Exit<E, A>> {
    return asyncInterrupt((k): E.Either<UIO<void>, UIO<Exit<E, A>>> => {
      const cb: State.Callback<never, Exit<E, A>> = (x) => k(fromExit(x))
      const result = this.unsafeAddObserver(cb)
      if (result == null) {
        return E.left(succeedLazy(() => this.unsafeRemoveObserver(cb)))
      } else {
        return E.right(succeed(result))
      }
    }, this.fiberId)
  }

  run(): void {
    this.runUntil(this.platform.maxYieldOp)
  }

  get scope(): Scope.Scope {
    return Scope.unsafeMake(this)
  }

  get status(): UIO<Status.FiberStatus> {
    return succeed(this.state.status)
  }

  get name(): Maybe<string> {
    return (this.fiberRefLocals.get(fiberName) as Maybe<string>) || M.nothing()
  }

  interruptAs(fiberId: FiberId): UIO<Exit<E, A>> {
    return this.unsafeInterruptAs(fiberId)
  }

  evalOn(effect: UIO<any>, orElse: UIO<any>): UIO<void> {
    return defer(() => this.unsafeEvalOn(effect, orElse))
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
      const superviseOps                   = this.currentSupervisor !== Super.none

      currentFiber.set(this)
      superviseOps && this.currentSupervisor.unsafeOnResume(this)

      while (current !== null) {
        try {
          let opCount = 0
          while (current !== null) {
            if (!this.unsafeShouldInterrupt) {
              const message = this.unsafeDrainMailbox()
              if (message !== null) {
                const oldIO = current
                current     = concrete(chain_(message, () => oldIO))
              } else if (opCount === maxOpCount) {
                this.unsafeRunLater(current)
                current = null
              } else {
                superviseOps && this.currentSupervisor.unsafeOnEffect(this, current)
                switch (current._tag) {
                  case IOTag.Chain: {
                    const nested = concrete(current.io)
                    const k      = current.f

                    switch (nested._tag) {
                      case IOTag.Succeed: {
                        if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                          this.unsafeAddTraceValue(nested.trace)
                        }
                        current = concrete(k(nested.value))
                        break
                      }
                      case IOTag.SucceedLazy: {
                        if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                          this.unsafeAddTrace(nested.effect)
                        }
                        current = concrete(k(nested.effect()))
                        break
                      }
                      case IOTag.SucceedLazyWith: {
                        if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                          this.unsafeAddTrace(nested.effect)
                        }
                        current = concrete(k(nested.effect(this.platform, this.fiberId)))
                        break
                      }
                      case IOTag.Yield: {
                        current = null
                        this.unsafeRunLater(concrete(unit()))
                        break
                      }
                      default: {
                        this.unsafePushStackFrame(new ApplyFrame(current.f))
                        current = concrete(current.io)
                        break
                      }
                    }
                    break
                  }
                  case IOTag.SetTracingStatus: {
                    if (this.traceStatusStack) {
                      this.unsafePushTracingStatus(current.flag)
                      this.stack = makeStack(this.tracingExit, this.stack)
                    }
                    current = concrete(current.effect)
                    break
                  }
                  case IOTag.GetTracingStatus: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.f)
                    }
                    current = concrete(current.f(this.unsafeIsInTracingRegion))
                    break
                  }
                  case IOTag.GetTrace: {
                    current = this.unsafeNextEffect(this.unsafeCaptureTrace(undefined))
                    break
                  }
                  case IOTag.Succeed: {
                    if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTraceValue(current.trace)
                    }
                    current = this.unsafeNextEffect(current.value)
                    break
                  }
                  case IOTag.SucceedLazy: {
                    if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.effect)
                    }
                    current = this.unsafeNextEffect(current.effect())
                    break
                  }
                  case IOTag.SucceedLazyWith: {
                    if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.effect)
                    }
                    current = this.unsafeNextEffect(current.effect(this.platform, this.fiberId))
                    break
                  }
                  case IOTag.Fail: {
                    if (this.platform.traceEffects && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.fill)
                    }
                    const fast = fastPathChainContinuationTrace.get
                    fastPathChainContinuationTrace.set(undefined)
                    const tracedCause    = current.fill(() => this.unsafeCaptureTrace(fast))
                    const discardedFolds = this.unsafeUnwindStack()
                    const strippedCause  = discardedFolds ? C.stripFailures(tracedCause) : tracedCause
                    const suppressed     = this.unsafeClearSuppressedCause()
                    const fullCause      = C.contains_(strippedCause, suppressed)
                      ? strippedCause
                      : C.then(strippedCause, suppressed)
                    if (this.unsafeIsStackEmpty) {
                      this.unsafeSetInterrupting(true)
                      current = this.unsafeTryDone(Ex.failCause(fullCause))
                    } else {
                      this.unsafeSetInterrupting(false)
                      current = this.unsafeNextEffect(fullCause)
                    }
                    break
                  }
                  case IOTag.Match: {
                    this.unsafePushStackFrame(current)
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.SetInterrupt: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTraceValue(current.trace)
                    }
                    this.unsafePushInterruptStatus(current.flag.toBoolean)
                    this.unsafeRestoreInterruptStatus()
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.GetInterrupt: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.f)
                    }
                    current = concrete(current.f(interruptStatus(this.unsafeIsInterruptible)))
                    break
                  }
                  case IOTag.Async: {
                    if (this.unsafeIsInTracingRegion && this.platform.traceEffects) {
                      this.unsafeAddTrace(current.register)
                    }
                    const epoch     = this.asyncEpoch
                    this.asyncEpoch = epoch + 1
                    this.unsafeEnterAsync(epoch, current.blockingOn)
                    const r = current.register(this.unsafeCreateAsyncResume(epoch))
                    switch (r._tag) {
                      case 'Left': {
                        this.unsafeSetAsyncCanceller(epoch, r.left)
                        if (this.unsafeShouldInterrupt) {
                          if (this.unsafeExitAsync(epoch)) {
                            this.unsafeSetInterrupting(true)
                            current = concrete(chain_(r.left, () => failCause(this.unsafeClearSuppressedCause())))
                          } else {
                            current = null
                          }
                        } else {
                          current = null
                        }
                        break
                      }
                      case 'Right': {
                        if (!this.unsafeExitAsync(epoch)) {
                          current = null
                        } else {
                          current = concrete(r.right)
                        }
                      }
                    }
                    break
                  }
                  case IOTag.Fork: {
                    if (current.trace && this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTraceValue(current.trace)
                    }
                    current = this.unsafeNextEffect(
                      this.unsafeFork(concrete(current.io), current.scope, current.reportFailure)
                    )
                    break
                  }
                  case IOTag.GetDescriptor: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.f)
                    }
                    current = concrete(current.f(this.unsafeGetDescriptor()))
                    break
                  }
                  case IOTag.Yield: {
                    current = null
                    this.unsafeRunLater(concrete(unit()))
                    break
                  }
                  case IOTag.Access: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.f)
                    }
                    current = concrete(current.f(this.unsafeGetRef(currentEnvironment)))
                    break
                  }
                  case IOTag.Provide: {
                    const oldEnvironment = this.unsafeGetRef(currentEnvironment)
                    this.unsafeSetRef(currentEnvironment, current.env)
                    this.unsafeAddFinalizer(
                      succeedLazy(() => {
                        this.unsafeSetRef(currentEnvironment, oldEnvironment)
                      })
                    )
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.Defer: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.make)
                    }
                    current = concrete(current.make())
                    break
                  }
                  case IOTag.DeferWith: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.make)
                    }
                    current = concrete(current.make(this.platform, this.fiberId))
                    break
                  }

                  case IOTag.FiberRefGetAll: {
                    current = concrete(current.make(this.fiberRefLocals))
                    break
                  }

                  case IOTag.FiberRefModify: {
                    const c                  = current
                    const [result, newValue] = current.f(this.unsafeGetRef(current.fiberRef))
                    this.unsafeSetRef(c.fiberRef, newValue)
                    current = this.unsafeNextEffect(result)
                    break
                  }

                  case IOTag.FiberRefLocally: {
                    const oldValue = this.unsafeGetRef(current.fiberRef)
                    const fiberRef = current.fiberRef
                    this.unsafeSetRef(fiberRef, current.localValue)
                    this.unsafeAddFinalizer(
                      succeedLazy(() => {
                        this.unsafeSetRef(fiberRef, oldValue)
                      })
                    )
                    current = concrete(current.io)
                    break
                  }

                  case IOTag.FiberRefDelete: {
                    this.unsafeDeleteRef(current.fiberRef)
                    current = this.unsafeNextEffect(undefined)
                    break
                  }

                  case IOTag.FiberRefWith: {
                    current = concrete(current.f(this.unsafeGetRef(current.fiberRef)))
                    break
                  }

                  case IOTag.GetPlatform: {
                    if (this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTrace(current.f)
                    }
                    current = concrete(current.f(this.platform))
                    break
                  }

                  case IOTag.Race: {
                    current = concrete(this.unsafeRace(current))
                    break
                  }

                  case IOTag.Supervise: {
                    const oldSupervisor    = this.currentSupervisor
                    const newSupervisor    = Super.cross_(current.supervisor, oldSupervisor)
                    this.currentSupervisor = newSupervisor
                    this.unsafeAddFinalizer(
                      succeedLazy(() => {
                        this.currentSupervisor = oldSupervisor
                      })
                    )
                    current = concrete(current.io)
                    break
                  }

                  case IOTag.GetForkScope: {
                    current = concrete(
                      current.f(
                        pipe(
                          this.unsafeGetRef(forkScopeOverride),
                          M.getOrElse(() => this.scope)
                        )
                      )
                    )
                    break
                  }

                  case IOTag.OverrideForkScope: {
                    if (current.trace && this.platform.traceExecution && this.unsafeIsInTracingRegion) {
                      this.unsafeAddTraceValue(current.trace)
                    }

                    const oldForkScopeOverride = this.unsafeGetRef(forkScopeOverride)
                    this.unsafeSetRef(forkScopeOverride, current.forkScope)
                    this.unsafeAddFinalizer(
                      succeedLazy(() => {
                        this.unsafeSetRef(forkScopeOverride, oldForkScopeOverride)
                      })
                    )
                    current = concrete(current.io)
                    break
                  }
                  case IOTag.Ensuring: {
                    this.unsafeAddFinalizer(current.finalizer)
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
              current = concrete(failCause(this.unsafeClearSuppressedCause()))
              this.unsafeSetInterrupting(true)
            }
            opCount++
          }
        } catch (e) {
          if (isIOError(e)) {
            current = concrete(failCause(e.cause))
          } else {
            this.unsafeSetInterrupting(true)
            current = concrete(halt(e))
          }
        }
      }
    } finally {
      currentFiber.set(null)
      this.currentSupervisor !== Super.none && this.currentSupervisor.unsafeOnSuspend(this)
    }
  }

  unsafeRunLater(i0: Instruction) {
    defaultScheduler(() => {
      this.nextIO = i0
      this.runUntil(this.platform.maxYieldOp)
    })
  }

  private unsafeAddTrace(f: Function) {
    if (this.unsafeIsInTracingRegion && '$trace' in f) {
      this.executionTraces!.enqueue(new SourceLocation(f['$trace']))
    }
  }

  private unsafeAddTraceValue(trace: string | undefined | TraceElement) {
    if (this.unsafeIsInTracingRegion && trace) {
      this.executionTraces!.enqueue(typeof trace === 'string' ? new SourceLocation(trace) : trace)
    }
  }

  private tracingExit = new TracingExit((v: any) => {
    this.unsafePopTracingStatus()
    return new Succeed(v)
  })

  private unsafeGetRef<A>(ref: FR.Runtime<A>): A {
    return (this.fiberRefLocals.get(ref) as A) || ref.initial
  }

  private unsafeSetRef<A>(ref: FR.Runtime<A>, value: A): void {
    this.fiberRefLocals.set(ref, value)
  }

  private unsafeDeleteRef<A>(ref: FR.Runtime<A>): void {
    this.fiberRefLocals.delete(ref)
  }

  private unsafePoll() {
    switch (this.state._tag) {
      case 'Executing': {
        return M.nothing()
      }
      case 'Done': {
        return M.just(this.state.value)
      }
    }
  }

  private interruptExit = new InterruptExit((v: any) => {
    if (this.unsafeIsInterruptible) {
      this.unsafePopInterruptStatus()
      return succeed(v)
    } else {
      return succeedLazy(() => {
        this.unsafePopInterruptStatus()
        return v
      })
    }
  })

  private unsafeAddFinalizer(finalizer: UIO<any>): void {
    this.unsafePushStackFrame(
      new Finalizer(finalizer, (v) => {
        this.unsafeDisableInterruption()
        this.unsafeRestoreInterruptStatus()
        return map_(finalizer, () => v)
      })
    )
  }

  private get unsafeIsInterruptible() {
    return this.interruptStatus ? this.interruptStatus.value : true
  }

  private get unsafeIsInterrupted() {
    return this.state.interruptors.size > 0
  }

  private get unsafeIsInterrupting() {
    return Status.isInterrupting(this.state.status)
  }

  private get unsafeShouldInterrupt() {
    return this.unsafeIsInterrupted && this.unsafeIsInterruptible && !this.unsafeIsInterrupting
  }

  private get unsafeIsStackEmpty() {
    return !this.stack
  }

  private get unsafeIsInTracingRegion() {
    return (
      this.traceStatusEnabled &&
      (this.traceStatusStack ? this.traceStatusStack.value : this.platform.initialTracingStatus)
    )
  }

  private unsafePopTracingStatus() {
    this.traceStatusStack = this.traceStatusStack?.previous
  }

  private unsafePushTracingStatus(flag: boolean) {
    this.traceStatusStack = makeStack(flag, this.traceStatusStack)
  }

  private unsafePushStackFrame(k: Frame) {
    if (this.platform.traceStack && this.unsafeIsInTracingRegion) {
      this.stackTraces!.enqueue(traceLocation(k.apply))
    }
    this.stack = makeStack(k, this.stack)
  }

  private unsafePopStackFrame() {
    const current = this.stack?.value
    this.stack    = this.stack?.previous
    return current
  }

  private unsafeDisableInterruption(): void {
    this.unsafePushInterruptStatus(false)
  }

  private unsafeRestoreInterruptStatus(): void {
    this.unsafePushStackFrame(this.interruptExit)
  }

  private unsafePushInterruptStatus(flag: boolean) {
    this.interruptStatus = makeStack(flag, this.interruptStatus)
  }

  private unsafePopInterruptStatus() {
    const current        = this.interruptStatus?.value
    this.interruptStatus = this.interruptStatus?.previous
    return current
  }

  private unsafePopStackTrace() {
    this.stackTraces!.dequeue(undefined)
  }

  private unsafeAddSuppressedCause(cause: C.Cause<never>): void {
    if (!C.isEmpty(cause)) {
      if (this.state._tag === 'Executing') {
        this.state.suppressed = C.then(this.state.suppressed, cause)
      }
    }
  }

  /**
   * Unwinds the stack, looking for the first error handler, and exiting
   * interruptible / uninterruptible regions.
   */
  private unsafeUnwindStack() {
    let unwinding      = true
    let discardedFolds = false

    // Unwind the stack, looking for an error handler:
    while (unwinding && !this.unsafeIsStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frame = this.unsafePopStackFrame()!

      switch (frame._tag) {
        case 'InterruptExit': {
          this.unsafePopInterruptStatus()
          break
        }
        case 'TracingExit': {
          this.unsafePopTracingStatus()
          break
        }
        case 'Finalizer': {
          this.unsafeDisableInterruption()
          this.unsafePushStackFrame(
            new ApplyFrame((cause) =>
              matchCauseIO_(
                frame.finalizer,
                (finalizerCause) => {
                  this.unsafePopInterruptStatus()
                  this.unsafeAddSuppressedCause(finalizerCause)
                  return failCause(cause)
                },
                () => {
                  this.unsafePopInterruptStatus()
                  return failCause(cause)
                }
              )
            )
          )
          unwinding = false
          break
        }
        case IOTag.Match: {
          if (this.platform.traceStack && this.unsafeIsInTracingRegion) {
            this.unsafePopStackTrace()
          }
          if (!this.unsafeShouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            this.unsafePushStackFrame(new HandlerFrame(frame.onFailure))
            unwinding = false
          } else {
            discardedFolds = true
          }
          break
        }
        default: {
          if (this.platform.traceStack && this.unsafeIsInTracingRegion) {
            this.unsafePopStackTrace()
          }
        }
      }
    }

    return discardedFolds
  }

  private unsafeAddObserver(k: State.Callback<never, Exit<E, A>>): Exit<E, A> | null {
    switch (this.state._tag) {
      case 'Done': {
        return this.state.value
      }
      case 'Executing': {
        this.state.observers.add(k)
        return null
      }
    }
  }

  private unsafeNextEffect(value: any): Instruction | null {
    if (!this.unsafeIsStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.unsafePopStackFrame()!

      if (this.unsafeIsInTracingRegion && this.platform.traceExecution) {
        this.unsafeAddTrace(k.apply)
      }
      if (this.platform.traceStack && k._tag !== 'InterruptExit' && k._tag !== 'TracingExit') {
        this.unsafePopStackTrace()
      }

      return concrete(k.apply(value))
    } else {
      return this.unsafeTryDone(Ex.succeed(value))
    }
  }

  private unsafeNotifyObservers(v: Exit<E, A>, observers: Set<State.Callback<never, Exit<E, A>>>) {
    if (observers.size > 0) {
      const result = Ex.succeed(v)
      observers.forEach((k) => k(result))
    }
  }

  private unsafeRemoveObserver(k: State.Callback<never, Exit<E, A>>) {
    if (this.state._tag === 'Executing') {
      this.state.observers.delete(k)
    }
  }

  private unsafeInterruptAs(fiberId: FiberId): UIO<Exit<E, A>> {
    const interruptedCause = C.interrupt(fiberId)
    return defer(() => {
      const oldState = this.state
      if (
        this.state._tag === 'Executing' &&
        this.state.status._tag === 'Suspended' &&
        this.state.status.interruptible &&
        this.state.asyncCanceller._tag === 'Registered'
      ) {
        const asyncCanceller      = this.state.asyncCanceller.asyncCanceller
        const interrupt           = failCause(interruptedCause)
        this.state.status         = Status.withInterrupting(this.state.status, true)
        this.state.interruptors   = new Set(oldState.interruptors).add(fiberId)
        this.state.asyncCanceller = new CS.Empty()
        this.unsafeRunLater(concrete(chain_(asyncCanceller, () => interrupt)))
      } else if (this.state._tag === 'Executing') {
        const newCause = C.then(this.state.suppressed, interruptedCause)
        this.state.interruptors.add(fiberId)
        this.state.suppressed = newCause
      }
      return this.await
    })
  }

  private unsafeTryDone(exit: Exit<E, A>): Instruction | null {
    switch (this.state._tag) {
      case 'Done': {
        // Already done
        return null
      }
      case 'Executing': {
        if (this.state.mailbox !== null) {
          // Not done because the mailbox isn't empty
          const mailbox      = this.state.mailbox
          this.state.mailbox = null
          this.unsafeSetInterrupting(true)
          return concrete(chain_(mailbox, () => fromExit(exit)))
        } else if (this.children.size === 0) {
          // We are truly "done" because all the children of this fiber have terminated,
          // and there are no more pending effects that we have to execute on the fiber.
          const interruptorsCause = State.interruptorsCause(this.state)

          const newExit = C.isEmpty(interruptorsCause)
            ? exit
            : Ex.mapErrorCause_(exit, (cause) => {
                if (C.contains_(cause, interruptorsCause)) {
                  return cause
                } else {
                  return C.then(cause, interruptorsCause)
                }
              })

          const observers = this.state.observers

          this.state = new State.Done(newExit)

          this.unsafeReportUnhandled(newExit)

          this.unsafeNotifyObservers(newExit, observers)

          return null
        } else {
          // not done because there are children left to close
          this.unsafeSetInterrupting(true)

          let interruptChildren = unit()

          this.children.forEach((child) => {
            interruptChildren = chain_(interruptChildren, () => child.interruptAs(this.fiberId))
          })
          this.children.clear()

          return concrete(chain_(interruptChildren, () => fromExit(exit)))
        }
      }
    }
  }

  private unsafeSetAsyncCanceller(epoch: number, asyncCanceller0: Erased | null): void {
    const asyncCanceller = !asyncCanceller0 ? unit() : asyncCanceller0
    if (this.state._tag === 'Executing') {
      if (
        this.state.status._tag === 'Suspended' &&
        this.state.asyncCanceller._tag === 'Pending' &&
        this.state.status.epoch === epoch
      ) {
        this.state.asyncCanceller = new CS.Registered(asyncCanceller)
      } else if (
        this.state.status._tag === 'Suspended' &&
        this.state.asyncCanceller._tag === 'Registered' &&
        this.state.status.epoch === epoch
      ) {
        throw new Error('inconsistent state in setAsyncCanceller')
      }
    } else {
      return
    }
  }

  private unsafeReportUnhandled(exit: Ex.Exit<E, A>) {
    if (exit._tag === Ex.ExitTag.Failure) {
      this.reportFailure(exit.cause)
    }
  }

  private unsafeSetInterrupting(value: boolean): void {
    switch (this.state._tag) {
      case 'Executing': {
        this.state.status = Status.withInterrupting(this.state.status, value)
        return
      }
      case 'Done': {
        return
      }
    }
  }

  private unsafeEnterAsync(epoch: number, blockingOn: FiberId): void {
    if (this.state._tag === 'Executing' && this.state.asyncCanceller._tag === 'Empty') {
      const newStatus = new Status.Suspended(
        this.state.status,
        this.unsafeIsInterruptible && !this.unsafeIsInterrupting,
        epoch,
        blockingOn
      )
      this.state.status         = newStatus
      this.state.asyncCanceller = new CS.Pending()
    }
  }

  private unsafeExitAsync(epoch: number): boolean {
    if (
      this.state._tag === 'Executing' &&
      this.state.status._tag === 'Suspended' &&
      this.state.status.epoch === epoch
    ) {
      this.state.status         = this.state.status.previous
      this.state.asyncCanceller = new CS.Empty()
      return true
    }
    return false
  }

  private unsafeCreateAsyncResume(epoch: number) {
    return (_: Erased) => {
      if (this.unsafeExitAsync(epoch)) {
        this.unsafeRunLater(concrete(_))
      }
    }
  }

  private unsafeFork(
    io: Instruction,
    forkScope: Maybe<Scope.Scope>,
    reportFailure: M.Maybe<(e: C.Cause<E>) => void>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope = pipe(
      forkScope,
      M.orElse(() => this.unsafeGetRef(forkScopeOverride)),
      M.getOrElse(() => this.scope)
    )

    const currentSupervisor = this.currentSupervisor
    const childId           = newFiberId()
    const grandChildren     = new Set<FiberContext<any, any>>()
    const ancestry          = this.unsafeIsInTracingRegion && (this.platform.traceExecution || this.platform.traceStack)
        ? M.just(this.unsafeCutAncestryTrace(this.unsafeCaptureTrace(undefined)))
        : M.nothing()

    const childContext = new FiberContext<any, any>(
      childId,
      interruptStatus(this.unsafeIsInterruptible),
      childFiberRefLocals,
      currentSupervisor,
      grandChildren,
      this.maxOperations,
      M.getOrElse_(reportFailure, () => this.reportFailure),
      this.platform,
      ancestry
    )

    if (currentSupervisor !== Super.none) {
      currentSupervisor.unsafeOnStart(this.unsafeGetRef(currentEnvironment), io, M.just(this), childContext)
      childContext.unsafeOnDone((exit) => {
        currentSupervisor.unsafeOnEnd(Ex.flatten(exit), childContext)
      })
    }

    const childIO = !parentScope.unsafeAdd(childContext) ? interruptAs(parentScope.fiberId) : io

    childContext.nextIO = concrete(childIO)
    defaultScheduler(() => childContext.runUntil(this.platform.maxYieldOp))

    return childContext
  }

  private unsafeOnDone(k: State.Callback<never, Exit<E, A>>): void {
    const exit = this.unsafeAddObserver(k)
    if (exit == null) {
      return
    } else {
      k(Ex.succeed(exit))
    }
  }

  private unsafeClearSuppressedCause(): C.Cause<never> {
    switch (this.state._tag) {
      case 'Executing': {
        const suppressed      = this.state.suppressed
        this.state.suppressed = C.empty
        return suppressed
      }
      case 'Done': {
        return C.empty
      }
    }
  }

  private unsafeGetDescriptor() {
    return new FiberDescriptor(
      this.fiberId,
      this.state.status,
      this.state.interruptors,
      interruptStatus(this.unsafeIsInterruptible),
      this.scope
    )
  }

  private unsafeRace<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: Race<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
  ): IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)
    const left          = this.unsafeFork(concrete(race.left), race.scope, M.just(constVoid))
    const right         = this.unsafeFork(concrete(race.right), race.scope, M.just(constVoid))

    return async<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
      traceAs(race.trace, (cb) => {
        const leftRegister = left.unsafeAddObserver((exit) => {
          Ex.match_(
            exit,
            () => this.unsafeCompleteRace(left, right, race.leftWins, exit, raceIndicator, cb),
            (v) => this.unsafeCompleteRace(left, right, race.leftWins, v, raceIndicator, cb)
          )
        })
        if (leftRegister != null) {
          this.unsafeCompleteRace(left, right, race.leftWins, leftRegister, raceIndicator, cb)
        } else {
          const rightRegister = right.unsafeAddObserver((exit) => {
            Ex.match_(
              exit,
              () => this.unsafeCompleteRace(right, left, race.rightWins, exit, raceIndicator, cb),
              (v) => this.unsafeCompleteRace(right, left, race.rightWins, v, raceIndicator, cb)
            )
          })
          if (rightRegister != null) {
            this.unsafeCompleteRace(right, left, race.rightWins, rightRegister, raceIndicator, cb)
          }
        }
      }),
      FId.combine_(left.fiberId, right.fiberId)
    )
  }

  private unsafeCompleteRace<R, R1, R2, E2, A2, R3, E3, A3>(
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

  private unsafeCaptureTrace(last: TraceElement | undefined): Trace {
    let exec = L.nil<TraceElement>()
    if (this.executionTraces) {
      this.executionTraces.forEach((el) => {
        exec = L.prepend_(exec, el)
      })
    }
    let stack_ = L.nil<TraceElement>()
    if (this.stackTraces) {
      this.stackTraces.forEach((el) => {
        L.prepend_(stack_, el)
      })
    }
    const stack = last ? L.prepend_(stack_, last) : stack_
    return new Trace(this.id, exec, stack, this.parentTrace)
  }

  private unsafeCutAncestryTrace(trace: Trace): Trace {
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

  private unsafeEvalOn(effect: UIO<any>, orElse: UIO<any>): UIO<void> {
    if (this.state._tag === 'Executing') {
      const newMailbox   = this.state.mailbox == null ? effect : chain_(this.state.mailbox, () => effect)
      this.state.mailbox = newMailbox
      return unit()
    } else {
      return asUnit(orElse)
    }
  }

  private unsafeDrainMailbox(): UIO<any> | null {
    if (this.state._tag === 'Executing') {
      const mailbox      = this.state.mailbox
      this.state.mailbox = null
      return mailbox
    } else {
      return null
    }
  }

  unsafeAddChild(child: FiberContext<unknown, unknown>): void {
    this.unsafeEvalOn(
      succeedLazy(() => {
        this.children.add(child)
      }),
      unit()
    )
  }
}
