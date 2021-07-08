import type { FIO, UIO } from '../IO/core'

import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as I from '../IO/core'
import * as O from '../Option'
import { tuple } from '../tuple'
import { matchTag } from '../util/match'
import { AtomicReference } from '../util/support/AtomicReference'
import * as At from './atomic'

export interface Ref<EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `Ref`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `Ref`. For most use cases one of the more specific
   * combinators implemented in terms of `match` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  readonly match: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => Ref<EC, ED, C, D>

  /**
   * Folds over the error and value types ofthe `Ref`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `match` but requires unifying the error types.
   */
  readonly matchAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => Ref<EC, ED, C, D>

  /**
   * Reads the value from the `Ref`.
   */
  readonly get: FIO<EB, B>

  /**
   * Writes a new value to the `Ref`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => FIO<EA, void>
}

export class DerivedAll<EA, EB, A, B> implements Ref<EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    this.match    = this.match.bind(this)
    this.matchAll = this.matchAll.bind(this)
    this.set      = this.set.bind(this)
  }

  match<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            flow(
              getEither,
              E.match((e) => E.left(eb(e)), bd)
            ),
            (c) => (s) => E.chain_(ca(c), (a) => E.match_(setEither(a)(s), flow(ea, E.left), E.right))
          )
        )
    )
  }

  matchAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            (s) => E.match_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              pipe(
                getEither(s),
                E.match((e) => E.left(ec(e)), ca(c)),
                E.deunion,
                E.chain((a) => E.match_(setEither(a)(s), (e) => E.left(ea(e)), E.right))
              )
          )
        )
    )
  }

  get get(): FIO<EB, B> {
    return this.use((value, getEither) => pipe(value.get, I.chain(flow(getEither, E.match(I.fail, I.succeed)))))
  }

  set(a: A): FIO<EA, void> {
    return this.use((value, _, setEither) =>
      pipe(
        value,
        modify((s) =>
          E.match_(
            setEither(a)(s),
            (e) => [E.left(e), s] as [E.Either<EA, void>, typeof s],
            (s) => [E.right(undefined), s]
          )
        ),
        I.subsumeEither
      )
    )
  }
}

export class Derived<EA, EB, A, B> implements Ref<EA, EB, A, B> {
  readonly _tag = 'Derived'

  constructor(
    readonly use: <X>(
      f: <S>(value: Atomic<S>, getEither: (s: S) => E.Either<EB, B>, setEither: (a: A) => E.Either<EA, S>) => X
    ) => X
  ) {
    this.match    = this.match.bind(this)
    this.matchAll = this.matchAll.bind(this)
    this.set      = this.set.bind(this)
  }

  match<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived<EC, ED, C, D>((f) =>
          f(
            value,
            (s) => E.match_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => E.chain_(ca(c), (a) => E.match_(setEither(a), (e) => E.left(ea(e)), E.right))
          )
        )
    )
  }

  matchAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
          f(
            value,
            (s) => E.match_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              pipe(
                getEither(s),
                E.match(flow(ec, E.left), ca(c)),
                E.deunion,
                E.chain((a) => pipe(setEither(a), E.match(flow(ea, E.left), E.right)))
              )
          )
        )
    )
  }

  get get(): FIO<EB, B> {
    return this.use((value, getEither) => pipe(value.get, I.chain(flow(getEither, E.match(I.fail, I.succeed)))))
  }

  set(a: A): FIO<EA, void> {
    return this.use((value, _, setEither) => pipe(setEither(a), E.match(I.fail, value.set)))
  }
}

export class Atomic<A> implements Ref<never, never, A, A> {
  readonly _tag = 'Atomic'

  constructor(readonly value: AtomicReference<A>) {
    this.match    = this.match.bind(this)
    this.matchAll = this.matchAll.bind(this)
    this.set      = this.set.bind(this)
  }

  match<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return new Derived<EC, ED, C, D>((f) => f(this, bd, ca))
  }

  matchAll<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): Ref<EC, ED, C, D> {
    return new DerivedAll<EC, ED, C, D>((f) => f(this, bd, ca))
  }

  get get(): UIO<A> {
    return I.succeedLazy(() => this.value.get)
  }

  set(a: A): UIO<void> {
    return I.succeedLazy(() => {
      this.value.set(a)
    })
  }
}

/**
 * A Ref that can fail with error E
 */
export interface FRef<E, A> extends Ref<E, E, A, A> {}

/**
 * A Ref that cannot fail
 */
export interface URef<A> extends FRef<never, A> {}

/**
 * Cast to a sealed union
 */
