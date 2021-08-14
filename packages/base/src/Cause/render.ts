import type { Trace } from '../IO/Fiber/trace'
import type { NonEmptyArray } from '../NonEmptyArray'
import type { GenericCause } from './generic'

import * as A from '../Array/core'
import * as Ev from '../Eval'
import { pipe } from '../function'
import * as O from '../Option'
import { CauseTag } from './generic'

/*
 * -------------------------------------------------------------------------------------------------
 * Render
 * -------------------------------------------------------------------------------------------------
 */

type Segment = Sequential | Parallel | Failure

type Step = Parallel | Failure

interface Failure {
  _tag: 'Failure'
  lines: string[]
}

interface Parallel {
  _tag: 'Parallel'
  all: Sequential[]
}

interface Sequential {
  _tag: 'Sequential'
  all: Step[]
}

const Failure = (lines: string[]): Failure => ({
  _tag: 'Failure',
  lines
})

const Sequential = (all: Step[]): Sequential => ({
  _tag: 'Sequential',
  all
})

const Parallel = (all: Sequential[]): Parallel => ({
  _tag: 'Parallel',
  all
})

type TraceRenderer = (_: Trace) => string

export interface Renderer<Id, E = unknown> {
  renderId: (id: Id) => string
  renderFailure: (error: E) => string[]
  renderError: (error: Error) => string[]
  renderTrace: TraceRenderer
  renderUnknown: (error: unknown) => string[]
}

const headTail = <A>(a: NonEmptyArray<A>): [A, A[]] => {
  const x    = [...a]
  const head = x.shift() as A
  return [head, x]
}

const lines = (s: string) => s.split('\n').map((s) => s.replace('\r', '')) as string[]

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
    : []

const renderInterrupt = <Id, E>(id: Id, trace: O.Option<Trace>, renderer: Renderer<Id, E>): Sequential =>
  Sequential([
    Failure([`An interrupt was produced by ${renderer.renderId(id)}.`, '', ...renderTrace(trace, renderer.renderTrace)])
  ])

export const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error))

const renderHalt = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderFailure = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['A checked error was not handled.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderToString = (u: unknown): string => {
  if (typeof u === 'object' && u != null && 'toString' in u && typeof u['toString'] === 'function') {
    return u['toString']()
  }
  return JSON.stringify(u, null, 2)
}

const causeToSequential = <Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): Ev.Eval<Sequential> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Empty: {
        return Sequential([])
      }
      case CauseTag.Fail: {
        return cause.value instanceof Error
          ? renderFailure(renderer.renderError(cause.value), O.none(), renderer.renderTrace)
          : renderFailure(renderer.renderFailure(cause.value), O.none(), renderer.renderTrace)
      }
      case CauseTag.Halt: {
        return cause.value instanceof Error
          ? renderHalt(renderer.renderError(cause.value), O.none(), renderer.renderTrace)
          : renderHalt(renderer.renderUnknown(cause.value), O.none(), renderer.renderTrace)
      }
      case CauseTag.Interrupt: {
        return renderInterrupt(cause.id, O.none(), renderer)
      }
      case CauseTag.Then: {
        return Sequential(yield* _(linearSegments(cause, renderer)))
      }
      case CauseTag.Both: {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))])
      }
      case CauseTag.Traced: {
        switch (cause.cause._tag) {
          case CauseTag.Fail: {
            return renderFailure(renderer.renderFailure(cause.cause.value), O.some(cause.trace), renderer.renderTrace)
          }
          case CauseTag.Halt: {
            return renderHalt(renderer.renderUnknown(cause.cause.value), O.some(cause.trace), renderer.renderTrace)
          }
          case CauseTag.Interrupt: {
            return renderInterrupt(cause.cause.id, O.some(cause.trace), renderer)
          }
          default: {
            return Sequential([
              Failure([
                'An error was rethrown with a new trace.',
                ...renderTrace(O.some(cause.trace), renderer.renderTrace)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ])
          }
        }
      }
    }
  })

const linearSegments = <Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): Ev.Eval<Step[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Then: {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ]
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all
      }
    }
  })

const parallelSegments = <Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): Ev.Eval<Sequential[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Both: {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ]
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))]
      }
    }
  })

const times = (s: string, n: number) => {
  let h = ''

  for (let i = 0; i < n; i += 1) {
    h += s
  }

  return h
}

const format = (segment: Segment): readonly string[] => {
  switch (segment._tag) {
    case 'Failure': {
      return prefixBlock(segment.lines, '─', ' ')
    }
    case 'Parallel': {
      return [
        times('══╦', segment.all.length - 1) + '══╗',
        ...A.foldr_(segment.all, [] as string[], (current, acc) => [
          ...prefixBlock(acc, '  ║', '  ║'),
          ...prefixBlock(format(current), '  ', '  ')
        ])
      ]
    }
    case 'Sequential': {
      return A.chain_(segment.all, (seg) => ['║', ...prefixBlock(format(seg), '╠', '║'), '▼'])
    }
  }
}

const prettyLines = <Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): Ev.Eval<readonly string[]> =>
  Ev.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer))

    if (s.all.length === 1 && s.all[0]._tag === 'Failure') {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt(0, '╥')(format(s)), (): string[] => [])
  })

function renderTrace(o: O.Option<Trace>, renderTrace: TraceRenderer) {
  return o._tag === 'None' ? [] : lines(renderTrace(o.value))
}

export function prettySafe<Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer))
    return lines.join('\n')
  })
}

export const defaultErrorToLines = (error: unknown) =>
  error instanceof Error ? renderError(error) : lines(renderToString(error))

export function makePrettyPrint<Id, E>(renderer: Renderer<Id, E>): (cause: GenericCause<Id, E>) => string {
  return (cause) => prettySafe(cause, renderer).value
}

// export function pretty<Id, E>(cause: GenericCause<Id, E>, renderer: Renderer<Id, E>): string {
//   return prettySafe(cause, renderer).value
// }
