import type { Annotated, TestAnnotation } from './Annotation'
import type { TestArgs } from './TestArgs'
import type { TestAspect } from './TestAspect'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Cause } from '@principia/base/Cause'
import type { ExecutionStrategy } from '@principia/base/ExecutionStrategy'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import { flow, identity, pipe } from '@principia/base/function'
import * as Set from '@principia/base/HashSet'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
import * as O from '@principia/base/Option'
import * as Str from '@principia/base/string'
import { matchTag, matchTag_ } from '@principia/base/util/match'

import { Annotations, tagged, TestAnnotationMap } from './Annotation'
import * as Annotation from './Annotation'
import { Ignored } from './TestSuccess'

export type XSpec<R, E> = Spec<R, TestFailure<E>, TestSuccess>

export class Spec<R, E, T> {
  constructor(readonly caseValue: SpecCase<R, E, T, Spec<R, E, T>>) {}
  ['@@']<R, E, R1, E1>(this: XSpec<R, E>, aspect: TestAspect<R1, E1>): XSpec<R & R1, E | E1> {
    return aspect.all(this)
  }
}

export class SuiteCase<R, E, A> {
  readonly _tag = 'Suite'
  constructor(
    readonly label: string,
    readonly specs: M.Managed<R, E, ReadonlyArray<A>>,
    readonly exec: Option<ExecutionStrategy>
  ) {}
}

export class TestCase<R, E, T> {
  readonly _tag = 'Test'
  constructor(readonly label: string, readonly test: I.IO<R, E, T>, readonly annotations: TestAnnotationMap) {}
}

export type SpecCase<R, E, T, A> = SuiteCase<R, E, A> | TestCase<R, E, T>

export function suite<R, E, T>(
  label: string,
  specs: M.Managed<R, E, ReadonlyArray<Spec<R, E, T>>>,
  exec: Option<ExecutionStrategy>
): Spec<R, E, T> {
  return new Spec(new SuiteCase(label, specs, exec))
}

export function test<R, E, T>(label: string, test: I.IO<R, E, T>, annotations: TestAnnotationMap): Spec<R, E, T> {
  return new Spec(new TestCase(label, test, annotations))
}

export function annotated<R, E, T>(spec: Spec<R, E, T>): Spec<R & Has<Annotations>, Annotated<E>, Annotated<T>> {
  return transform_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) =>
        new SuiteCase(
          label,
          M.mapError_(specs, (e) => [e, TestAnnotationMap.empty] as const),
          exec
        ),
      Test: ({ label, test, annotations }) => new TestCase(label, Annotations.withAnnotation(test), annotations)
    })
  )
}

export function fold_<R, E, T, Z>(spec: Spec<R, E, T>, f: (_: SpecCase<R, E, T, Z>) => Z): Z {
  return matchTag_(spec.caseValue, {
    Suite: ({ label, specs, exec }) =>
      f(
        new SuiteCase(
          label,
          M.map_(
            specs,
            A.map((spec) => fold_(spec, f))
          ),
          exec
        )
      ),
    Test: f
  })
}

export function countTests_<R, E, T>(spec: Spec<R, E, T>, f: (t: T) => boolean): M.Managed<R, E, number> {
  return fold_(
    spec,
    matchTag({
      Suite: ({ specs }) => M.chain_(specs, flow(M.foreach(identity), M.map(C.foldl(0, (b, a) => b + a)))),
      Test: ({ test }) => I.toManaged_(I.map_(test, (t) => (f(t) ? 1 : 0)))
    })
  )
}

export function filterLabels_<R, E, T>(spec: Spec<R, E, T>, f: (label: string) => boolean): Option<Spec<R, E, T>> {
  return matchTag_(spec.caseValue, {
    Suite: (s) =>
      f(s.label)
        ? O.some(suite(s.label, s.specs, s.exec))
        : O.some(
            suite(
              s.label,
              M.map_(
                s.specs,
                A.chain((spec) =>
                  O.match_(
                    filterLabels_(spec, f),
                    () => A.empty<Spec<R, E, T>>(),
                    (spec) => [spec]
                  )
                )
              ),
              s.exec
            )
          ),
    Test: (t) => (f(t.label) ? O.some(test(t.label, t.test, t.annotations)) : O.none())
  })
}

