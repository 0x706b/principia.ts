import type * as H from '../Has'
import type { Cause } from '../IO/Cause'
import type { Exit } from '../IO/Exit'
import type { IOEnv } from '../IOEnv'
import type { Managed } from '../Managed/core'
import type { Finalizer } from '../Managed/ReleaseMap'
import type { Erase, UnionToIntersection } from '../util/types'

import * as Ch from '../Chunk/core'
import * as E from '../Either'
import { sequential } from '../ExecutionStrategy'
import * as FR from '../FiberRef/core'
import { pipe } from '../function'
import * as F from '../Future'
import { mergeEnvironments, tag } from '../Has'
import * as HM from '../HashMap'
import { AtomicReference } from '../internal/AtomicReference'
import * as Ca from '../IO/Cause'
import * as Ex from '../IO/Exit'
import * as RM from '../Managed/ReleaseMap'
import * as M from '../Maybe'
import * as Ref from '../Ref'
import * as RefM from '../SRef'
import { tuple } from '../tuple/core'
import * as I from './internal/io'
import * as Ma from './internal/managed'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export abstract class Layer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol())

  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor() {
    this.use = this.use.bind(this)
  }

  setKey(hash: PropertyKey) {
    this.hash.set(hash)
    return this
  }

  /**
   * Symbolic alias for `compose`
   */
  ['>=>']<E1, A1>(that: Layer<A, E1, A1>): Layer<R, E | E1, A1> {
    return compose_(this, that)
  }

  /**
   * Symbolic alias for `compose`, in reverse
   */
  ['<=<']<R1, E1>(that: Layer<R1, E1, R>): Layer<R1, E | E1, A> {
    return that['>=>'](this)
  }

  /**
   * Feeds the output services of the specified layer into the input of this layer
   * layer, resulting in a new layer with the inputs of the specified layer, and the
   * outputs of this layer.
   */
  ['<<<']<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A> {
    return from['>>>'](this)
  }

  /**
   * Feeds the output services of this layer into the input of the specified
   * layer, resulting in a new layer with the inputs of this layer, and the
   * outputs of the specified layer.
   */
  ['>>>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A1>
  ['>>>']<R1, E1, A1>(to: Layer<R1 & A, E1, A1>): Layer<R1 & R, E | E1, A1> {
    return this['+++'](identity<R1>())['>=>'](to)
  }

  /**
   * Feeds the output services of this layer into the input of the specified
   * layer, resulting in a new layer with the inputs of this layer, and the
   * outputs of both this layer and the specified layer.
   */
  ['>+>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<R & Erase<A & R1, A>, E | E1, A & A1> {
    return this['>>>'](to['+++'](identity<A>()))
  }

  ['<+<']<R1, E1, A1>(that: Layer<R1, E1, A1>): Layer<Erase<R & A1, A1> & R1, E | E1, A & A1> {
    return that['>+>'](this)
  }

  /**
   * Combines this layer with the specified layer, producing a new layer that
   * has the inputs of both layers, and the outputs of both layers.
   */
  ['+++']<R1, E1, A1>(that: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A & A1> {
    return andC_(that, this)
  }

  use<R1, E1, A1>(io: I.IO<R1 & A, E1, A1>): I.IO<R & R1, E | E1, A1> {
    return Ma.use_(build(this['+++'](identity<R1>())), (a) => I.give_(io, a))
  }
}

export type ULayer<A> = Layer<unknown, never, A>
export type URLayer<R, A> = Layer<R, never, A>
export type FLayer<E, A> = Layer<unknown, E, A>

/**
 * @optimize remove
 */
function concrete(_: Layer<any, any, any>): asserts _ is LayerInstruction {
  //
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instructions
 * -------------------------------------------------------------------------------------------------
 */

export const LayerTag = {
  Fold: 'Fold',
  Flatten: 'Flatten',
  Map: 'Map',
  Chain: 'Chain',
  Fresh: 'Fresh',
  FromManaged: 'FromManaged',
  Defer: 'Defer',
  CrossWithPar: 'CrossWithPar',
  AllPar: 'AllPar',
  AllSeq: 'AllSeq',
  CrossWithSeq: 'CrossWithSeq'
} as const

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<IOEnv, E, A>) {
  return layer
}

export type LayerInstruction =
  | Fold<any, any, any, any, any, any, any, any>
  | Map<any, any, any, any>
  | Chain<any, any, any, any, any, any>
  | Fresh<any, any, any>
  | FromManaged<any, any, any>
  | Defer<any, any, any>
  | CrossWithConcurrent<any, any, any, any, any, any, any>
  | CrossWithSequential<any, any, any, any, any, any, any>
  | AllConcurrent<Layer<any, any, any>[]>
  | AllSequential<Layer<any, any, any>[]>

export class Fold<R, E, A, R1, E1, A1, E2, A2> extends Layer<R & R1, E1 | E2, A1 | A2> {
  readonly _tag = LayerTag.Fold

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly onFailure: Layer<readonly [R1, Cause<E>], E1, A1>,
    readonly onSuccess: Layer<A, E2, A2>
  ) {
    super()
  }
}

