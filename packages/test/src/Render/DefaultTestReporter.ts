import type { TestReporter } from '../api'
import type { ExecutedSpec } from '../ExecutedSpec'
import type { FailureDetails } from './FailureDetails'
import type { Fragment, Message } from './FailureMessage'
import type { TestAnnotationRenderer } from './TestAnnotationRenderer'
import type { Cause } from '@principia/base/Cause'
import type { USync } from '@principia/base/Sync'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { absurd, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/List'
import * as O from '@principia/base/Option'
import * as Sy from '@principia/base/Sync'
import { cyan, green, red, RESET } from '@principia/base/util/AnsiFormat'
import { matchTag, matchTag_ } from '@principia/base/util/match'

import { TestAnnotationMap } from '../Annotation'
import * as ES from '../ExecutedSpec'
import * as BA from '../FreeBooleanAlgebra'
import { TestLoggerTag } from '../TestLogger'
import * as FM from './FailureMessage'

export function report<E>(testAnnotationRenderer: TestAnnotationRenderer): TestReporter<E> {
  return (duration, executedSpec) => {
    const rendered = L.chain_(render(executedSpec, testAnnotationRenderer), (r) => r.rendered)
    const stats    = logStats(duration, executedSpec)
    return I.asksServiceIO(TestLoggerTag)((l) => l.logLine(pipe(rendered, L.append(stats), L.join('\n'))))
  }
}

export function logStats<E>(duration: number, executedSpec: ExecutedSpec<E>): string {
  const [success, ignore, failure] = ES.fold_<E, readonly [number, number, number]>(
    executedSpec,
    matchTag({
      Suite: ({ specs }) =>
        A.foldl_(
          specs,
          [0, 0, 0] as readonly [number, number, number],
          ([x1, x2, x3], [y1, y2, y3]) => [x1 + y1, x2 + y2, x3 + y3] as const
        ),
      Test: ({ test }) =>
        E.match_(
          test,
          (_) => [0, 0, 1],
          matchTag({ Succeeded: () => [1, 0, 0], Ignored: () => [0, 1, 0] })
        ) as readonly [number, number, number]
    })
  )

  const total = success + ignore + failure

  return cyan(
    `Ran ${total} test${
      total === 1 ? '' : 's'
    } in ${duration}ms: ${success} succeeded, ${ignore} ignored, ${failure} failed`
  )
}

export function render<E>(
  executedSpec: ExecutedSpec<E>,
  testAnnotationRenderer: TestAnnotationRenderer
): L.List<RenderedResult<string>> {
  const loop = (
    executedSpec: USync<ExecutedSpec<E>>,
    depth: number,
    ancestors: L.List<TestAnnotationMap>
  ): USync<L.List<RenderedResult<string>>> =>
    Sy.chain_(executedSpec, (executedSpec) =>
      matchTag_(executedSpec, {
        Suite: ({ label, specs }) => {
          const hasFailures    = ES.exists_(
            executedSpec,
            matchTag({
              Test: ({ test }) => E.isLeft(test),
              Suite: () => false
            })
          )
          const annotations    = ES.fold_<E, TestAnnotationMap>(
            executedSpec,
            matchTag({
              Suite: ({ specs }) => A.foldl_(specs, TestAnnotationMap.empty, (b, a) => b.combine(a)),
              Test: ({ annotations }) => annotations
            })
          )
          const status: Status = hasFailures ? Failed : Passed
          const renderedLabel  = A.isEmpty(specs)
            ? L.empty()
            : hasFailures
            ? L.single(renderFailureLabel(label, depth))
            : L.single(renderSuccessLabel(label, depth))

          const renderedAnnotations = testAnnotationRenderer.run(ancestors, annotations)

          const rest = pipe(
            specs,
            Sy.foreachList((es) => loop(Sy.succeed(es), depth + tabSize, L.prepend_(ancestors, annotations))),
            Sy.map((rr) => L.flatten(rr))
          )

          return Sy.map_(rest, (rest) =>
            L.prepend_(rest, rendered(Suite, label, status, depth, renderedLabel).withAnnotations(renderedAnnotations))
          )
        },
        Test: ({ label, test, annotations }) => {
          const renderedAnnotations = testAnnotationRenderer.run(ancestors, annotations)
          const renderedResult      = E.match_(
            test,
            matchTag({
              AssertionFailure: ({ result }) =>
                Sy.succeed(
                  BA.fold_(
                    result,
                    (details: FailureDetails) =>
                      rendered(Test, label, Failed, depth, renderFailure(label, depth, details)),
                    (_, __) => _['&&'](__),
                    (_, __) => _['||'](__),
                    (_) => _['!']()
                  )
                ),
              RuntimeFailure: ({ cause }) =>
                Sy.succeed(
                  rendered(
                    Test,
                    label,
                    Failed,
                    depth,
                    L.list(renderFailureLabel(label, depth), renderCause(cause, depth))
                  )
                )
            }),
            matchTag({
              Succeeded: () =>
                Sy.succeed(rendered(Test, label, Passed, depth, L.single(withOffset(depth)(`${green('+')} ${label}`)))),
              Ignored: () => Sy.succeed(rendered(Test, label, Ignored, depth, L.empty()))
            })
          )

          return Sy.map_(renderedResult, (r) => L.single(r.withAnnotations(renderedAnnotations)))
        }
      })
    )

  return Sy.run(loop(Sy.succeed(executedSpec), 0, L.empty()))
}

function rendered(
  caseType: CaseType,
  label: string,
  status: Status,
  offset: number,
  rendered: L.List<string>
): RenderedResult<string> {
  return new RenderedResult(caseType, label, status, offset, rendered)
}

function renderFailure(label: string, offset: number, details: FailureDetails): L.List<string> {
  return L.prepend_(renderFailureDetails(details, offset), renderFailureLabel(label, offset))
}

function renderSuccessLabel(label: string, offset: number): string {
  return withOffset(offset)(`${green('+')} ${label}`)
}

function renderFailureLabel(label: string, offset: number): string {
  return withOffset(offset)(red(`- ${label}`))
}

function renderFailureDetails(failureDetails: FailureDetails, offset: number): L.List<string> {
  return renderToStringLines(FM.renderFailureDetails(failureDetails, offset))
}

function renderCause(cause: Cause<any>, offset: number): string {
  return L.join_(renderToStringLines(FM.renderCause(cause, offset)), '\n')
}

function withOffset(n: number): (s: string) => string {
  return (s) => ' '.repeat(n) + s
}

function renderToStringLines(message: Message): L.List<string> {
  const renderFragment = (f: Fragment) => (f.colorCode !== '' ? f.colorCode + f.text + RESET : f.text)
  return L.map_(message.lines, (line) =>
    withOffset(line.offset)(L.foldl_(line.fragments, '', (str, f) => str + renderFragment(f)))
  )
}

const tabSize = 2

class RenderedResult<T> {
  constructor(
    readonly caseType: CaseType,
    readonly label: string,
    readonly status: Status,
    readonly offset: number,
    readonly rendered: L.List<T>
  ) {}

  ['&&'](that: RenderedResult<T>): RenderedResult<T> {
    const selfTag = this.status._tag
    const thatTag = that.status._tag

    return selfTag === 'Ignored'
      ? that
      : thatTag === 'Ignored'
      ? this
      : selfTag === 'Failed' && thatTag === 'Failed'
      ? new RenderedResult(
          this.caseType,
          this.label,
          this.status,
          this.offset,
          L.concat_(this.rendered, L.tail(that.rendered))
        )
      : selfTag === 'Passed'
      ? that
      : thatTag === 'Passed'
      ? this
      : absurd(undefined as never)
  }

  ['||'](that: RenderedResult<T>): RenderedResult<T> {
    const selfTag = this.status._tag
    const thatTag = that.status._tag

    return selfTag === 'Ignored'
      ? that
      : thatTag === 'Ignored'
      ? this
      : selfTag === 'Failed' && thatTag === 'Failed'
      ? new RenderedResult(
          this.caseType,
          this.label,
          this.status,
          this.offset,
          L.concat_(this.rendered, L.tail(that.rendered))
        )
      : selfTag === 'Passed'
      ? this
      : thatTag === 'Passed'
      ? that
      : absurd(undefined as never)
  }

  ['!'](): RenderedResult<T> {
    return matchTag_(this.status, {
      Ignored: () => this,
      Failed: () => new RenderedResult(this.caseType, this.label, Passed, this.offset, this.rendered),
      Passed: () => new RenderedResult(this.caseType, this.label, Failed, this.offset, this.rendered)
    })
  }

  withAnnotations(this: RenderedResult<string>, annotations: L.List<string>): RenderedResult<string> {
    if (L.isEmpty(this.rendered) || L.isEmpty(annotations)) {
      return this
    } else {
      const renderedAnnotations     = ` - ${L.join_(annotations, ', ')}`
      const head                    = O.match_(L.head(this.rendered), () => '', identity)
      const tail                    = L.tail(this.rendered)
      const renderedWithAnnotations = L.prepend_(tail, head + renderedAnnotations)
      return new RenderedResult(this.caseType, this.label, this.status, this.offset, renderedWithAnnotations)
    }
  }
}

interface Failed {
  readonly _tag: 'Failed'
}

const Failed: Failed = {
  _tag: 'Failed'
}

interface Passed {
  readonly _tag: 'Passed'
}

const Passed: Passed = {
  _tag: 'Passed'
}

interface Ignored {
  readonly _tag: 'Ignored'
}

const Ignored: Ignored = {
  _tag: 'Ignored'
}

type Status = Failed | Passed | Ignored

interface Test {
  readonly _tag: 'Test'
}

const Test: Test = {
  _tag: 'Test'
}

interface Suite {
  readonly _tag: 'Suite'
}

const Suite: Suite = {
  _tag: 'Suite'
}

type CaseType = Test | Suite
