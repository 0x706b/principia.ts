import type { Annotated, TestAnnotation } from './Annotation'
import type { TestArgs } from './TestArgs'
import type { TestAspect } from './TestAspect'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { ExecutionStrategy } from '@principia/base/ExecutionStrategy'
import type { Has } from '@principia/base/Has'
import type { Cause } from '@principia/base/IO/Cause'
import type { Maybe } from '@principia/base/Maybe'

import * as A from '@principia/base/collection/immutable/Array'
import * as C from '@principia/base/collection/immutable/Conc'
import * as Set from '@principia/base/collection/immutable/HashSet'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as Str from '@principia/base/string'
import { tuple } from '@principia/base/tuple'
import { matchTag, matchTag_ } from '@principia/base/util/match'

import { Annotations, tagged, TestAnnotationMap } from './Annotation'
import * as Annotation from './Annotation'
import { Ignored } from './TestSuccess'

export type Spec<R, E> = PSpec<R, TestFailure<E>, TestSuccess>

export class PSpec<R, E, T> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _T!: () => T
  constructor(readonly caseValue: SpecCase<R, E, T, PSpec<R, E, T>>) {}
  ['@@']<R, E, R1, E1>(this: Spec<R, E>, aspect: TestAspect<R1, E1>): Spec<R & R1, E | E1> {
    return aspect.all(this)
  }
}

export class ExecCase<Spec> {
  readonly _tag = 'Exec'
  constructor(readonly exec: ExecutionStrategy, readonly spec: Spec) {}
}

export class LabeledCase<Spec> {
  readonly _tag = 'Labeled'
  constructor(readonly label: string, readonly spec: Spec) {}
}

export class ManagedCase<R, E, Spec> {
  readonly _tag = 'Managed'
  constructor(readonly managed: Ma.Managed<R, E, Spec>) {}
}

export class MultipleCase<Spec> {
  readonly _tag = 'Multiple'
  constructor(readonly specs: C.Conc<Spec>) {}
}

function isMultiple<R, E, T, A>(s: SpecCase<R, E, T, A>): s is MultipleCase<A> {
  return s._tag === 'Multiple'
}

export class TestCase<R, E, T> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => T
  readonly _tag = 'Test'
  constructor(readonly test: I.IO<R, E, T>, readonly annotations: TestAnnotationMap) {}
}

export type SpecCase<R, E, T, A> =
  | ExecCase<A>
  | LabeledCase<A>
  | ManagedCase<R, E, A>
  | MultipleCase<A>
  | TestCase<R, E, T>

export function exec<R, E, T>(exec: ExecutionStrategy, spec: PSpec<R, E, T>): PSpec<R, E, T> {
  return new PSpec(new ExecCase(exec, spec))
}

export function labeled<R, E, T>(label: string, spec: PSpec<R, E, T>): PSpec<R, E, T> {
  return new PSpec(new LabeledCase(label, spec))
}

export function managed<R, E, T>(managed: Ma.Managed<R, E, PSpec<R, E, T>>): PSpec<R, E, T> {
  return new PSpec(new ManagedCase(managed))
}

export function multiple<R, E, T>(specs: C.Conc<PSpec<R, E, T>>): PSpec<R, E, T> {
  return new PSpec(new MultipleCase(specs))
}

export function test<R, E, T>(test: I.IO<R, E, T>, annotations: TestAnnotationMap): PSpec<R, E, T> {
  return new PSpec(new TestCase(test, annotations))
}

export const empty: PSpec<unknown, never, never> = multiple(C.empty())

export function mapSpecCase_<R, E, T, A, B>(fa: SpecCase<R, E, T, A>, f: (a: A) => B): SpecCase<R, E, T, B> {
  return matchTag_(fa, {
    Exec: ({ exec, spec }) => new ExecCase(exec, f(spec)),
    Labeled: ({ label, spec }) => new LabeledCase(label, f(spec)),
    Managed: ({ managed }) => new ManagedCase(pipe(managed, Ma.map(f))),
    Multiple: ({ specs }) => new MultipleCase(pipe(specs, C.map(f))),
    Test: ({ test, annotations }) => new TestCase(test, annotations)
  })
}

export function mapSpecCase<A, B>(f: (a: A) => B): <R, E, T>(fa: SpecCase<R, E, T, A>) => SpecCase<R, E, T, B> {
  return (fa) => mapSpecCase_(fa, f)
}

