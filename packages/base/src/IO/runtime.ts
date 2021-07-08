import type { Exit } from '../Exit'
import type { Callback } from '../Fiber/core'
import type { FailureReporter } from '../Fiber/internal/io'
import type { IOEnv } from '../IOEnv'

import { isTracingEnabled } from '@principia/compile/util'

import * as C from '../Cause/core'
import { pretty } from '../Cause/core'
import { ClockTag, LiveClock } from '../Clock'
import { ConsoleTag, LiveConsole } from '../Console'
import * as Ex from '../Exit/core'
import { interruptible, newFiberId } from '../Fiber'
import { constVoid, flow, identity } from '../function'
import { FiberContext } from '../internal/FiberContext'
import { Platform } from '../internal/Platform'
import * as O from '../Option'
import { defaultRandom, RandomTag } from '../Random'
import * as Scope from '../Scope'
import * as Super from '../Supervisor'
import * as I from './core'
import { _I } from './core'

export const defaultEnv: IOEnv = {
  [ClockTag.key]: new LiveClock(),
  [RandomTag.key]: defaultRandom,
  [ConsoleTag.key]: new LiveConsole()
} as any

export const prettyReporter: FailureReporter = (e) => {
  console.error(pretty(e))
}

/**
 * IO Canceler
 */
export type AsyncCancel<E, A> = I.UIO<Exit<E, A>>

export const defaultPlatform = new Platform({
  executionTraceLength: 25,
  stackTraceLength: 25,
  traceExecution: isTracingEnabled(),
  traceStack: isTracingEnabled(),
  traceEffects: isTracingEnabled(),
  initialTracingStatus: isTracingEnabled(),
  ancestorExecutionTraceLength: 25,
  ancestorStackTraceLength: 25,
  ancestryLength: 25,
  renderer: C.defaultRenderer,
  reportFailure: constVoid,
  maxOp: 10_000,
  supervisor: Super.trackMainFibers
})

export class CustomRuntime<R, A> {
  constructor(readonly env: R, readonly platform: Platform<A>) {
    this.fiberContext   = this.fiberContext.bind(this)
    this.run_           = this.run_.bind(this)
    this.runAsap_       = this.runAsap_.bind(this)
    this.runCancel_     = this.runCancel_.bind(this)
    this.runPromise     = this.runPromise.bind(this)
    this.runPromiseExit = this.runPromiseExit.bind(this)
    this.runFiber       = this.runFiber.bind(this)
  }

  private fiberContext<E, A>(effect: I.IO<R, E, A>) {
    const initialIS  = interruptible
    const fiberId    = newFiberId()
    const scope      = Scope.unsafeMakeScope<Exit<E, A>>()
    const supervisor = Super.none

    const context = new FiberContext<E, A>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope,
      this.platform.maxOp,
      this.platform.reportFailure,
      this.platform,
      O.none()
    )

    if (supervisor !== Super.none) {
      supervisor.unsafeOnStart(this.env, effect, O.none(), context)
      context.onDone((exit) => supervisor.unsafeOnEnd(Ex.flatten(exit), context))
    }

    return context
  }

  runFiber<E, A>(self: I.IO<R, E, A>): FiberContext<E, A> {
    const context = this.fiberContext<E, A>(self)
    context.evaluateLater(self[_I])
    return context
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run_<E, A>(_: I.IO<R, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>(_)

    context.evaluateLater(_[_I])
    context.runAsync(cb || constVoid)
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run<E, A>(cb?: Callback<E, A>): (_: I.IO<R, E, A>) => void {
    return (_) => this.run_(_, cb)
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  runAsap_<E, A>(_: I.IO<R, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>(_)

    context.evaluateNow(_[_I])
    context.runAsync(cb || constVoid)
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  runAsap<E, A>(cb?: Callback<E, A>): (_: I.IO<R, E, A>) => void {
    return (_) => this.runAsap_(_, cb)
  }

  /**
   * Runs effect until completion returing a cancel effecr that when executed
   * triggers cancellation of the process
   */
  runCancel_<E, A>(_: I.IO<R, E, A>, cb?: Callback<E, A>): AsyncCancel<E, A> {
    const context = this.fiberContext<E, A>(_)

    context.evaluateLater(_[_I])
    context.runAsync(cb || constVoid)

    return context.interruptAs(context.id)
  }

  /**
   * Runs effect until completion returing a cancel effecr that when executed
   * triggers cancellation of the process
   */
  runCancel<E, A>(cb?: Callback<E, A>): (_: I.IO<R, E, A>) => AsyncCancel<E, A> {
    return (_) => this.runCancel_(_, cb)
  }

  /**
   * Run effect as a Promise, throwing a the first error or exception
   */
  runPromise<E, A>(_: I.IO<R, E, A>): Promise<A> {
    const context = this.fiberContext<E, A>(_)

    context.evaluateLater(_[_I])

    return new Promise((res, rej) => {
      context.runAsync(Ex.match(flow(C.squash(identity), rej), res))
    })
  }

  /**
   * Run effect as a Promise of the Exit state
   * in case of error.
   */
  runPromiseExit<E, A>(_: I.IO<R, E, A>): Promise<Exit<E, A>> {
    const context = this.fiberContext<E, A>(_)

    context.evaluateLater(_[_I])

    return new Promise((res) => {
      context.runAsync((exit) => {
        res(exit)
      })
    })
  }

  supervised<B>(supervisor: Super.Supervisor<B>): CustomRuntime<R, B> {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        supervisor
      })
    )
  }

  withEnvironment<R2>(f: (_: R) => R2) {
    return new CustomRuntime(f(this.env), this.platform)
  }

  traceRenderer(renderer: C.Renderer) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        renderer
      })
    )
  }

  traceExecution(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        traceExecution: b
      })
    )
  }

  executionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        executionTraceLength: n
      })
    )
  }

  traceStack(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        traceStack: b
      })
    )
  }

  stackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        stackTraceLength: n
      })
    )
  }

  traceEffects(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        traceEffects: b
      })
    )
  }

  initialTracingStatus(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        initialTracingStatus: b
      })
    )
  }

  ancestorExecutionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        ancestorExecutionTraceLength: n
      })
    )
  }

  ancestorStackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        ancestorStackTraceLength: n
      })
    )
  }

  ancestryLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        ancestryLength: n
      })
    )
  }

  reportFailure(reportFailure: (_: C.Cause<unknown>) => void) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        reportFailure
      })
    )
  }

  maxOp(maxOp: number) {
    return new CustomRuntime(
      this.env,
      new Platform({
        ...this.platform,
        maxOp
      })
    )
  }
}

/**
 * Construct custom runtime
 */
export function makeCustomRuntime<R, A>(env: R, platform: Platform<A>) {
  return new CustomRuntime(env, platform)
}

/**
 * Default runtime
 */
export const defaultRuntime = makeCustomRuntime(defaultEnv, defaultPlatform)

/**
 * Exports of default runtime
 */
export const { run_, runAsap_, runCancel_, run, runAsap, runCancel, runFiber, runPromise, runPromiseExit } =
  defaultRuntime

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export function runtime<R0>() {
  return I.asksIO((r0: R0) => I.platform((p) => I.succeedLazy(() => makeCustomRuntime<R0, unknown>(r0, p))))
}

export function withRuntimeM<R0, R, E, A>(f: (r: CustomRuntime<R0, unknown>) => I.IO<R, E, A>) {
  return I.chain_(runtime<R0>(), f)
}

export function withRuntime<R0, A>(f: (r: CustomRuntime<R0, unknown>) => A) {
  return I.chain_(runtime<R0>(), (r) => I.succeed(f(r)))
}