export function concrete<EA, EB, A>(ref: Ref<EA, EB, A, A>) {
  return ref as Atomic<A> | DerivedAll<EA, EB, A, A> | Derived<EA, EB, A, A>
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a new `Ref` with the specified value.
 */
export function make<A>(a: A): UIO<URef<A>> {
  return I.succeedLazy(() => new Atomic(new AtomicReference(a)))
}

/**
 * Creates a new `Ref` with the specified value.
 */
export function unsafeMake<A>(a: A): URef<A> {
  return new Atomic(new AtomicReference(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `set` value of the `Ref` with the specified fallible
 * function.
 */
export function contramapEither<A, EC, C>(
  f: (_: C) => E.Either<EC, A>
): <EA, EB, B>(ref: Ref<EA, EB, A, B>) => Ref<EA | EC, EB, C, B> {
  return (_) =>
    pipe(
      _,
      dimapEither(f, (x) => E.right(x))
    )
}

/**
 * Transforms the `set` value of the `Ref` with the specified fallible
 * function.
 */
export function contramapEither_<A, EC, C, EA, EB, B>(
  ref: Ref<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>
): Ref<EC | EA, EB, C, B> {
  return contramapEither(f)(ref)
}

/**
 * Transforms the `set` value of the `Ref` with the specified function.
 */
export function contramap_<EA, EB, B, A, C>(ref: Ref<EA, EB, A, B>, f: (_: C) => A): Ref<EA, EB, C, B> {
  return contramapEither_(ref, (c) => E.right(f(c)))
}

/**
 * Transforms the `set` value of the `Ref` with the specified function.
 */
export function contramap<A, C>(f: (_: C) => A): <EA, EB, B>(ref: Ref<EA, EB, A, B>) => Ref<EA, EB, C, B> {
  return (ref) => contramap_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filter
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filters the `set` value of the `Ref` with the specified predicate,
 * returning a `Ref` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput_<EA, EB, B, A, A1 extends A>(
  ref: Ref<EA, EB, A, B>,
  f: (_: A1) => boolean
): Ref<O.Option<EA>, EB, A1, B> {
  return ref.match(O.some, identity, (a) => (f(a) ? E.right(a) : E.left(O.none())), E.right)
}

/**
 * Filters the `set` value of the `Ref` with the specified predicate,
 * returning a `Ref` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <EA, EB, B>(ref: Ref<EA, EB, A, B>) => Ref<O.Option<EA>, EB, A1, B> {
  return (_) => filterInput_(_, f)
}

/**
 * Filters the `get` value of the `Ref` with the specified predicate,
 * returning a `Ref` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<EA, EB, A, B>(ref: Ref<EA, EB, A, B>, f: (_: B) => boolean): Ref<EA, O.Option<EB>, A, B> {
  return ref.match(identity, O.some, E.right, (b) => (f(b) ? E.right(b) : E.left(O.none())))
}

/**
 * Filters the `get` value of the `Ref` with the specified predicate,
 * returning a `Ref` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (_: B) => boolean
): <EA, EB, A>(ref: Ref<EA, EB, A, B>) => Ref<EA, O.Option<EB>, A, B> {
  return (_) => filterOutput_(_, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Folds over the error and value types of the `Ref`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `Ref`. For most use cases one of the more specific
 * combinators implemented in terms of `match` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function match<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: Ref<EA, EB, A, B>) => Ref<EC, ED, C, D> {
  return (ref) => ref.match(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `Ref`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `Ref`. For most use cases one of the more specific
 * combinators implemented in terms of `match` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function match_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: Ref<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): Ref<EC, ED, C, D> {
  return ref.match(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `Ref`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `match` but requires unifying the error types.
 */
export function matchAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: Ref<EA, EB, A, B>) => Ref<EC, ED, C, D> {
  return (ref) => ref.matchAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `Ref`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `match` but requires unifying the error types.
 */
export function matchAll_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: Ref<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): Ref<EC, ED, C, D> {
  return ref.matchAll(ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `get` value of the `Ref` with the specified fallible
 * function.
 */
export function mapEither_<EA, EB, A, B, EC, C>(
  ref: Ref<EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
): Ref<EA, EC | EB, A, C> {
  return dimapEither_(ref, (a) => E.right(a), f)
}

/**
 * Transforms the `get` value of the `Ref` with the specified fallible
 * function.
 */
export function mapEither<B, EC, C>(
  f: (_: B) => E.Either<EC, C>
): <EA, EB, A>(ref: Ref<EA, EB, A, B>) => Ref<EA, EC | EB, A, C> {
  return (ref) => mapEither_(ref, f)
}

/**
 * Transforms the `get` value of the `Ref` with the specified function.
 */
export function map_<EA, EB, A, B, C>(ref: Ref<EA, EB, A, B>, f: (_: B) => C): Ref<EA, EB, A, C> {
  return mapEither_(ref, (b) => E.right(f(b)))
}

/**
 * Transforms the `get` value of the `Ref` with the specified function.
 */
export function map<B, C>(f: (_: B) => C): <EA, EB, A>(ref: Ref<EA, EB, A, B>) => Ref<EA, EB, A, C> {
  return (ref) => map_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps and filters the `get` value of the `Ref` with the specified partial
 * function, returning a `Ref` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<EA, EB, A, B, C>(
  ref: Ref<EA, EB, A, B>,
  pf: (_: B) => O.Option<C>
): Ref<EA, O.Option<EB>, A, C> {
  return ref.match(identity, O.some, E.right, (b) => E.fromOption_(pf(b), () => O.none()))
}

/**
 * Maps and filters the `get` value of the `Ref` with the specified partial
 * function, returning a `Ref` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  pf: (_: B) => O.Option<C>
): <EA, EB, A>(ref: Ref<EA, EB, A, B>) => Ref<EA, O.Option<EB>, A, C> {
  return (ref) => collect_(ref, pf)
}

/**
 * Transforms both the `set` and `get` values of the `Ref` with the
 * specified fallible functions.
 */
export function dimapEither_<EA, EB, A, B, C, EC, D, ED>(
  ref: Ref<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): Ref<EC | EA, ED | EB, C, D> {
  return ref.match(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `Ref` with the
 * specified fallible functions.
 */
export function dimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): <EA, EB>(ref: Ref<EA, EB, A, B>) => Ref<EC | EA, EB | ED, C, D> {
  return (ref) => dimapEither_(ref, f, g)
}

/**
 * Transforms both the `set` and `get` values of the `Ref` with the
 * specified functions.
 */
export function dimap_<EA, EB, A, B, C, D>(ref: Ref<EA, EB, A, B>, f: (_: C) => A, g: (_: B) => D): Ref<EA, EB, C, D> {
  return pipe(
    ref,
    dimapEither(
      (c) => E.right(f(c)),
      (b) => E.right(g(b))
    )
  )
}

/**
 * Transforms both the `set` and `get` values of the `Ref` with the
 * specified functions.
 */
export function dimap<A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
): <EA, EB>(ref: Ref<EA, EB, A, B>) => Ref<EA, EB, C, D> {
  return (ref) => dimap_(ref, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `Ref` with the
 * specified functions.
 */
export function dimapError_<A, B, EA, EB, EC, ED>(
  ref: Ref<EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): Ref<EC, ED, A, B> {
  return ref.match(f, g, E.right, E.right)
}

/**
 * Transforms both the `set` and `get` errors of the `Ref` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <A, B>(ref: Ref<EA, EB, A, B>) => Ref<EC, ED, A, B> {
  return (ref) => dimapError_(ref, f, g)
}

/**
 * Returns a read only view of the `Ref`.
 */
export function readOnly<EA, EB, A, B>(ref: Ref<EA, EB, A, B>): Ref<EA, EB, never, B> {
  return ref
}

/**
 * Returns a write only view of the `Ref`.
 */
export function writeOnly<EA, EB, A, B>(ref: Ref<EA, EB, A, B>): Ref<EA, void, A, never> {
  return ref.match(
    identity,
    () => undefined,
    E.right,
    () => E.left(undefined)
  )
}

/**
 * Atomically modifies the `Ref` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify<B, A>(f: (a: A) => readonly [B, A]): <EA, EB>(ref: Ref<EA, EB, A, A>) => FIO<EA | EB, B> {
  return (ref) => modify_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => readonly [B, A]): FIO<EA | EB, B> {
  return pipe(
    ref,
    concrete,
    matchTag({
      Atomic: At.modify(f),
      Derived: (derived) =>
        derived.use((value, getEither, setEither) =>
          pipe(
            value,
            At.modify((s) =>
              pipe(
                s,
                getEither,
                E.match(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        a2,
                        setEither,
                        E.match(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            I.subsumeEither
          )
        ),
      DerivedAll: (derivedAll) =>
        derivedAll.use((value, getEither, setEither) =>
          pipe(
            value,
            At.modify((s) =>
              pipe(
                s,
                getEither,
                E.match(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        setEither(a2)(s),
                        E.match(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            I.subsumeEither
          )
        )
    })
  )
}

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<EA, EB, A, B>(
  ref: Ref<EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<[B, A]>
): FIO<EA | EB, B> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.modifySome(def)(f) },
      modify((a) =>
        pipe(
          f(a),
          O.getOrElse(() => tuple(def, a))
        )
      )
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome<B, A>(
  def: B,
  f: (a: A) => O.Option<[B, A]>
): <EA, EB>(ref: Ref<EA, EB, A, A>) => I.FIO<EA | EB, B> {
  return (ref) => modifySome_(ref, def, f)
}

export function getAndSet_<EA, EB, A>(ref: Ref<EA, EB, A, A>, a: A): I.FIO<EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndSet(a) },
      modify((v) => tuple(v, a))
    )
  )
}

/**
 * Atomically writes the specified value to the `Ref`, returning the value
 * immediately before modification.
 */
export function getAndSet<A>(a: A): <EA, EB>(ref: Ref<EA, EB, A, A>) => I.UIO<A> | I.FIO<EA | EB, A> {
  return (ref) => getAndSet_(ref, a)
}

/**
 * Atomically modifies the `Ref` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => A) {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndUpdate(f) },
      modify((v) => tuple(v, f(v)))
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate<A>(f: (a: A) => A): <EA, EB>(ref: Ref<EA, EB, A, A>) => UIO<A> | FIO<EA | EB, A> {
  return (ref) => getAndUpdate_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => O.Option<A>) {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndUpdateSome(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => tuple(v, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome<A>(
  f: (a: A) => O.Option<A>
): <EA, EB>(ref: Ref<EA, EB, A, A>) => UIO<A> | FIO<EA | EB, A> {
  return (ref) => getAndUpdateSome_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified function.
 */
export function update_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, void> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.update(f) },
      modify((v) => tuple(undefined, f(v)))
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified function.
 */
export function update<A>(f: (a: A) => A): <EA, EB>(ref: Ref<EA, EB, A, A>) => FIO<EA | EB, void> {
  return (ref) => update_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag({ Atomic: At.updateAndGet(f) }, (atomic) =>
      pipe(
        atomic,
        modify((v) => pipe(f(v), (result) => tuple(result, result))),
        I.chain(() => atomic.get)
      )
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return <EA, EB>(ref: Ref<EA, EB, A, A>): FIO<EA | EB, A> => updateAndGet_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => O.Option<A>): FIO<EA | EB, void> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.updateSome(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => tuple(undefined, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome<A>(f: (a: A) => O.Option<A>): <EA, EB>(ref: Ref<EA, EB, A, A>) => FIO<EA | EB, void> {
  return (ref) => updateSome_(ref, f)
}

/**
 * Atomically modifies the `Ref` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<EA, EB, A>(ref: Ref<EA, EB, A, A>, f: (a: A) => O.Option<A>): FIO<EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.updateSomeAndGet(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (result) => tuple(result, result)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `Ref` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet<A>(f: (a: A) => O.Option<A>): <EA, EB>(ref: Ref<EA, EB, A, A>) => FIO<EA | EB, A> {
  return (ref) => updateSomeAndGet_(ref, f)
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate_<A>(ref: URef<A>, f: (a: A) => A) {
  return pipe(
    ref,
    concrete,
    matchTag({
      Atomic: At.unsafeUpdate(f),
      Derived: (derived) =>
        derived.use((value, getEither, setEither) =>
          pipe(
            value,
            At.unsafeUpdate((s) => pipe(s, getEither, E.merge, f, setEither, E.merge))
          )
        ),
      DerivedAll: (derivedAll) =>
        derivedAll.use((value, getEither, setEither) =>
          pipe(
            value,
            At.unsafeUpdate((s) => pipe(s, getEither, E.merge, f, (a) => setEither(a)(s), E.merge))
          )
        )
    })
  )
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate<A>(f: (a: A) => A): (ref: URef<A>) => void {
  return (ref) => unsafeUpdate_(ref, f)
}

/**
 * Reads the value from the `Ref`.
 */
export function get<EA, EB, A, B>(ref: Ref<EA, EB, A, B>) {
  return ref.get
}

/**
 * Writes a new value to the `Ref`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<EA, EB, B, A>(ref: Ref<EA, EB, A, B>, a: A) {
  return ref.set(a)
}

/**
 * Writes a new value to the `Ref`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set<A>(a: A): <EA, EB, B>(ref: Ref<EA, EB, A, B>) => I.FIO<EA, void> {
  return (ref) => ref.set(a)
}