export function filterAnnotations_<R, E, T, V>(
  spec: Spec<R, E, T>,
  key: TestAnnotation<V>,
  f: (v: V) => boolean
): Option<Spec<R, E, T>> {
  return matchTag_(spec.caseValue, {
    Suite: ({ label, specs, exec }) =>
      O.some(
        suite(
          label,
          M.map_(
            specs,
            A.filterMap((s) => filterAnnotations_(s, key, f))
          ),
          exec
        )
      ),
    Test: (t) => (f(t.annotations.get(key)) ? O.some(test(t.label, t.test, t.annotations)) : O.none())
  })
}

export function filterTags_<R, E, T>(spec: Spec<R, E, T>, f: (tag: string) => boolean): Option<Spec<R, E, T>> {
  return filterAnnotations_(spec, tagged, Set.some(f))
}

export function filterByArgs_<R, E>(spec: XSpec<R, E>, args: TestArgs): XSpec<R, E> {
  const filtered = A.isEmpty(args.testSearchTerms)
    ? A.isEmpty(args.tagSearchTerms)
      ? O.none()
      : filterTags_(spec, (tag) => A.elem_(Str.Eq)(args.tagSearchTerms, tag))
    : A.isEmpty(args.tagSearchTerms)
    ? filterLabels_(spec, (label) =>
        pipe(
          args.testSearchTerms,
          A.find((term) => Str.contains_(label, term)),
          O.isSome
        )
      )
    : pipe(
        filterTags_(spec, (tag) => A.elem_(Str.Eq)(args.tagSearchTerms, tag)),
        O.chain((spec) =>
          filterLabels_(spec, (label) =>
            pipe(
              args.testSearchTerms,
              A.find((term) => Str.contains_(label, term)),
              O.isSome
            )
          )
        )
      )

  return O.getOrElse_(filtered, () => spec)
}

export function foldM_<R, E, T, R1, E1, Z>(
  spec: Spec<R, E, T>,
  f: (_: SpecCase<R, E, T, Z>) => M.Managed<R1, E1, Z>,
  defExec: ExecutionStrategy
): M.Managed<R & R1, E1, Z> {
  return matchTag_(spec.caseValue, {
    Suite: ({ label, specs, exec }) =>
      M.matchCauseManaged_(
        specs,
        (c) => f(new SuiteCase(label, M.halt(c), exec)),
        flow(
          M.foreachExec(
            O.getOrElse_(exec, () => defExec),
            (spec) => M.release(foldM_(spec, f, defExec))
          ),
          M.chain((z) => f(new SuiteCase(label, M.succeed(C.toArray(z)), exec)))
        )
      ),
    Test: f
  })
}

export function foreachExec_<R, E, T, R1, E1, A>(
  spec: Spec<R, E, T>,
  onFailure: (c: Cause<E>) => I.IO<R1, E1, A>,
  onSuccess: (t: T) => I.IO<R1, E1, A>,
  defExec: ExecutionStrategy
): M.Managed<R & R1, never, Spec<R & R1, E1, A>> {
  return foldM_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) =>
        M.matchCause_(
          specs,
          (e) => test(label, onFailure(e), TestAnnotationMap.empty),
          (t) => suite(label, M.succeed(t), exec)
        ),
      Test: (t) =>
        I.toManaged_(
          I.matchCause_(
            t.test,
            (e) => test(t.label, onFailure(e), t.annotations),
            (a) => test(t.label, onSuccess(a), t.annotations)
          )
        )
    }),
    defExec
  )
}

export function foreachExec<E, T, R1, E1, A>(
  onFailure: (c: Cause<E>) => I.IO<R1, E1, A>,
  onSuccess: (t: T) => I.IO<R1, E1, A>,
  defExec: ExecutionStrategy
): <R>(spec: Spec<R, E, T>) => M.Managed<R & R1, never, Spec<R & R1, E1, A>> {
  return (spec) => foreachExec_(spec, onFailure, onSuccess, defExec)
}

export function transform_<R, E, T, R1, E1, T1>(
  spec: Spec<R, E, T>,
  f: (_: SpecCase<R, E, T, Spec<R1, E1, T1>>) => SpecCase<R1, E1, T1, Spec<R1, E1, T1>>
): Spec<R1, E1, T1> {
  return matchTag_(spec.caseValue, {
    Suite: ({ label, specs, exec }) =>
      new Spec(
        f(
          new SuiteCase(
            label,
            M.map_(
              specs,
              A.map((spec) => transform_(spec, f))
            ),
            exec
          )
        )
      ),
    Test: (t) => new Spec(f(t))
  })
}

export function mapError_<R, E, T, E1>(spec: Spec<R, E, T>, f: (e: E) => E1): Spec<R, E1, T> {
  return transform_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) => new SuiteCase(label, M.mapError_(specs, f), exec),
      Test: ({ label, test, annotations }) => new TestCase(label, I.mapError_(test, f), annotations)
    })
  )
}