export function annotated<R, E, T>(spec: PSpec<R, E, T>): PSpec<R & Has<Annotations>, Annotated<E>, Annotated<T>> {
  return transform_(
    spec,
    matchTag(
      {
        Managed: ({ managed }) =>
          new ManagedCase(
            pipe(
              managed,
              Ma.mapError((e) => tuple(e, TestAnnotationMap.empty))
            )
          ),
        Test: ({ test, annotations }) => new TestCase(Annotations.withAnnotation(test), annotations)
      },
      identity
    )
  )
}

export function fold_<R, E, T, Z>(spec: PSpec<R, E, T>, f: (_: SpecCase<R, E, T, Z>) => Z): Z {
  return matchTag_(spec.caseValue, {
    Exec: ({ exec, spec }) => f(new ExecCase(exec, fold_(spec, f))),
    Labeled: ({ label, spec }) => f(new LabeledCase(label, fold_(spec, f))),
    Managed: ({ managed }) =>
      f(
        new ManagedCase(
          pipe(
            managed,
            Ma.map((spec) => fold_(spec, f))
          )
        )
      ),
    Multiple: ({ specs }) =>
      f(
        new MultipleCase(
          pipe(
            specs,
            C.map((spec) => fold_(spec, f))
          )
        )
      ),
    Test: (t) => f(t)
  })
}

export function countTests_<R, E, T>(spec: PSpec<R, E, T>, f: (t: T) => boolean): Ma.Managed<R, E, number> {
  return fold_(
    spec,
    matchTag({
      Exec: ({ spec }) => spec,
      Labeled: ({ spec }) => spec,
      Managed: ({ managed }) => Ma.flatten(managed),
      // TODO: Implement Chunk sum
      Multiple: ({ specs }) => pipe(specs, Ma.sequenceIterable, Ma.map(C.foldl(0, (b, a) => b + a))),
      Test: ({ test }) =>
        pipe(
          test,
          I.map((t) => (f(t) ? 1 : 0)),
          I.toManaged()
        )
    })
  )
}

export function filterLabels_<R, E, T>(spec: PSpec<R, E, T>, f: (label: string) => boolean): Maybe<PSpec<R, E, T>> {
  return matchTag_(spec.caseValue, {
    Exec: (c) =>
      pipe(
        filterLabels_(c.spec, f),
        M.map((spec) => exec(c.exec, spec))
      ),
    Labeled: ({ label, spec }) =>
      f(label)
        ? M.just(labeled(label, spec))
        : pipe(
            filterLabels_(spec, f),
            M.map((spec) => labeled(label, spec))
          ),
    Managed: (c) =>
      pipe(
        c.managed,
        Ma.map((spec) =>
          pipe(
            filterLabels_(spec, f),
            M.getOrElse(() => empty)
          )
        ),
        managed,
        M.just
      ),
    Multiple: ({ specs }) => {
      const filtered = pipe(
        specs,
        C.filterMap((spec) => filterLabels_(spec, f))
      )
      return C.isEmpty(filtered) ? M.nothing() : M.just(multiple(filtered))
    },
    Test: () => M.nothing()
  })
}

export function filterAnnotations_<R, E, T, V>(
  spec: PSpec<R, E, T>,
  key: TestAnnotation<V>,
  f: (v: V) => boolean
): Maybe<PSpec<R, E, T>> {
  return matchTag_(spec.caseValue, {
    Exec: (s) =>
      pipe(
        filterAnnotations_(s.spec, key, f),
        M.map((spec) => exec(s.exec, spec))
      ),
    Labeled: ({ label, spec }) =>
      pipe(
        filterAnnotations_(spec, key, f),
        M.map((spec) => labeled(label, spec))
      ),
    Managed: (c) =>
      M.just(
        managed(
          pipe(
            c.managed,
            Ma.map((spec) =>
              pipe(
                filterAnnotations_(spec, key, f),
                M.getOrElse(() => empty)
              )
            )
          )
        )
      ),
    Multiple: ({ specs }) => {
      const filtered = pipe(
        specs,
        C.filterMap((spec) => filterAnnotations_(spec, key, f))
      )
      return C.isEmpty(filtered) ? M.nothing() : M.just(multiple(filtered))
    },
    Test: (c) => (f(c.annotations.get(key)) ? M.just(test(c.test, c.annotations)) : M.nothing())
  })
}

