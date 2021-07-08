import type { Cause } from '../Cause'
import type { Exit } from '../Exit'
import type * as H from '../Has'
import type * as HKT from '../HKT'
import type { IOEnv } from '../IOEnv'
import type { Managed } from '../Managed/core'
import type { Finalizer, ReleaseMap } from '../Managed/ReleaseMap'
import type { Erase, UnionToIntersection } from '../util/types'

import * as Ca from '../Cause'
import * as Ch from '../Chunk/core'
import * as E from '../Either'
import { sequential } from '../ExecutionStrategy'
import * as Ex from '../Exit'
import { pipe } from '../function'
import { mergeEnvironments, tag } from '../Has'
import * as RelMap from '../Managed/ReleaseMap'
import { insert } from '../Map'
import * as P from '../Promise'
import * as Ref from '../Ref'
import * as RefM from '../RefM'
import { tuple } from '../tuple'
import { AtomicReference } from '../util/support/AtomicReference'
import * as I from './internal/io'
import * as M from './internal/managed'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

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

  ['>=>']<E1, A1>(that: Layer<A, E1, A1>): Layer<R, E | E1, A1> {
    return andThen_(this, that)
  }

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

  ['+>>']<R1, E1, A1>(to: Layer<A & R1, E1, A1>): Layer<R & R1, E | E1, A1> {
    return andThen_(this['+++'](identity<R1>()), to)
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
    return and_(that, this)
  }

  /**
   * Symbolic alias for crossPar
   */
  ['<&>']<R1, E1, A1>(lb: Layer<R1, E1, A1>): Layer<R & R1, E | E1, readonly [A, A1]> {
    return crossPar_(this, lb)
  }

  use<R1, E1, A1>(io: I.IO<R1 & A, E1, A1>): I.IO<R & R1, E | E1, A1> {
    return M.use_(build(this['+++'](identity<R1>())), (a) => I.giveAll_(io, a))
  }
}

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
  FMap: 'FMap',
  Bind: 'Bind',
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
  | FMap<any, any, any, any>
  | Bind<any, any, any, any, any, any>
  | Fresh<any, any, any>
  | FromManaged<any, any, any>
  | Defer<any, any, any>
  | CrossWithPar<any, any, any, any, any, any, any>
  | CrossWithSeq<any, any, any, any, any, any, any>
  | AllPar<Layer<any, any, any>[]>
  | AllSeq<Layer<any, any, any>[]>

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

export class FMap<R, E, A, B> extends Layer<R, E, B> {
  readonly _tag = LayerTag.FMap

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
    super()
  }
}

export class Bind<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
  readonly _tag = LayerTag.Bind

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

export class CrossWithPar<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.CrossWithPar

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllPar<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllPar

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class CrossWithSeq<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.CrossWithSeq

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllSeq<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllSeq

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export type RIO<R, A> = Layer<R, never, A>