export function gives_<R, E, T, R0>(spec: Spec<R, E, T>, f: (r0: R0) => R): Spec<R0, E, T> {
  return transform_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) => new SuiteCase(label, M.gives_(specs, f), exec),
      Test: ({ label, test, annotations }) => new TestCase(label, I.gives_(test, f), annotations)
    })
  )
}

export function gives<R0, R>(f: (r0: R0) => R): <E, T>(spec: Spec<R, E, T>) => Spec<R0, E, T> {
  return (spec) => gives_(spec, f)
}

export function give_<R0, R, E, T>(spec: Spec<R & R0, E, T>, r: R): Spec<R0, E, T> {
  return gives_(spec, (r0) => ({ ...r, ...r0 }))
}

export function give<R>(r: R): <R0, E, T>(spec: Spec<R & R0, E, T>) => Spec<R0, E, T> {
  return (spec) => gives_(spec, (r0) => ({ ...r, ...r0 }))
}

export function giveAll_<R, E, T>(spec: Spec<R, E, T>, r: R): Spec<unknown, E, T> {
  return gives_(spec, () => r)
}

export function giveAll<R>(r: R): <E, T>(spec: Spec<R, E, T>) => Spec<unknown, E, T> {
  return (spec) => giveAll_(spec, r)
}

export function giveLayer<R1, E1, A1>(
  layer: L.Layer<R1, E1, A1>
): <R, E, T>(spec: Spec<R & A1, E, T>) => Spec<R & R1, E | E1, T> {
  return (spec) =>
    transform_(
      spec,
      matchTag({
        Suite: ({ label, specs, exec }) => new SuiteCase(label, M.giveLayer(layer)(specs), exec),
        Test: ({ label, test, annotations }) => new TestCase(label, I.giveLayer(layer)(test), annotations)
      })
    )
}

export function giveSomeLayer<R1, E1, A1>(
  layer: L.Layer<R1, E1, A1>
): <R, E, T>(spec: Spec<R & A1, E, T>) => Spec<R & R1, E | E1, T> {
  return <R, E, T>(spec: Spec<R & A1, E, T>) => giveLayer(layer['+++'](L.identity<R>()))(spec)
}

export function giveSomeLayerShared<R1, E1, A1>(
  layer: L.Layer<R1, E1, A1>
): <R, E, T>(spec: Spec<R & A1, E, T>) => Spec<R & R1, E | E1, T> {
  return <R, E, T>(spec: Spec<R & A1, E, T>) =>
    matchTag_(spec.caseValue, {
      Suite: ({ label, specs, exec }) =>
        suite(
          label,
          pipe(
            L.memoize(layer),
            M.chain((layer) => M.map_(specs, A.map(giveSomeLayer(layer)))),
            M.giveSomeLayer(layer)
          ),
          exec
        ),
      Test: (t) => test(t.label, I.giveSomeLayer(layer)(t.test), t.annotations)
    })
}

export function execute<R, E, T>(
  spec: Spec<R, E, T>,
  defExec: ExecutionStrategy
): M.Managed<R, never, Spec<unknown, E, T>> {
  return M.asksManaged((r: R) => pipe(spec, giveAll(r), foreachExec(I.halt, I.succeed, defExec)))
}

export function whenM_<R, E, R1, E1>(
  spec: Spec<R, E, TestSuccess>,
  b: I.IO<R1, E1, boolean>
): Spec<R & R1 & Has<Annotations>, E | E1, TestSuccess> {
  return matchTag_(spec.caseValue, {
    Suite: ({ label, specs, exec }) =>
      suite(label, M.ifManaged_(I.toManaged_(b), specs, M.succeed(A.empty<Spec<R & R1, E | E1, TestSuccess>>())), exec),
    Test: (t) =>
      test(
        t.label,
        I.ifIO_(b, t.test, I.as_(Annotations.annotate(Annotation.ignored, 1), new Ignored())),
        t.annotations
      )
  })
}

export function when_<R, E>(spec: Spec<R, E, TestSuccess>, b: boolean): Spec<R & Has<Annotations>, E, TestSuccess> {
  return whenM_(spec, I.succeed(b))
}

export function annotate_<R, E, T, V>(spec: Spec<R, E, T>, key: TestAnnotation<V>, value: V): Spec<R, E, T> {
  return transform_(
    spec,
    matchTag({
      Suite: (c) => c,
      Test: (t) => new TestCase(t.label, t.test, t.annotations.annotate(key, value))
    })
  )
}