export function filterTags_<R, E, T>(spec: PSpec<R, E, T>, f: (tag: string) => boolean): Maybe<PSpec<R, E, T>> {
  return filterAnnotations_(spec, tagged, Set.some(f))
}

export function filterByArgs_<R, E>(spec: Spec<R, E>, args: TestArgs): Spec<R, E> {
  const filtered = A.isEmpty(args.testSearchTerms)
    ? A.isEmpty(args.tagSearchTerms)
      ? M.nothing()
      : filterTags_(spec, (tag) => A.elem_(Str.Eq)(args.tagSearchTerms, tag))
    : A.isEmpty(args.tagSearchTerms)
    ? filterLabels_(spec, (label) =>
        pipe(
          args.testSearchTerms,
          A.find((term) => Str.contains_(label, term)),
          M.isJust
        )
      )
    : pipe(
        filterTags_(spec, (tag) => A.elem_(Str.Eq)(args.tagSearchTerms, tag)),
        M.chain((spec) =>
          filterLabels_(spec, (label) =>
            pipe(
              args.testSearchTerms,
              A.find((term) => Str.contains_(label, term)),
              M.isNothing
            )
          )
        )
      )

  return M.getOrElse_(filtered, () => spec)
}

export function foldM_<R, E, T, R1, E1, Z>(
  spec: PSpec<R, E, T>,
  f: (_: SpecCase<R, E, T, Z>) => Ma.Managed<R1, E1, Z>,
  defExec: ExecutionStrategy
): Ma.Managed<R & R1, E1, Z> {
  return matchTag_(spec.caseValue, {
    Exec: ({ exec, spec }) =>
      pipe(
        spec,
        foldM(f, exec),
        Ma.chain((z) => f(new ExecCase(exec, z)))
      ),
    Labeled: ({ label, spec }) =>
      pipe(
        spec,
        foldM(f, defExec),
        Ma.chain((z) => f(new LabeledCase(label, z)))
      ),
    Managed: ({ managed }) =>
      pipe(
        managed,
        Ma.matchCauseManaged(
          (c) => f(new ManagedCase(Ma.halt(c))),
          (spec) =>
            pipe(
              spec,
              foldM(f, defExec),
              Ma.chain((z) => f(new ManagedCase(Ma.succeed(z))))
            )
        )
      ),
    Multiple: ({ specs }) =>
      pipe(
        specs,
        Ma.foreachExec(defExec, flow(foldM(f, defExec), Ma.release)),
        Ma.chain((zs) => f(new MultipleCase(zs)))
      ),
    Test: f
  })
}

export function foldM<R, E, T, R1, E1, Z>(
  f: (_: SpecCase<R, E, T, Z>) => Ma.Managed<R1, E1, Z>,
  defExec: ExecutionStrategy
): (spec: PSpec<R, E, T>) => Ma.Managed<R & R1, E1, Z> {
  return (spec) => foldM_(spec, f, defExec)
}

export function foreachExec_<R, E, T, R1, E1, A>(
  spec: PSpec<R, E, T>,
  onFailure: (c: Cause<E>) => I.IO<R1, E1, A>,
  onSuccess: (t: T) => I.IO<R1, E1, A>,
  defExec: ExecutionStrategy
): Ma.Managed<R & R1, never, PSpec<R & R1, E1, A>> {
  return foldM_(
    spec,
    matchTag({
      Exec: (c) => Ma.succeed(exec(c.exec, c.spec)),
      Labeled: ({ label, spec }) => Ma.succeed(labeled(label, spec)),
      Managed: (c) =>
        pipe(
          c.managed,
          Ma.matchCause(
            (c) => test(onFailure(c), TestAnnotationMap.empty),
            (t) => managed(Ma.succeed(t))
          )
        ),
      Multiple: ({ specs }) => Ma.succeed(multiple(specs)),
      Test: (c) =>
        pipe(
          c.test,
          I.matchCause(
            (e) => test(onFailure(e), c.annotations),
            (t) => test(onSuccess(t), c.annotations)
          ),
          I.toManaged()
        )
    }),
    defExec
  )
}