export class Map<R, E, A, B> extends Layer<R, E, B> {
  readonly _tag = LayerTag.Map

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
    super()
  }
}

export class Chain<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
  readonly _tag = LayerTag.Chain

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => Layer<R1, E1, B>) {
    super()
  }
}

export class Fresh<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.Fresh

  constructor(readonly layer: Layer<R, E, A>) {
    super()
  }
}

export class FromManaged<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.FromManaged

  constructor(readonly managed: Managed<R, E, A>) {
    super()
  }
}

export class Defer<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.Defer

  constructor(readonly factory: () => Layer<R, E, A>) {
    super()
  }
}

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>] ? (unknown extends X ? never : X) : never
  }[number]
>

export type MergeE<Ls extends Layer<any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>] ? (unknown extends X ? never : X) : never
  }[number]
>

export class CrossWithConcurrent<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.CrossWithPar

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllConcurrent<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllPar

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class CrossWithSequential<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.CrossWithSeq

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllSequential<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllSeq

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

function scope<R, E, A>(l: Layer<R, E, A>): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  concrete(l)

  switch (l._tag) {
    case LayerTag.Fresh: {
      return Ma.succeed(() => build(l.layer))
    }
    case LayerTag.FromManaged: {
      return Ma.succeed(() => l.managed)
    }
    case LayerTag.Defer: {
      return Ma.succeed((memo) => memo.getOrElseMemoize(l.factory()))
    }
    case LayerTag.Map: {
      return Ma.succeed((memo) => Ma.map_(memo.getOrElseMemoize(l.layer), l.f))
    }
    case LayerTag.Chain: {
      return Ma.succeed((memo) => Ma.chain_(memo.getOrElseMemoize(l.layer), (a) => memo.getOrElseMemoize(l.f(a))))
    }
    case LayerTag.CrossWithPar: {
      return Ma.succeed((memo) => Ma.crossWithC_(memo.getOrElseMemoize(l.layer), memo.getOrElseMemoize(l.that), l.f))
    }
    case LayerTag.CrossWithSeq: {
      return Ma.succeed((memo) => Ma.crossWith_(memo.getOrElseMemoize(l.layer), memo.getOrElseMemoize(l.that), l.f))
    }
    case LayerTag.AllPar: {
      return Ma.succeed((memo) => {
        return pipe(
          Ma.foreachC_(l.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          Ma.map(Ch.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.AllSeq: {
      return Ma.succeed((memo) => {
        return pipe(
          Ma.foreach_(l.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          Ma.map(Ch.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.Fold: {
      return Ma.succeed((memo) =>
        Ma.matchCauseManaged_(
          memo.getOrElseMemoize(l.layer),
          (e) =>
            pipe(
              I.toManaged()(I.ask<any>()),
              Ma.chain((r) => Ma.gives_(memo.getOrElseMemoize(l.onFailure), () => tuple(r, e)))
            ),
          (r) => Ma.give_(memo.getOrElseMemoize(l.onSuccess), r)
        )
      )
    }
  }
}

function isFresh<R, E, A>(layer: Layer<R, E, A>): boolean {
  concrete(layer)
  return layer._tag === LayerTag.Fresh
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Builds a layer into a managed value.
 */
export function build<R, E, A>(layer: Layer<R, E, A>): Ma.Managed<R, E, A> {
  return Ma.gen(function* (_) {
    const memoMap = yield* _(Ma.fromIO(makeMemoMap()))
    const run     = yield* _(scope(layer))
    const value   = yield* _(run(memoMap))
    return value
  })
}

/**
 * Constructs a layer from the specified value.
 */
export function succeed<A>(tag: H.Tag<A>): (a: A) => Layer<unknown, never, H.Has<A>> {
  return (resource) => fromManaged(tag)(Ma.succeed(resource))
}

export function fail<E>(e: E): Layer<unknown, E, never> {
  return fromRawManaged(Ma.fail(e))
}

export function identity<R>(): Layer<R, never, R> {
  return fromRawManaged(Ma.ask<R>())
}

export function prepare<T>(tag: H.Tag<T>) {
  return <R, E, A extends T>(acquire: I.IO<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => I.IO<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
        fromManaged(tag)(
          Ma.chain_(
            Ma.bracketExit_(acquire, (a) => release(a)),
            (a) => Ma.fromIO(I.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
      fromManaged(tag)(Ma.bracketExit_(acquire, (a) => release(a)))
  })
}

/**
 * Constructs a layer from the specified effect.
 */
export function fromIO_<R, E, T>(resource: I.IO<R, E, T>, tag: H.Tag<T>): Layer<R, E, H.Has<T>> {
  return fromManaged(tag)(Ma.fromIO(resource))
}

/**
 * Constructs a layer from the specified effect.
 *
 * @dataFirst fromIO_
 */
export function fromIO<T>(tag: H.Tag<T>): <R, E>(resource: I.IO<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => fromIO_(resource, tag)
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(tag: H.Tag<T>): <R, E>(resource: Managed<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => new FromManaged(Ma.chain_(resource, (a) => environmentFor(tag, a))).setKey(tag.key)
}

export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new FromManaged(resource)
}

export function fromRawIO<R, E, A>(resource: I.IO<R, E, A>): Layer<R, E, A> {
  return new FromManaged(Ma.fromIO(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawIO(I.asks(f))
}

export function fromRawFunctionIO<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): Layer<R & A, E, B> {
  return fromRawIO(I.asksIO(f))
}

export function fromRawFunctionManaged<R0, R, E, A>(f: (r0: R0) => Managed<R, E, A>): Layer<R0 & R, E, A> {
  return fromRawManaged(Ma.asksManaged(f))
}

export function fromFunctionManaged<T>(
  tag: H.Tag<T>
): <A, R, E>(f: (a: A) => Managed<R, E, T>) => Layer<R & A, E, H.Has<T>> {
  return (f) => fromManaged(tag)(Ma.asksManaged(f))
}

export function fromFunctionIO<T>(tag: H.Tag<T>) {
  return <A, R, E>(f: (a: A) => I.IO<R, E, T>): Layer<R & A, E, H.Has<T>> =>
    fromFunctionManaged(tag)((a: A) => I.toManaged_(f(a)))
}

export function fromConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[]>(
  constructor: (...services: Services) => S
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]>,
  never,
  H.Has<S>
> {
  return (constructor) =>
    (...tags) =>
      fromIO(tag)(I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any
}

export function fromConstructorIO<S>(
  tag: H.Tag<S>
): <Services extends any[], R, E>(
  constructor: (...services: Services) => I.IO<R, E, S>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R,
  E,
  H.Has<S>
> {
  return (constructor) =>
    (...tags) =>
      fromIO(tag)(I.asksServicesTIO(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any
}

export function fromConstructorManaged<S>(
  tag: H.Tag<S>
): <Services extends any[], R, E>(
  constructor: (...services: Services) => Ma.Managed<R, E, S>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R,
  E,
  H.Has<S>
> {
  return (constructor) =>
    (...tags) =>
      fromManaged(tag)(
        Ma.chain_(
          Ma.fromIO(
            I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as I.IO<any, any, any>
          ),
          (_) => _
        )
      )
}

export function bracket_<A>(
  tag: H.Tag<A>
): <R, E, R1>(acquire: I.IO<R, E, A>, release: (a: A) => I.URIO<R1, any>) => Layer<R & R1, E, H.Has<A>> {
  return (acquire, release) => fromManaged(tag)(Ma.bracket_(acquire, release))
}

export function bracket<A>(
  tag: H.Tag<A>
): <R1>(release: (a: A) => I.URIO<R1, any>) => <R, E>(acquire: I.IO<R, E, A>) => Layer<R & R1, E, H.Has<A>> {
  return (release) => (acquire) => bracket_(tag)(acquire, release)
}

export function bracketConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[], S2 extends S>(
  constructor: (...services: Services) => S2
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => I.IO<R, E, unknown>,
  release: (s: S2) => I.IO<R2, never, unknown>
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R & R2,
  E,
  H.Has<S>
> {
  return (constructor) =>
    (...tags) =>
    (open, release) =>
      prepare(tag)(I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any)
        .open(open as any)
        .release(release as any) as any
}

export function bracketConstructorIO<S>(
  tag: H.Tag<S>
): <Services extends any[], S2 extends S, R0, E0>(
  constructor: (...services: Services) => I.IO<R0, E0, S2>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => I.IO<R, E, unknown>,
  release: (s: S2) => I.IO<R2, never, unknown>
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R & R2 & R0,
  E0 | E,
  H.Has<S>
> {
  return (constructor) =>
    (...tags) =>
    (open, release) =>
      prepare(tag)(I.asksServicesTIO(...tags)((...services: any[]) => constructor(...(services as any))) as any)
        .open(open as any)
        .release(release as any) as any
}

export function restrict<Tags extends H.Tag<any>[]>(
  ...ts: Tags
): <R, E>(
  layer: Layer<
    R,
    E,
    UnionToIntersection<{ [k in keyof Tags]: [Tags[k]] extends [H.Tag<infer A>] ? H.Has<A> : never }[number]>
  >
) => Layer<
  R,
  E,
  UnionToIntersection<{ [k in keyof Tags]: [Tags[k]] extends [H.Tag<infer A>] ? H.Has<A> : never }[number]>
> {
  return (layer) =>
    compose_(
      layer,
      fromRawIO(
        I.asksServicesT(...ts)((...services) =>
          services.map((s, i) => ({ [ts[i].key]: s } as any)).reduce((x, y) => ({ ...x, ...y }))
        )
      )
    ) as any
}

export function defer<R, E, A>(la: () => Layer<R, E, A>): Layer<R, E, A> {
  return new Defer(la)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): Layer<R & R1, E | E1, C> {
  return new CrossWithSequential(fa, fb, f)
}

export function crossWith<A, R1, E1, B, C>(
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Layer<R, E, A>) => Layer<R & R1, E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<R, E, A, R1, E1, B>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>
): Layer<R & R1, E | E1, readonly [A, B]> {
  return new CrossWithSequential(fa, fb, tuple)
}

export function cross<R1, E1, B>(
  right: Layer<R1, E1, B>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E | E1, readonly [A, B]> {
  return (left) => cross_(left, right)
}

export function ap_<R, E, A, R1, E1, B>(fab: Layer<R, E, (a: A) => B>, fa: Layer<R1, E1, A>): Layer<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<R1, E1, A>(
  fa: Layer<R1, E1, A>
): <R, E, B>(fab: Layer<R, E, (a: A) => B>) => Layer<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply Par
 * -------------------------------------------------------------------------------------------------
 */

export function crossWithC_<R, E, A, R1, E1, B, C>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): Layer<R & R1, E | E1, C> {
  return new CrossWithConcurrent(fa, fb, f)
}

export function crossWithC<A, R1, E1, B, C>(
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Layer<R, E, A>) => Layer<R & R1, E | E1, C> {
  return (fa) => crossWithC_(fa, fb, f)
}

export function crossC_<R, E, A, R1, E1, B>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>
): Layer<R & R1, E | E1, readonly [A, B]> {
  return crossWithC_(fa, fb, tuple)
}

export function crossC<R1, E1, B>(
  right: Layer<R1, E1, B>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E | E1, readonly [A, B]> {
  return (left) => cross_(left, right)
}

export function apC_<R, E, A, R1, E1, B>(
  fab: Layer<R, E, (a: A) => B>,
  fa: Layer<R1, E1, A>
): Layer<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function apC<R1, E1, A>(
  fa: Layer<R1, E1, A>
): <R, E, B>(fab: Layer<R, E, (a: A) => B>) => Layer<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, E, A, E1>(la: Layer<R, E, A>, f: (e: E) => E1): Layer<R, E1, A> {
  return catchAll_(
    la,
    fromRawFunctionIO(([_, e]: readonly [unknown, E]) => I.fail(f(e)))
  )
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(la: Layer<R, E, A>) => Layer<R, E1, A> {
  return (la) => mapError_(la, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export function map_<R, E, A, B>(fa: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return new Map(fa, f)
}

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Layer<R, E, A>) => Layer<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, E, A, R1, E1, B>(
  ma: Layer<R, E, A>,
  f: (a: A) => Layer<R1, E1, B>
): Layer<R & R1, E | E1, B> {
  return new Chain(ma, f)
}

export function chain<A, R1, E1, B>(
  f: (a: A) => Layer<R1, E1, B>
): <R, E>(ma: Layer<R, E, A>) => Layer<R & R1, E1 | E, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Layer<R, E, Layer<R1, E1, A>>): Layer<R & R1, E | E1, A> {
  return chain_(mma, (_) => _)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllSequential(ls)
}

export function allC<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllConcurrent(ls)
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andC_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new CrossWithConcurrent(left, right, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andC<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (left) => andC_(left, right)
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and_<R, E, A, R1, E1, A1>(
  layer: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> {
  return new CrossWithSequential(layer, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (layer) => and_(layer, that)
}

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, H.Has<T>> {
  return Ma.fromIO(
    I.asks(
      (r) =>
        ({
          [has.key]: mergeEnvironments(has, r, a)[has.key]
        } as H.Has<T>)
    )
  )
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  la: Layer<R, E, A>,
  handler: Layer<readonly [R1, E], E1, B>
): Layer<R & R1, E1, A | B> {
  const failureOrHalt: Layer<readonly [R1, Cause<E>], never, readonly [R1, E]> = fromRawFunctionIO(
    ([r, cause]: readonly [R1, Cause<E>]) =>
      pipe(
        cause,
        Ca.failureOrCause,
        E.match(
          (e) => I.succeed(tuple(r, e)),
          (c) => I.failCause(c)
        )
      )
  )
  return matchLayer_(la, failureOrHalt['>>>'](handler), identity())
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R1, E1, B>(
  handler: Layer<readonly [R1, E], E1, B>
): <R, A>(la: Layer<R, E, A>) => Layer<R & R1, E1, A | B> {
  return (la) => catchAll_(la, handler)
}

/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 */
export function launch<E, A>(la: Layer<unknown, E, A>): I.FIO<E, never> {
  return pipe(la, build, Ma.useForever)
}

export function first<A>(): Layer<readonly [A, unknown], never, A> {
  return fromRawFunction(([a, _]: readonly [A, unknown]) => a)
}

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return new Fresh(layer)
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 */
export function matchLayer_<R, E, A, R1, E1, B, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
  onSuccess: Layer<A, E2, C>
): Layer<R & R1, E1 | E2, B | C> {
  return new Fold<R, E, A, R1, E1, B, E2, C>(layer, onFailure, onSuccess)
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 */
export function matchLayer<E, A, R1, E1, B, E2, C>(
  onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
  onSuccess: Layer<A, E2, C>
): <R>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E2, B | C> {
  return (layer) => matchLayer_(layer, onFailure, onSuccess)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function compose_<R, E, A, E1, A1>(from: Layer<R, E, A>, to: Layer<A, E1, A1>): Layer<R, E | E1, A1> {
  return matchLayer_(
    from,
    fromRawFunctionIO((_: readonly [unknown, Cause<E>]) => I.failCause(_[1])),
    to
  )
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 *
 * @dataFirst compose_
 */
export function compose<A, E1, A1>(to: Layer<A, E1, A1>): <R, E>(from: Layer<R, E, A>) => Layer<R, E | E1, A1> {
  return (from) => compose_(from, to)
}

/**
 * Returns a managed effect that, if evaluated, will return the lazily
 * computed result of this layer.
 */
export function memoize<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, Layer<R, E, A>> {
  return Ma.map_(Ma.once(build(layer)), (_) => fromRawManaged(_))
}

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orHalt<R, E extends Error, A>(la: Layer<R, E, A>): Layer<R, never, A> {
  return catchAll_(la, second<E>()['>=>'](fromRawFunctionIO((e: E) => I.halt(e))))
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse_<R, E, A, R1, E1, A1>(
  la: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A | A1> {
  return catchAll_(la, first<R1>()['>=>'](that))
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(la: Layer<R, E, A>) => Layer<R & R1, E | E1, A | A1> {
  return (la) => orElse_(la, that)
}

export function second<A>(): Layer<readonly [unknown, A], never, A> {
  return fromRawFunction(([_, a]) => a)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function to<R, E, A>(from: Layer<R, E, A>) {
  return <E2, A2>(to: Layer<A, E2, A2>): Layer<R, E | E2, A2> =>
    matchLayer_(
      from,
      fromRawFunctionIO((_: readonly [R, Cause<E>]) => I.failCause(_[1])),
      to
    )
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function to_<E, A, R2, E2, A2>(from: Layer<R2, E2, A2>, to: Layer<A2, E, A>): Layer<R2, E | E2, A> {
  return matchLayer_(
    from,
    fromRawFunctionIO((_: readonly [R2, Cause<E2>]) => I.failCause(_[1])),
    to
  )
}

/**
 * Updates one of the services output by this layer.
 */
export function update_<R, E, A extends H.Has<T>, T>(
  la: Layer<R, E, A>,
  tag: H.Tag<T>,
  f: (a: T) => T
): Layer<R, E, A> {
  return la['>=>'](fromRawIO(pipe(I.ask<A>(), I.updateService(tag)(f))))
}

/**
 * Updates one of the services output by this layer.
 */
export function update<T>(
  tag: H.Tag<T>,
  f: (_: T) => T
): <R, E, A extends H.Has<T>>(la: Layer<R, E, A>) => Layer<R, E, A> {
  return (la) => update_(la, tag, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MemoMap
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A `MemoMap` memoizes dependencies.
 */

export class MemoMap {
  constructor(readonly ref: RefM.USRef<HM.HashMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) => {
    const self = this
    return new Ma.Managed<R, E, A>(
      pipe(
        this.ref,
        RefM.modifyIO((map) => {
          const inMap = HM.get_(map, layer.hash.get)

          if (M.isJust(inMap)) {
            const [acquire, release] = inMap.value

            const cached = pipe(
              FR.get(Ma.currentReleaseMap),
              I.chain((releaseMap) =>
                pipe(
                  acquire as I.FIO<E, A>,
                  I.onExit(
                    Ex.match(
                      () => I.unit(),
                      () => RM.add_(releaseMap, release)
                    )
                  ),
                  I.map((a) => tuple(release, a))
                )
              )
            )

            return I.pure(tuple(cached, map))
          } else {
            return I.gen(function* (_) {
              const observers    = yield* _(Ref.make(0))
              const promise      = yield* _(F.make<E, A>())
              const finalizerRef = yield* _(Ref.make<Finalizer>(RM.noopFinalizer))

              const resource = I.uninterruptibleMask(({ restore }) =>
                I.gen(function* (_) {
                  const outerReleaseMap = yield* _(FR.get(Ma.currentReleaseMap))
                  const innerReleaseMap = yield* _(RM.make)
                  const tp              = yield* _(
                    pipe(
                      restore(
                        pipe(
                          Ma.currentReleaseMap,
                          FR.locally(
                            innerReleaseMap,
                            pipe(
                              scope(layer),
                              Ma.chain((f) => f(self))
                            ).io
                          )
                        )
                      ),
                      I.result,
                      I.chain((exit) =>
                        Ex.match_(
                          exit,
                          (cause): I.IO<unknown, E, readonly [Finalizer, A]> =>
                            pipe(
                              promise,
                              F.failCause(cause),
                              I.apSecond(RM.releaseAll_(innerReleaseMap, exit, sequential) as I.FIO<E, any>),
                              I.apSecond(I.failCause(cause))
                            ),
                          ([, b]) =>
                            I.gen(function* (_) {
                              yield* _(
                                pipe(
                                  finalizerRef,
                                  Ref.set((e) =>
                                    pipe(
                                      innerReleaseMap,
                                      RM.releaseAll(e, sequential),
                                      I.whenIO(
                                        pipe(
                                          observers,
                                          Ref.modify((n) => [n === 1, n - 1])
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                              yield* _(Ref.update_(observers, (n) => n + 1))
                              const outerFinalizer = yield* _(
                                RM.add_(outerReleaseMap, (e) => I.chain_(finalizerRef.get, (f) => f(e)))
                              )
                              yield* _(F.succeed_(promise, b))
                              return tuple(outerFinalizer, b)
                            })
                        )
                      )
                    )
                  )
                  return tp
                })
              )

              const memoized = tuple(
                pipe(
                  F.await(promise),
                  I.onExit(
                    Ex.match(
                      () => I.unit(),
                      () => Ref.update_(observers, (n) => n + 1)
                    )
                  )
                ),
                (exit: Exit<any, any>) =>
                  pipe(
                    Ref.get(finalizerRef),
                    I.chain((f) => f(exit))
                  )
              )

              return tuple(resource, isFresh(layer) ? map : HM.set_(map, layer.hash.get, memoized))
            })
          }
        }),
        I.flatten
      )
    )
  }
}

export const HasMemoMap = tag<MemoMap>()
export type HasMemoMap = H.HasTag<typeof HasMemoMap>

export function makeMemoMap() {
  return pipe(
    RefM.make<HM.HashMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>(HM.makeDefault()),
    I.chain((r) => I.succeedLazy(() => new MemoMap(r)))
  )
}
