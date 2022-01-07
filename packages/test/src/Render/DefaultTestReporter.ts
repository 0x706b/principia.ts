import type { TestReporter } from '../api'
import type { ExecutedSpec } from '../ExecutedSpec'
import type { FailureDetails } from './FailureDetails'
import type { Fragment, Message } from './FailureMessage'
import type { TestAnnotationRenderer } from './TestAnnotationRenderer'
import type { Cause } from '@principia/base/IO/Cause'
import type { USync } from '@principia/base/Sync'

import * as C from '@principia/base/collection/immutable/Conc'
import * as V from '@principia/base/collection/immutable/Vector'
import * as E from '@principia/base/Either'
import { absurd, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
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
    const rendered = V.chain_(render(executedSpec, testAnnotationRenderer), (r) => r.rendered)
    const stats    = logStats(duration, executedSpec)
    return I.asksServiceIO(TestLoggerTag)((l) => l.logLine(pipe(rendered, V.append(stats), V.join('\n'))))
  }
}

export function logStats<E>(duration: number, executedSpec: ExecutedSpec<E>): string {
  const [success, ignore, failure] = ES.fold_<E, readonly [number, number, number]>(
    executedSpec,
    matchTag({
      Labeled: ({ spec }) => spec,
      Multiple: ({ specs }) =>
        C.foldl_(
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
): V.Vector<RenderedResult<string>> {
  const loop = (
    executedSpec: USync<ExecutedSpec<E>>,
    depth: number,
    ancestors: V.Vector<TestAnnotationMap>,
    labels: V.Vector<string>
  ): USync<V.Vector<RenderedResult<string>>> =>
    Sy.chain_(executedSpec, (executedSpec) =>
      matchTag_(executedSpec.caseValue, {
        Labeled: ({ label, spec }) => loop(Sy.succeed(spec), depth, ancestors, V.prepend_(labels, label)),
        Multiple: ({ specs }) => {
          const hasFailures = ES.exists_(
            executedSpec,
            matchTag(
              {
                Test: ({ test }) => E.isLeft(test)
              },
              () => false
            )
          )
          const annotations = ES.fold_<E, TestAnnotationMap>(
            executedSpec,
            matchTag({
              Labeled: ({ spec }) => spec,
              Multiple: ({ specs }) => C.foldl_(specs, TestAnnotationMap.empty, (b, a) => b.combine(a)),
              Test: ({ annotations }) => annotations
            })
          )
          const status: Status = hasFailures ? Failed : Passed
          const renderedLabel  = C.isEmpty(specs)
            ? V.empty()
            : hasFailures
            ? V.single(renderFailureLabel(pipe(labels, V.reverse, V.join(' - ')), depth))
            : V.single(renderSuccessLabel(pipe(labels, V.reverse, V.join(' - ')), depth))

          const renderedAnnotations = testAnnotationRenderer.run(ancestors, annotations)

          const rest = pipe(
            specs,
            Sy.foreachVector((es) =>
              loop(Sy.succeed(es), depth + tabSize, V.prepend_(ancestors, annotations), V.empty())
            ),
            Sy.map(V.flatten)
          )

          return Sy.map_(rest, (rest) =>
            V.prepend_(
              rest,
              rendered(Suite, pipe(labels, V.reverse, V.join(' - ')), status, depth, renderedLabel).withAnnotations(
                renderedAnnotations
              )
            )
          )
        },
        Test: ({ test, annotations }) => {
          const renderedAnnotations = testAnnotationRenderer.run(ancestors, annotations)
          const renderedResult      = E.match_(
            test,
            matchTag({
              AssertionFailure: ({ result }) =>
                Sy.succeed(
                  BA.fold_(
                    result,
                    (details: FailureDetails) =>
                      rendered(
                        Test,
                        pipe(labels, V.reverse, V.join(' - ')),
                        Failed,
                        depth,
                        renderFailure(pipe(labels, V.reverse, V.join(' - ')), depth, details)
                      ),
                    (_, __) => _['&&'](__),
                    (_, __) => _['||'](__),
                    (_) => _['!']()
                  )
                ),
              RuntimeFailure: ({ cause }) =>
                Sy.succeed(
                  rendered(
                    Test,
                    pipe(labels, V.reverse, V.join(' - ')),
                    Failed,
                    depth,
                    V.vector(
                      renderFailureLabel(pipe(labels, V.reverse, V.join(' - ')), depth),
                      renderCause(cause, depth)
                    )
                  )
                )
            }),
            matchTag({
              Succeeded: () =>
                Sy.succeed(
                  rendered(
                    Test,
                    pipe(labels, V.reverse, V.join(' - ')),
                    Passed,
                    depth,
                    V.single(withOffset(depth)(`${green('+')} ${pipe(labels, V.reverse, V.join(' - '))}`))
                  )
                ),
              Ignored: () =>
                Sy.succeed(rendered(Test, pipe(labels, V.reverse, V.join(' - ')), Ignored, depth, V.empty()))
            })
          )

          return Sy.map_(renderedResult, (r) => V.single(r.withAnnotations(renderedAnnotations)))
        }
      })
    )

  return Sy.run(loop(Sy.succeed(executedSpec), 0, V.empty(), V.empty()))
}

function rendered(
  caseType: CaseType,
  label: string,
  status: Status,
  offset: number,
  rendered: V.Vector<string>
): RenderedResult<string> {
  return new RenderedResult(caseType, label, status, offset, rendered)
}

function renderFailure(label: string, offset: number, details: FailureDetails): V.Vector<string> {
  return V.prepend_(renderFailureDetails(details, offset), renderFailureLabel(label, offset))
}

function renderSuccessLabel(label: string, offset: number): string {
  return withOffset(offset)(`${green('+')} ${label}`)
}

function renderFailureLabel(label: string, offset: number): string {
  return withOffset(offset)(red(`- ${label}`))
}

function renderFailureDetails(failureDetails: FailureDetails, offset: number): V.Vector<string> {
  return renderToStringLines(FM.renderFailureDetails(failureDetails, offset))
}

function renderCause(cause: Cause<any>, offset: number): string {
  return V.join_(renderToStringLines(FM.renderCause(cause, offset)), '\n')
}

function withOffset(n: number): (s: string) => string {
  return (s) => ' '.repeat(n) + s
}

function renderToStringLines(message: Message): V.Vector<string> {
  const renderFragment = (f: Fragment) => (f.colorCode !== '' ? f.colorCode + f.text + RESET : f.text)
  return V.map_(message.lines, (line) =>
    withOffset(line.offset)(V.foldl_(line.fragments, '', (str, f) => str + renderFragment(f)))
  )
}

const tabSize = 2

class RenderedResult<T> {
  constructor(
    readonly caseType: CaseType,
    readonly label: string,
    readonly status: Status,
    readonly offset: number,
    readonly rendered: V.Vector<T>
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
          V.concat_(this.rendered, V.tail(that.rendered))
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
          V.concat_(this.rendered, V.tail(that.rendered))
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

  withAnnotations(this: RenderedResult<string>, annotations: V.Vector<string>): RenderedResult<string> {
    if (V.isEmpty(this.rendered) || V.isEmpty(annotations)) {
      return this
    } else {
      const renderedAnnotations     = ` - ${V.join_(annotations, ', ')}`
      const head                    = M.match_(V.head(this.rendered), () => '', identity)
      const tail                    = V.tail(this.rendered)
      const renderedWithAnnotations = V.prepend_(tail, head + renderedAnnotations)
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