export function foreachExec<E, T, R1, E1, A>(
  onFailure: (c: Cause<E>) => I.IO<R1, E1, A>,
  onSuccess: (t: T) => I.IO<R1, E1, A>,
  defExec: ExecutionStrategy
): <R>(spec: PSpec<R, E, T>) => Ma.Managed<R & R1, never, PSpec<R & R1, E1, A>> {
  return (spec) => foreachExec_(spec, onFailure, onSuccess, defExec)
}

export function transform_<R, E, T, R1, E1, T1>(
  spec: PSpec<R, E, T>,
  f: (_: SpecCase<R, E, T, PSpec<R1, E1, T1>>) => SpecCase<R1, E1, T1, PSpec<R1, E1, T1>>
): PSpec<R1, E1, T1> {
  return matchTag_(spec.caseValue, {
    Exec: ({ exec, spec }) => new PSpec(f(new ExecCase(exec, transform_(spec, f)))),
    Labeled: ({ label, spec }) => new PSpec(f(new LabeledCase(label, transform_(spec, f)))),
    Managed: ({ managed }) => new PSpec(f(new ManagedCase(pipe(managed, Ma.map(transform(f)))))),
    Multiple: ({ specs }) => new PSpec(f(new MultipleCase(pipe(specs, C.map(transform(f)))))),
    Test: (t) => new PSpec(f(t))
  })
}

export function transform<R, E, T, R1, E1, T1>(
  f: (_: SpecCase<R, E, T, PSpec<R1, E1, T1>>) => SpecCase<R1, E1, T1, PSpec<R1, E1, T1>>
): (spec: PSpec<R, E, T>) => PSpec<R1, E1, T1> {
  return (spec) => transform_(spec, f)
}

export function mapError_<R, E, T, E1>(spec: PSpec<R, E, T>, f: (e: E) => E1): PSpec<R, E1, T> {
  return transform_(
    spec,
    matchTag(
      {
        Managed: ({ managed }) => new ManagedCase(pipe(managed, Ma.mapError(f))),
        Test: ({ test, annotations }) => new TestCase(pipe(test, I.mapError(f)), annotations)
      },
      identity
    )
  )
}

export function gives_<R, E, T, R0>(spec: PSpec<R, E, T>, f: (r0: R0) => R): PSpec<R0, E, T> {
  return transform_(
    spec,
    matchTag(
      {
        Managed: ({ managed }) => new ManagedCase(pipe(managed, Ma.gives(f))),
        Test: ({ test, annotations }) => new TestCase(pipe(test, I.gives(f)), annotations)
      },
      identity
    )
  )
}

export function gives<R0, R>(f: (r0: R0) => R): <E, T>(spec: PSpec<R, E, T>) => PSpec<R0, E, T> {
  return (spec) => gives_(spec, f)
}

export function giveSome_<R0, R, E, T>(spec: PSpec<R & R0, E, T>, r: R): PSpec<R0, E, T> {
  return gives_(spec, (r0) => ({ ...r, ...r0 }))
}

export function giveSome<R>(r: R): <R0, E, T>(spec: PSpec<R & R0, E, T>) => PSpec<R0, E, T> {
  return (spec) => gives_(spec, (r0) => ({ ...r, ...r0 }))
}

export function give_<R, E, T>(spec: PSpec<R, E, T>, r: R): PSpec<unknown, E, T> {
  return gives_(spec, () => r)
}

export function give<R>(r: R): <E, T>(spec: PSpec<R, E, T>) => PSpec<unknown, E, T> {
  return (spec) => give_(spec, r)
}

export function giveLayer<R, R1, E1>(layer: L.Layer<R1, E1, R>): <E, T>(spec: PSpec<R, E, T>) => PSpec<R1, E | E1, T> {
  return (spec) =>
    transform_(
      spec,
      matchTag(
        {
          Managed: ({ managed }) => new ManagedCase(pipe(managed, Ma.giveLayer(layer))),
          Test: ({ test, annotations }) => new TestCase(pipe(test, I.giveLayer(layer)), annotations)
        },
        identity
      )
    )
}

export function giveSomeLayer<R1, E1, A1>(
  layer: L.Layer<R1, E1, A1>
): <R, E, T>(spec: PSpec<R & A1, E, T>) => PSpec<R & R1, E | E1, T> {
  return <R, E, T>(spec: PSpec<R & A1, E, T>) => giveLayer(layer['+++'](L.identity<R>()))(spec)
}

