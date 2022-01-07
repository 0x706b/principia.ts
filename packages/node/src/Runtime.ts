import type * as Fiber from '@principia/base/Fiber'
import type { Trace, TraceElement } from '@principia/base/Fiber/trace'
import type { CustomRuntime } from '@principia/base/IO'

import * as L from '@principia/base/collection/immutable/List'
import * as Ev from '@principia/base/Eval'
import * as Ex from '@principia/base/Exit'
import { interruptAllAs_, prettyFiberId } from '@principia/base/Fiber'
import { pipe } from '@principia/base/function'
import { AtomicBoolean } from '@principia/base/internal/AtomicBoolean'
import * as I from '@principia/base/IO'
import { defaultRuntime, defaultSupervisor } from '@principia/base/IO'
import * as Cause from '@principia/base/IO/Cause'
import path from 'path'

export function defaultTeardown(status: number, id: Fiber.FiberId, onExit: (status: number) => void) {
  pipe(
    defaultSupervisor.value,
    I.tap((fibers) => interruptAllAs_(fibers, id)),
    I.run((exit) => {
      setTimeout(() => {
        if (Ex.isSuccess(exit) && exit.value.length === 0) {
          onExit(status)
        } else {
          defaultTeardown(status, id, onExit)
        }
      })
    })
  )
}

export const defaultHook =
  (cont: NodeJS.SignalsListener): ((signal: NodeJS.Signals) => void) =>
  (signal) =>
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

function prettyTraceNodeEval(trace: Trace, adapt: (path: string, mod?: string) => string): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const execTrace  = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          '',
          ...L.reverse(L.map_(trace.executionTrace, (a) => `  ${prettyLocationNode(a, adapt)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          '',
          ...L.reverse(L.map_(trace.stackTrace, (e) => `  a future continuation at ${prettyLocationNode(e, adapt)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to: <empty trace>`]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === 'Nothing'
        ? [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [
            `Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:\n`,
            yield* _(prettyTraceNodeEval(parent.value, adapt))
          ]

    return ['', ...stackPrint, '', ...execPrint, '', ...ancestry].join('\n')
  })
}

export function prettyTraceNode(trace: Trace, adapt: (path: string, mod?: string) => string) {
  return Ev.run(prettyTraceNodeEval(trace, adapt))
}

export const nodeTracer = (trace: Trace) =>
  prettyTraceNode(trace, (path) => path.replace('/dist-traced/esm/', '/').replace('/dist-traced/cjs/', '/'))

export class NodeRuntime<R, A> {
  constructor(readonly custom: CustomRuntime<R, A>) {
    this.runMain = this.runMain.bind(this)
  }

  private prettyPrintCause = Cause.makePrettyPrint(this.custom.platform.renderer)

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

    context.unsafeRunLater(I.concrete(effect))
    context.awaitAsync((exit) => {
      switch (exit._tag) {
        case 'Failure': {
          if (Cause.interruptedOnly(exit.cause)) {
            customTeardown(0, context.id, onExit)
            break
          } else {
            console.error(this.prettyPrintCause(exit.cause))
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
    renderId: Cause.defaultRenderer.renderId,
    renderError: Cause.defaultRenderer.renderError,
    renderUnknown: Cause.defaultRenderer.renderUnknown,
    renderFailure: Cause.defaultRenderer.renderFailure
  })
)

export const {
  custom: { run, runAsap, runCancel, runFiber, runPromise, runPromiseExit },
  runMain
} = nodeRuntime