function scope<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  concrete(layer)

  switch (layer._tag) {
    case LayerTag.Fresh: {
      return M.succeed(() => build(layer.layer))
    }
    case LayerTag.FromManaged: {
      return M.succeed(() => layer.managed)
    }
    case LayerTag.Defer: {
      return M.succeed((memo) => memo.getOrElseMemoize(layer.factory()))
    }
    case LayerTag.FMap: {
      return M.succeed((memo) => M.map_(memo.getOrElseMemoize(layer.layer), layer.f))
    }
    case LayerTag.Bind: {
      return M.succeed((memo) => M.chain_(memo.getOrElseMemoize(layer.layer), (a) => memo.getOrElseMemoize(layer.f(a))))
    }
    case LayerTag.CrossWithPar: {
      return M.succeed((memo) =>
        M.crossWithPar_(memo.getOrElseMemoize(layer.layer), memo.getOrElseMemoize(layer.that), layer.f)
      )
    }
    case LayerTag.CrossWithSeq: {
      return M.succeed((memo) =>
        M.crossWith_(memo.getOrElseMemoize(layer.layer), memo.getOrElseMemoize(layer.that), layer.f)
      )
    }
    case LayerTag.AllPar: {
      return M.succeed((memo) => {
        return pipe(
          M.foreachPar_(layer.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(Ch.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.AllSeq: {
      return M.succeed((memo) => {
        return pipe(
          M.foreach_(layer.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(Ch.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.Fold: {
      return M.succeed((memo) =>
        M.matchCauseManaged_(
          memo.getOrElseMemoize(layer.layer),
          (e) =>
            pipe(
              I.toManaged()(I.ask<any>()),
              M.chain((r) => M.gives_(memo.getOrElseMemoize(layer.onFailure), () => tuple(r, e)))
            ),
          (r) => M.giveAll_(memo.getOrElseMemoize(layer.onSuccess), r)
        )
      )
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Builds a layer into a managed value.
 */
export function build<R, E, A>(layer: Layer<R, E, A>): M.Managed<R, E, A> {
  return M.gen(function* (_) {
    const memoMap = yield* _(M.fromIO(makeMemoMap()))
    const run     = yield* _(scope(layer))
    const value   = yield* _(run(memoMap))
    return value
  })
}

/**
 * Constructs a layer from the specified value.
 */
export function succeed_<A>(a: A, tag: H.Tag<A>): Layer<unknown, never, H.Has<A>> {
  return fromManaged(tag)(M.succeed(a))
}

/**
 * Constructs a layer from the specified value.
 */
export function succeed<A>(tag: H.Tag<A>): (a: A) => Layer<unknown, never, H.Has<A>> {
  return (resource) => fromManaged(tag)(M.succeed(resource))
}

export function fail<E>(e: E): Layer<unknown, E, never> {
  return fromRawManaged(M.fail(e))
}

export function identity<R>(): Layer<R, never, R> {
  return fromRawManaged(M.ask<R>())
}

export function prepare<T>(tag: H.Tag<T>) {
  return <R, E, A extends T>(acquire: I.IO<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => I.IO<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
        fromManaged(tag)(
          M.chain_(
            M.bracketExit_(acquire, (a) => release(a)),
            (a) => M.fromIO(I.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
      fromManaged(tag)(M.bracketExit_(acquire, (a) => release(a)))
  })
}

export function create<T>(tag: H.Tag<T>) {
  return {
    fromEffect: fromIO(tag),
    fromManaged: fromManaged(tag),
    pure: succeed(tag),
    prepare: prepare(tag)
  }
}

/**
 * Constructs a layer from the specified effect.
 */
export function fromIO_<R, E, T>(resource: I.IO<R, E, T>, tag: H.Tag<T>): Layer<R, E, H.Has<T>> {
  return fromManaged_(M.fromIO(resource), tag)
}

/**
 * Constructs a layer from the specified effect.
 *
 * @dataFirst fromIO_
 */
export function fromIO<T>(tag: H.Tag<T>): <R, E>(resource: I.IO<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => fromIO_(resource, tag)
}

export function fromManaged_<R, E, T>(resource: Managed<R, E, T>, has: H.Tag<T>): Layer<R, E, H.Has<T>> {
  return new FromManaged(M.chain_(resource, (a) => environmentFor(has, a))).setKey(has.key)
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(tag: H.Tag<T>): <R, E>(resource: Managed<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => fromManaged_(resource, tag)
}

export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new FromManaged(resource)
}

export function fromRawIO<R, E, A>(resource: I.IO<R, E, A>): Layer<R, E, A> {
  return new FromManaged(M.fromIO(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawIO(I.asks(f))
}

export function fromRawFunctionIO<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): Layer<R & A, E, B> {
  return fromRawIO(I.asksIO(f))
}

export function fromRawFunctionManaged<R0, R, E, A>(f: (r0: R0) => Managed<R, E, A>): Layer<R0 & R, E, A> {
  return fromRawManaged(M.asksManaged(f))
}

export function fromFunctionManaged_<A, R, E, T>(
  f: (a: A) => Managed<R, E, T>,
  tag: H.Tag<T>
): Layer<R & A, E, H.Has<T>> {
  return fromManaged_(M.asksManaged(f), tag)
}

export function fromFunctionManaged<T>(
  tag: H.Tag<T>
): <A, R, E>(f: (a: A) => Managed<R, E, T>) => Layer<R & A, E, H.Has<T>> {
  return (f) => fromFunctionManaged_(f, tag)
}

export function fromFunctionIO_<A, R, E, T>(f: (a: A) => I.IO<R, E, T>, tag: H.Tag<T>): Layer<R & A, E, H.Has<T>> {
  return fromFunctionManaged_((a: A) => I.toManaged_(f(a)), tag)
}

export function fromFunctionIO<T>(tag: H.Tag<T>): <A, R, E>(f: (a: A) => I.IO<R, E, T>) => Layer<R & A, E, H.Has<T>> {
  return (f) => fromFunctionIO_(f, tag)
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
  constructor: (...services: Services) => M.Managed<R, E, S>
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
        M.chain_(
          M.fromIO(
            I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as I.IO<any, any, any>
          ),
          (_) => _
        )
      )
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
    andThen_(
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
  return new CrossWithSeq(fa, fb, f)
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
  return new CrossWithSeq(fa, fb, tuple)
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

export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): Layer<R & R1, E | E1, C> {
  return new CrossWithPar(fa, fb, f)
}

export function crossWithPar<A, R1, E1, B, C>(
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Layer<R, E, A>) => Layer<R & R1, E | E1, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function crossPar_<R, E, A, R1, E1, B>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>
): Layer<R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

export function crossPar<R1, E1, B>(
  right: Layer<R1, E1, B>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E | E1, readonly [A, B]> {
  return (left) => cross_(left, right)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Layer<R, E, (a: A) => B>,
  fa: Layer<R1, E1, A>
): Layer<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function apPar<R1, E1, A>(
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
  return new FMap(fa, f)
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
  return new Bind(ma, f)
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
  return new AllSeq(ls)
}

export function allPar<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllPar(ls)
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new CrossWithPar(left, right, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (left) => and_(left, right)
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andSeq_<R, E, A, R1, E1, A1>(
  layer: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> {
  return new CrossWithSeq(layer, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andSeq<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (layer) => andSeq_(layer, that)
}

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, H.Has<T>>
function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, any> {
  return M.fromIO(
    I.asks((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  la: Layer<R, E, A>,
  handler: Layer<readonly [R1, E], E1, B>
): Layer<R & R1, E1, A | B> {
  const failureOrDie: Layer<readonly [R1, Cause<E>], never, readonly [R1, E]> = fromRawFunctionIO(
    ([r, cause]: readonly [R1, Cause<E>]) =>
      pipe(
        cause,
        Ca.failureOrCause,
        E.match(
          (e) => I.succeed(tuple(r, e)),
          (c) => I.halt(c)
        )
      )
  )
  return matchLayer_(la, failureOrDie['>>>'](handler), identity())
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
  return pipe(la, build, M.useForever)
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
export function andThen_<R, E, A, E1, A1>(from: Layer<R, E, A>, to: Layer<A, E1, A1>): Layer<R, E | E1, A1> {
  return matchLayer_(
    from,
    fromRawFunctionIO((_: readonly [unknown, Cause<E>]) => I.halt(_[1])),
    to
  )
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 *
 * @dataFirst andThen_
 */
export function andThen<A, E1, A1>(to: Layer<A, E1, A1>): <R, E>(from: Layer<R, E, A>) => Layer<R, E | E1, A1> {
  return (from) => andThen_(from, to)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function compose_<R, E, A, E1, A1>(to: Layer<A, E1, A1>, from: Layer<R, E, A>): Layer<R, E | E1, A1> {
  return andThen_(from, to)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 *
 * @dataFirst compose_
 */
export function compose<R, E, A>(from: Layer<R, E, A>): <E1, A1>(to: Layer<A, E1, A1>) => Layer<R, E | E1, A1> {
  return (to) => compose_(to, from)
}

/**
 * Returns a managed effect that, if evaluated, will return the lazily
 * computed result of this layer.
 */
export function memoize<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, Layer<R, E, A>> {
  return M.map_(M.memoize(build(layer)), (_) => fromRawManaged(_))
}

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orDie<R, E extends Error, A>(la: Layer<R, E, A>): Layer<R, never, A> {
  return catchAll_(la, second<E>()['>=>'](fromRawFunctionIO((e: E) => I.die(e))))
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
      fromRawFunctionIO((_: readonly [R, Cause<E>]) => I.halt(_[1])),
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
    fromRawFunctionIO((_: readonly [R2, Cause<E2>]) => I.halt(_[1])),
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
  constructor(readonly ref: RefM.URefM<ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) => {
    const self = this
    return new M.Managed<R, E, A>(
      pipe(
        this.ref,
        RefM.modifyIO((m) => {
          const inMap = m.get(layer.hash.get)

          if (inMap) {
            const [acquire, release] = inMap

            const cached = I.asksIO(([_, rm]: readonly [R, ReleaseMap]) =>
              pipe(
                acquire as I.FIO<E, A>,
                I.onExit(
                  Ex.match(
                    () => I.unit(),
                    () => RelMap.add(rm, release)
                  )
                ),
                I.map((x) => [release, x] as readonly [Finalizer, A])
              )
            )

            return I.pure(tuple(cached, m))
          } else {
            return I.gen(function* (_) {
              const observers    = yield* _(Ref.make(0))
              const promise      = yield* _(P.make<E, A>())
              const finalizerRef = yield* _(Ref.make<Finalizer>(RelMap.noopFinalizer))

              const resource = I.uninterruptibleMask(({ restore }) =>
                I.gen(function* (_) {
                  const env                  = yield* _(I.ask<readonly [R, ReleaseMap]>())
                  const [a, outerReleaseMap] = env
                  const innerReleaseMap      = yield* _(RelMap.make)
                  const tp                   = yield* _(
                    pipe(
                      scope(layer),
                      M.chain((_) => _(self)),
                      (_) => _.io,
                      I.giveAll(tuple(a, innerReleaseMap)),
                      I.result,
                      I.chain((ex) =>
                        Ex.match_(
                          ex,
                          (cause): I.IO<unknown, E, readonly [Finalizer, A]> =>
                            pipe(
                              P.halt_(promise, cause),
                              I.chain(() => M.releaseAll_(innerReleaseMap, ex, sequential) as I.FIO<E, any>),
                              I.chain(() => I.halt(cause))
                            ),
                          ([, a]) =>
                            I.gen(function* (_) {
                              yield* _(
                                finalizerRef.set((e) =>
                                  pipe(
                                    M.releaseAll_(innerReleaseMap, e, sequential),
                                    I.whenIO(Ref.modify_(observers, (n) => [n === 1, n - 1]))
                                  )
                                )
                              )
                              yield* _(Ref.update_(observers, (n) => n + 1))
                              const outerFinalizer = yield* _(
                                RelMap.add(outerReleaseMap, (e) => I.chain_(finalizerRef.get, (f) => f(e)))
                              )
                              yield* _(P.succeed_(promise, a))
                              return tuple(outerFinalizer, a)
                            })
                        )
                      ),
                      restore
                    )
                  )
                  return tp
                })
              )

              const memoized = tuple(
                pipe(
                  P.await(promise),
                  I.onExit(
                    Ex.match(
                      (_) => I.unit(),
                      (_) => Ref.update_(observers, (n) => n + 1)
                    )
                  )
                ),
                (ex: Exit<any, any>) => I.chain_(finalizerRef.get, (f) => f(ex))
              )

              return tuple(
                resource as I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>,
                insert(layer.hash.get, memoized)(m) as ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>
              )
            })
          }
        }),
        I.flatten
      )
    )
  }
}

export const HasMemoMap = tag(MemoMap)
export type HasMemoMap = H.HasTag<typeof HasMemoMap>

export function makeMemoMap() {
  return pipe(
    RefM.make<ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>(new Map()),
    I.chain((r) => I.succeedLazy(() => new MemoMap(r)))
  )
}