export function giveSomeLayerShared<R1, E1, A1>(
  layer: L.Layer<R1, E1, A1>
): <R, E, T>(spec: PSpec<R & A1, E, T>) => PSpec<R & R1, E | E1, T> {
  return <R, E, T>(spec: PSpec<R & A1, E, T>) =>
    matchTag_(spec.caseValue, {
      Exec: (c) => exec(c.exec, pipe(c.spec, giveSomeLayerShared(layer))),
      Labeled: ({ label, spec }) => labeled(label, pipe(spec, giveSomeLayerShared(layer))),
      Managed: (c) =>
        managed(
          pipe(
            L.memoize(layer),
            Ma.chain((layer) => pipe(c.managed, Ma.map(giveSomeLayer(layer)))),
            Ma.giveSomeLayer(layer)
          )
        ),
      Multiple: ({ specs }) =>
        managed(
          pipe(
            L.memoize(layer),
            Ma.map((layer) => multiple(pipe(specs, C.map(giveSomeLayer(layer)))))
          )
        ),
      Test: (c) => test(pipe(c.test, I.giveSomeLayer(layer)), c.annotations)
    })
}

export function execute<R, E, T>(
  spec: PSpec<R, E, T>,
  defExec: ExecutionStrategy
): Ma.Managed<R, never, PSpec<unknown, E, T>> {
  return Ma.asksManaged((r: R) => pipe(spec, give(r), foreachExec(I.failCause, I.succeed, defExec)))
}

export function whenM_<R, E, R1, E1>(
  spec: PSpec<R, E, TestSuccess>,
  b: I.IO<R1, E1, boolean>
): PSpec<R & R1 & Has<Annotations>, E | E1, TestSuccess> {
  return matchTag_(spec.caseValue, {
    Exec: (c) => exec(c.exec, pipe(c.spec, whenM(b))),
    Labeled: ({ label, spec }) => labeled(label, pipe(spec, whenM(b))),
    Managed: (c) =>
      managed(
        pipe(
          Ma.fromIO(b),
          Ma.chain((b) => (b ? c.managed : Ma.succeed(empty)))
        )
      ),
    Multiple: ({ specs }) => multiple(pipe(specs, C.map(whenM(b)))),
    Test: (c) =>
      test(
        pipe(b, I.chain(I.if(c.test, pipe(Annotations.annotate(Annotation.ignored, 1), I.as(new Ignored()))))),
        c.annotations
      )
  })
}

export function whenM<R, E, R1, E1>(
  b: I.IO<R1, E1, boolean>
): (spec: PSpec<R, E, TestSuccess>) => PSpec<R & R1 & Has<Annotations>, E | E1, TestSuccess> {
  return (spec) => whenM_(spec, b)
}

export function when_<R, E>(spec: PSpec<R, E, TestSuccess>, b: boolean): PSpec<R & Has<Annotations>, E, TestSuccess> {
  return whenM_(spec, I.succeed(b))
}

export function annotate_<R, E, T, V>(spec: PSpec<R, E, T>, key: TestAnnotation<V>, value: V): PSpec<R, E, T> {
  return transform_(
    spec,
    matchTag(
      {
        Test: ({ test, annotations }) => new TestCase(test, annotations.annotate(key, value))
      },
      identity
    )
  )
}

export function combine_<R, E, A, R1, E1, B>(sa: PSpec<R, E, A>, sb: PSpec<R1, E1, B>): PSpec<R & R1, E | E1, A | B> {
  if (isMultiple(sa.caseValue) && isMultiple(sb.caseValue)) {
    return multiple(C.concat_(sa.caseValue.specs as C.Conc<PSpec<R & R1, E | E1, A | B>>, sb.caseValue.specs))
  }
  if (isMultiple(sa.caseValue)) {
    return multiple(C.append_<PSpec<R & R1, E | E1, A | B>, PSpec<R & R1, E | E1, A | B>>(sa.caseValue.specs, sb))
  }
  if (isMultiple(sb.caseValue)) {
    return multiple(C.prepend_<PSpec<R & R1, E | E1, A | B>>(sb.caseValue.specs, sa))
  }
  return multiple(C.make<PSpec<R & R1, E | E1, A | B>>(sa, sb))
}

export function combine<R1, E1, B>(
  sb: PSpec<R1, E1, B>
): <R, E, A>(sa: PSpec<R, E, A>) => PSpec<R & R1, E | E1, A | B> {
  return (sa) => combine_(sa, sb)
}
