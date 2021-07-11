import type { Trace, TraceElement } from '@principia/base/Fiber/trace'
import type { CustomRuntime } from '@principia/base/IO'

import * as Cause from '@principia/base/Cause'
import * as Fiber from '@principia/base/Fiber'
import { interruptAllAs } from '@principia/base/Fiber'
import * as I from '@principia/base/IO'
import { defaultRuntime } from '@principia/base/IO'
import * as L from '@principia/base/List'
import * as Super from '@principia/base/Supervisor'
import * as S from '@principia/base/Sync'
import { AtomicBoolean } from '@principia/base/util/support/AtomicBoolean'
import path from 'path'

export function defaultTeardown(status: number, id: Fiber.FiberId, onExit: (status: number) => void) {
  I.run_(interruptAllAs(id)(Super.mainFibers), () => {
    setTimeout(() => {
      if (Super.mainFibers.size === 0) {
        onExit(status)
      } else {
        defaultTeardown(status, id, onExit)
      }
    }, 0)
  })
}

export const defaultHook = (cont: NodeJS.SignalsListener): ((signal: NodeJS.Signals) => void) => (signal) =>
  cont(signal)

export function prettyLocationNode(traceElement: TraceElement, adapt: (path: string, mod?: string) => string) {
  try {
    if (traceElement._tag === 'SourceLocation') {
      const isModule = traceElement.location.match(/\((.*)\): (.*):(\d+):(\d+)/)

      if (isModule) {
        const [, mod, file, line_, col] = isModule
        const line       = parseInt(line_)
        const modulePath = require.resolve(`${mod}/package.json`)
        const realPath   = adapt(path.join(modulePath, '..', file), mod)

        return `${realPath}:${line}:${col}`
      } else {
        const isPath = traceElement.location.match(/(.*):(\d+):(\d+)/)
        if (isPath) {
          const [, file, line_, col] = isPath
          const line                 = parseInt(line_)
          return `${path.join(process.cwd(), file)}:${line}:${col}`
        }
      }
    }
  } catch {
    //
  }
  return traceElement._tag === 'NoLocation' ? 'No Location Present' : `${traceElement.location}`
}

export function prettyTraceNodeSafe(trace: Trace, adapt: (path: string, mod?: string) => string): S.USync<string> {
  return S.gen(function* ($) {
    const execTrace  = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${Fiber.prettyFiberId(trace.fiberId)} Execution trace:`,
          '',
          ...L.toArray(L.map_(trace.executionTrace, (a) => `  ${prettyLocationNode(a, adapt)}`))
        ]
      : [`Fiber: ${Fiber.prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${Fiber.prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          '',
          ...L.toArray(L.map_(trace.stackTrace, (e) => `  a future continuation at ${prettyLocationNode(e, adapt)}`))
        ]
      : [`Fiber: ${Fiber.prettyFiberId(trace.fiberId)} was supposed to continue to: <empty trace>`]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === 'None'
        ? [`Fiber: ${Fiber.prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [
            `Fiber: ${Fiber.prettyFiberId(trace.fiberId)} was spawned by:\n`,
            yield* $(prettyTraceNodeSafe(parent.value, adapt))
          ]

    return ['', ...stackPrint, '', ...execPrint, '', ...ancestry].join('\n')
  })
}

export function prettyTraceNode(trace: Trace, adapt: (path: string, mod?: string) => string) {
  return S.run(prettyTraceNodeSafe(trace, adapt))
}

export const nodeTracer = (trace: Trace) =>
  prettyTraceNode(trace, (path) => path.replace('/dist-traced/esm/', '/').replace('/dist-traced/cjs/', '/'))

export class NodeRuntime<R, A> {
  constructor(readonly custom: CustomRuntime<R, A>) {
    this.runMain = this.runMain.bind(this)
  }

  /**
   * Runs effect until completion listening for system level termination signals that
   * triggers cancellation of the process, in case errors are found process will
   * exit with a status of 1 and cause will be pretty printed, if interruption
   * is found without errors the cause is pretty printed and process exits with
   * status 0. In the success scenario process exits with status 0 witout any log.
   *
   * Note: this should be used only in node.js as it depends on global process
   */
  runMain<E>(
    effect: I.IO<R, E, void>,
    customHook: (cont: NodeJS.SignalsListener) => NodeJS.SignalsListener = defaultHook,
    customTeardown: typeof defaultTeardown = defaultTeardown
  ): void {
    const onExit = (s: number) => {
      process.exit(s)
    }

    const context = this.custom.runFiber(effect)

    context.evaluateLater(effect[I._I])
    context.runAsync((exit) => {
      switch (exit._tag) {
        case 'Failure': {
          if (Cause.interruptedOnly(exit.cause)) {
            customTeardown(0, context.id, onExit)
            break
          } else {
            console.error(Cause.pretty(exit.cause, this.custom.platform.renderer))
            customTeardown(1, context.id, onExit)
            break
          }
        }
        case 'Success': {
          customTeardown(0, context.id, onExit)
          break
        }
      }
    })

    const interrupted = new AtomicBoolean(false)

    const handler: NodeJS.SignalsListener = (signal) => {
      customHook(() => {
        process.removeListener('SIGTERM', handler)
        process.removeListener('SIGINT', handler)

        if (interrupted.compareAndSet(false, true)) {
          this.custom.run_(context.interruptAs(context.id))
        }
      })(signal)
    }

    process.once('SIGTERM', handler)
    process.once('SIGINT', handler)
  }
}

export const nodeRuntime = new NodeRuntime(
  defaultRuntime.traceRenderer({
    renderTrace: nodeTracer,
    renderError: Cause.defaultRenderer.renderError,
    renderUnknown: Cause.defaultRenderer.renderUnknown,
    renderFailure: Cause.defaultRenderer.renderFailure
  })
)

export const {
  custom: { run, runAsap, runCancel, runFiber, runPromise, runPromiseExit },
  runMain
} = nodeRuntime
