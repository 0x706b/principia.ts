import type { Callback } from '../Fiber/FiberState'
import type { FailureReporter } from '../Fiber/internal/io'
import type { IOEnv } from '../IOEnv'
import type { Exit } from './Exit'

import { isTracingEnabled } from '@principia/compile/util'

import { ClockTag, LiveClock } from '../Clock'
import { ConsoleTag, LiveConsole } from '../Console'
import { interruptible, newFiberId, showFiberId } from '../Fiber'
import { FiberContext } from '../Fiber/FiberContext'
import { RuntimeConfig } from '../Fiber/RuntimeConfig/RuntimeConfig'
import { RuntimeConfigFlag } from '../Fiber/RuntimeConfig/RuntimeConfigFlag'
import { RuntimeConfigFlags } from '../Fiber/RuntimeConfig/RuntimeConfigFlags'
import { constTrue, constVoid, flow, identity, pipe } from '../function'
import * as M from '../Maybe'
import { defaultRandom, RandomTag } from '../Random'
import * as Super from '../Supervisor'
import * as C from './Cause'
import * as I from './core'
import * as Ex from './Exit/core'

export const defaultEnv: IOEnv = {
  [ClockTag.key]: new LiveClock(),
  [RandomTag.key]: defaultRandom,
  [ConsoleTag.key]: new LiveConsole()
} as any

export const prettyReporter: FailureReporter = (e) => {
  console.error(C.defaultPrettyPrint(e))
}

/**
 * IO Canceler
 */
export type AsyncCancel<E, A> = I.UIO<Exit<E, A>>

export const defaultSupervisor = Super.unsafeTrack()

export const defaultRuntimeConfig = new RuntimeConfig({
  fatal: constTrue,
  reportFatal: constVoid,
  reportFailure: constVoid,
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
  supervisor: defaultSupervisor,
  flags: RuntimeConfigFlags.empty.add(RuntimeConfigFlag.EnableFiberRoots),
  yieldOpCount: 2048
})

export class Runtime<R> {
  constructor(readonly env: R, readonly config: RuntimeConfig) {
    this.fiberContext   = this.fiberContext.bind(this)
    this.run_           = this.run_.bind(this)
    this.runAsap_       = this.runAsap_.bind(this)
    this.runCancel_     = this.runCancel_.bind(this)
    this.runPromise     = this.runPromise.bind(this)
    this.runPromiseExit = this.runPromiseExit.bind(this)
    this.runFiber       = this.runFiber.bind(this)
  }

  private fiberContext<E, A>(effect: I.IO<R, E, A>) {
    const fiberId    = newFiberId()
    const supervisor = this.config.supervisor

    const ioWithEnvironment = pipe(effect, I.give(this.env))

    const context = new FiberContext<E, A>(fiberId, this.config, interruptible, new Map(), new Set(), M.nothing())

    if (supervisor !== Super.none) {
      supervisor.unsafeOnStart(this.env, ioWithEnvironment, M.nothing(), context)
      context.awaitAsync((exit) => supervisor.unsafeOnEnd(exit, context))
    }

    context.unsafeRunLater(I.concrete(ioWithEnvironment))

    return context
  }

  runFiber<E, A>(self: I.IO<R, E, A>): FiberContext<E, A> {
    const context = this.fiberContext<E, A>(self)
    return context
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run_<E, A>(_: I.IO<R, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>(_)
    context.awaitAsync(cb || constVoid)
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

    context.awaitAsync(cb || constVoid)
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

    context.awaitAsync(cb || constVoid)

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

    return new Promise((res, rej) => {
      context.awaitAsync(Ex.match(flow(C.squash(showFiberId)(identity), rej), res))
    })
  }

  /**
   * Run effect as a Promise of the Exit state
   * in case of error.
   */
  runPromiseExit<E, A>(_: I.IO<R, E, A>): Promise<Exit<E, A>> {
    const context = this.fiberContext<E, A>(_)

    return new Promise((res) => {
      context.awaitAsync((exit) => {
        res(exit)
      })
    })
  }

  withEnvironment<R2>(f: (_: R) => R2) {
    return new Runtime(f(this.env), this.config)
  }
}

/**
 * Construct custom runtime
 */
export function makeCustomRuntime<R, A>(env: R, config: RuntimeConfig) {
  return new Runtime(env, config)
}

/**
 * Default runtime
 */
export const defaultRuntime = makeCustomRuntime(defaultEnv, defaultRuntimeConfig)

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
  return I.asksIO((r0: R0) =>
    I.runtimeConfig((config) => I.succeedLazy(() => makeCustomRuntime<R0, unknown>(r0, config)))
  )
}

export function withRuntimeM<R0, R, E, A>(f: (r: Runtime<R0>) => I.IO<R, E, A>) {
  return I.chain_(runtime<R0>(), f)
}

export function withRuntime<R0, A>(f: (r: Runtime<R0>) => A) {
  return I.chain_(runtime<R0>(), (r) => I.succeed(f(r)))
}
