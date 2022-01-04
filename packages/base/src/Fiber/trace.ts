import type { Stack } from '../internal/Stack'
import type { FiberId } from './FiberId'

import { makeStack } from '../internal/Stack'
import * as L from '../List/core'
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
  const pushable = L.emptyPushable<Trace>()
  let parent     = M.toUndefined(trace.parentTrace)
  while (parent != null) {
    L.push(parent, pushable)
    parent = M.toUndefined(parent.parentTrace)
  }
  return pushable
}

export function truncatedParentTrace(trace: Trace, maxAncestors: number): M.Maybe<Trace> {
  if (ancestryLength(trace) > maxAncestors) {
    return L.foldr_(L.take_(parents(trace), maxAncestors), M.nothing() as M.Maybe<Trace>, (trace, parent) =>
      M.just(new Trace(trace.fiberId, trace.executionTrace, trace.stackTrace, parent))
    )
  } else {
    return trace.parentTrace
  }
}

export function prettyLocation(traceElement: TraceElement) {
  return traceElement._tag === 'NoLocation' ? 'No Location Present' : `${traceElement.location}`
}

export function prettyTrace(trace: Trace): string {
  let stack: Stack<Trace> | undefined = undefined
  let current: Trace | null           = trace
  while (current) {
    stack = makeStack(current, stack)
    if (M.isJust(current.parentTrace)) {
      current = current.parentTrace.value
    } else {
      current = null
    }
  }
  let traces: L.List<Array<string>> = L.emptyPushable()
  while (stack) {
    const trace      = stack.value
    stack            = stack.previous
    const execTrace  = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          '',
          ...L.toArray(L.map_(trace.executionTrace, (a) => `  ${prettyLocation(a)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          '',
          ...L.toArray(L.map_(trace.stackTrace, (e) => `  a future continuation at ${prettyLocation(e)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to: <empty trace>`]

    traces = L.prepend_(traces, [
      '',
      ...stackPrint,
      '',
      ...execPrint,
      '',
      `Fiber ${prettyFiberId(trace.fiberId)} was spawned by:`
    ])
  }

  return L.ifoldl_(traces, '' as string, (index, acc, trace) => {
    if (L.get_(traces, index + 1)._tag === 'Nothing') {
      return acc + `${trace.join('\n')} <empty trace>`
    } else {
      return acc + `${trace.join('\n')}\n`
    }
  })
}
