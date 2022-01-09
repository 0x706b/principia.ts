import type { FiberId } from './FiberId'

import * as L from '../collection/immutable/List'
import * as Ev from '../Eval'
import { pipe } from '../function'
import * as M from '../Maybe'
import { prettyFiberId } from './FiberId'

export type TraceElement = NoLocation | SourceLocation

export class NoLocation {
  readonly _tag = 'NoLocation'
}
export class SourceLocation {
  readonly _tag = 'SourceLocation'
  constructor(readonly location: string) {}
}

export function traceLocation(k: any): TraceElement {
  if (k['$trace']) {
    return new SourceLocation(k['$trace'])
  }
  return new NoLocation()
}

export class Trace {
  constructor(
    readonly fiberId: FiberId,
    readonly executionTrace: L.List<TraceElement>,
    readonly stackTrace: L.List<TraceElement>,
    readonly parentTrace: M.Maybe<Trace>
  ) {}
}

function ancestryLength(trace: Trace): number {
  let i       = 0
  let current = trace.parentTrace
  while (M.isJust(current)) {
    i++
    current = current.value.parentTrace
  }
  return i
}

export function parents(trace: Trace): L.List<Trace> {
  let pushable = L.nil<Trace>()
  let parent   = M.toUndefined(trace.parentTrace)
  while (parent != null) {
    pushable = L.prepend_(pushable, parent)
    parent   = M.toUndefined(parent.parentTrace)
  }
  return pushable
}

export function truncatedParentTrace(trace: Trace, maxAncestors: number): M.Maybe<Trace> {
  if (ancestryLength(trace) > maxAncestors) {
    return pipe(
      parents(trace),
      L.take(maxAncestors),
      L.foldl(M.nothing<Trace>(), (parent, trace) =>
        M.just(new Trace(trace.fiberId, trace.executionTrace, trace.stackTrace, parent))
      )
    )
  } else {
    return trace.parentTrace
  }
}

export function prettyLocation(traceElement: TraceElement) {
  return traceElement._tag === 'NoLocation' ? 'No Location Present' : `${traceElement.location}`
}

export function prettyTrace(trace: Trace): string {
  return Ev.run(prettyTraceEval(trace))
}

export function prettyTraceEval(trace: Trace): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const execTrace  = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          '',
          ...L.reverse(L.map_(trace.executionTrace, (a) => `  ${prettyLocation(a)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          '',
          ...L.reverse(L.map_(trace.stackTrace, (e) => `  a future continuation at ${prettyLocation(e)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to: <empty trace>`]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === 'Nothing'
        ? [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:\n`, yield* _(prettyTraceEval(parent.value))]

    return ['', ...stackPrint, '', ...execPrint, '', ...ancestry].join('\n')
  })
}
