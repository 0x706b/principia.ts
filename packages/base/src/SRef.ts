import type { UIO } from './IO/core'
import type { UManaged } from './Managed/core'
import type { URef } from './Ref'
import type { Semaphore } from './Semaphore'

import * as E from './Either'
import { flow, identity, pipe } from './function'
import * as I from './IO/core'
import * as Ma from './Managed/core'
import * as M from './Maybe'
import * as P from './prelude'
import * as Q from './Queue'
import * as R from './Ref'
import * as S from './Semaphore'
import { tuple } from './tuple/core'

/**
 * Synchronized Ref
 *
 * An `SRef<RA, RB, EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `SRef`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially
 * failing with an error of type `EA`. `get` gets the current value of the
 * reference and returns a value of type `B`, requiring an environment of type
 * `RB` and potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `SRef` are unified, that is, it is a
 * `SRef<RA, RB, E, E, A, A>`, the `SRef` also supports atomic `modify` and `update`
 * operations.
 *
 * Unlike `Ref`, `SRef` allows performing effects within update operations,
 * at some cost to performance. Writes will semantically block other writers,
 * while multiple readers can read simultaneously.
 */
export interface SRef<RA, RB, EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `SRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `SRef`. For most use cases one of the more
   * specific combinators implemented in terms of `matchM` will be more
   * ergonomic but this method is extremely useful for implementing new
   * combinators.
   */
  readonly matchIO: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => SRef<RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Folds over the error and value types of the `SRef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `matchM` but requires unifying the environment and error types.
   */
  readonly matchAllIO: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => SRef<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `SRef`.
   */
  readonly get: I.IO<RB, EB, B>

  /**
   * Writes a new value to the `SRef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => I.IO<RA, EA, void>
}

export class DerivedAll<RA, RB, EA, EB, A, B> implements SRef<RA, RB, EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => I.IO<RB, EB, B>,
        setEither: (a: A) => (s: S) => I.IO<RA, EA, S>
      ) => X
    ) => X
  ) {
    this.matchIO    = this.matchIO.bind(this)
    this.matchAllIO = this.matchAllIO.bind(this)
    this.set        = this.set.bind(this)
  }

  matchIO<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): SRef<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            flow(getEither, I.matchIO(flow(eb, I.fail), bd)),
            (a) => (s) => I.chain_(ca(a), (a) => I.mapError_(setEither(a)(s), ea))
          )
        )
    )
  }

  matchAllIO<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): SRef<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            flow(getEither, I.matchIO(flow(eb, I.fail), bd)),
            (c) => (s) =>
              I.chain_(
                I.matchIO_(getEither(s), (e) => I.fail(ec(e)), ca(c)),
                (a) => I.mapError_(setEither(a)(s), ea)
              )
          )
        )
    )
  }

  get get(): I.IO<RB, EB, B> {
    return this.use((value, getEither) => I.chain_(value.get, getEither))
  }

  set(a: A): I.IO<RA, EA, void> {
    return this.use((value, _, setEither) =>
      S.withPermit(value.semaphore)(pipe(value.get, I.chain(setEither(a)), I.chain(value.set)))
    )
  }
}

export class Derived<RA, RB, EA, EB, A, B> implements SRef<RA, RB, EA, EB, A, B> {
  readonly _tag = 'Derived'

  constructor(
    readonly use: <X>(
      f: <S>(value: Atomic<S>, getEither: (s: S) => I.IO<RB, EB, B>, setEither: (a: A) => I.IO<RA, EA, S>) => X
    ) => X
  ) {
    this.matchIO    = this.matchIO.bind(this)
    this.matchAllIO = this.matchAllIO.bind(this)
    this.set        = this.set.bind(this)
  }

  matchIO<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): SRef<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(value, flow(getEither, I.matchIO(flow(eb, I.fail), bd)), flow(ca, I.chain(flow(setEither, I.mapError(ea)))))
        )
    )
  }

  matchAllIO<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): SRef<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            flow(getEither, I.matchIO(flow(eb, I.fail), bd)),
            (c) => (s) =>
              pipe(getEither(s), I.matchIO(flow(ec, I.fail), ca(c)), I.chain(flow(setEither, I.mapError(ea))))
          )
        )
    )
  }

  get get(): I.IO<RB, EB, B> {
    return this.use((value, getEither) => I.chain_(value.get, getEither))
  }

  set(a: A): I.IO<RA, EA, void> {
    return this.use((value, _, setEither) => S.withPermit(value.semaphore)(I.chain_(setEither(a), value.set)))
  }
}

export class Atomic<A> implements SRef<unknown, unknown, never, never, A, A> {
  readonly _tag = 'Atomic'

  constructor(readonly ref: URef<A>, readonly semaphore: Semaphore) {
    this.matchIO    = this.matchIO.bind(this)
    this.matchAllIO = this.matchAllIO.bind(this)
    this.set        = this.set.bind(this)
  }

  matchIO<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): SRef<RC, RD, EC, ED, C, D> {
    return new Derived<RC, RD, EC, ED, C, D>((f) => f(this, bd, ca))
  }

  matchAllIO<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): SRef<RC, RD, EC, ED, C, D> {
    return new DerivedAll<RC, RD, EC, ED, C, D>((f) => f(this, bd, ca))
  }

  get get(): I.IO<unknown, never, A> {
    return this.ref.get
  }

  set(a: A): I.IO<unknown, never, void> {
    return S.withPermit(this.semaphore)(this.ref.set(a))
  }
}

export interface RFSRef<R, E, A> extends SRef<R, R, E, E, A, A> {}
export interface FSRef<E, A> extends SRef<unknown, unknown, E, E, A, A> {}
export interface URSRef<R, A> extends SRef<R, R, never, never, A, A> {}
export interface USRef<A> extends SRef<unknown, unknown, never, never, A, A> {}

export function concrete<RA, RB, EA, EB, A>(_: SRef<RA, RB, EA, EB, A, A>) {
  return _ as Atomic<A> | Derived<RA, RB, EA, EB, A, A> | DerivedAll<RA, RB, EA, EB, A, A>
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a new `SRef` with the specified value.
 */
export function make<A>(a: A): UIO<USRef<A>> {
  return I.gen(function* (_) {
    const ref       = yield* _(R.make(a))
    const semaphore = yield* _(S.make(1))
    return new Atomic(ref, semaphore)
  })
}

/**
 * Creates a new `SRef` with the specified value.
 */
export function unsafeMake<A>(a: A): USRef<A> {
  const ref       = R.unsafeMake(a)
  const semaphore = S.unsafeMake(1)
  return new Atomic(ref, semaphore)
}

/**
 * Creates a new `SRef` with the specified value in the context of a
 * `Managed.`
 */
export function makeManaged<A>(a: A): UManaged<USRef<A>> {
  return pipe(make(a), Ma.fromIO)
}

/**
 * Creates a new `SRef` and a `Dequeue` that will emit every change to the
 * `SRef`.
 */
export function dequeue<A>(a: A): UIO<readonly [USRef<A>, Q.Dequeue<A>]> {
  return I.gen(function* (_) {
    const ref   = yield* _(make(a))
    const queue = yield* _(Q.makeUnbounded<A>())
    return tuple(
      pipe(
        ref,
        tapInput((a) => Q.offer_(queue, a))
      ),
      queue
    )
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `set` value of the `SRef` with the specified effectual
 * function.
 */
export function contramapIO_<RA, RB, EA, EB, B, A, RC, EC, C>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): SRef<RA & RC, RB, EC | EA, EB, C, B> {
  return dimapIO_(ref, f, I.pure)
}

/**
 * Transforms the `set` value of the `SRef` with the specified effectual
 * function.
 */
export function contramapIO<A, RC, EC, C>(
  f: (c: C) => I.IO<RC, EC, A>
): <RA, RB, EA, EB, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA & RC, RB, EC | EA, EB, C, B> {
  return (ref) => contramapIO_(ref, f)
}

/**
 * Transforms the `set` value of the `SRef` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): SRef<RA, RB, EA, EB, C, B> {
  return contramapIO_(ref, (c) => I.pure(f(c)))
}

/**
 * Transforms the `set` value of the `SRef` with the specified function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EA, EB, C, B> {
  return (ref) => contramap_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filters the `set` value of the `SRef` with the specified effectual
 * predicate, returning a `SRef` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputIO_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, boolean>
): SRef<RA & RC, RB, M.Maybe<EC | EA>, EB, A1, B> {
  return pipe(
    ref,
    matchIO(
      (ea) => M.just<EA | EC>(ea),
      identity,
      (a: A1) =>
        I.ifIOLazy_(
          I.asJustError(f(a)),
          () => I.pure(a),
          () => I.fail<M.Maybe<EA | EC>>(M.nothing())
        ),
      I.pure
    )
  )
}

/**
 * Filters the `set` value of the `SRef` with the specified effectual
 * predicate, returning a `SRef` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputIO<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA & RC, RB, M.Maybe<EA | EC>, EB, A1, B> {
  return (ref) => filterInputIO_(ref, f)
}

/**
 * Filters the `set` value of the `SRef` with the specified effectual
 * predicate, returning a `SRef` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): SRef<RA, RB, M.Maybe<EA>, EB, A1, B> {
  return filterInputIO_(ref, (a) => I.pure(f(a)))
}

/**
 * Filters the `set` value of the `SRef` with the specified effectual
 * predicate, returning a `SRef` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(
  f: (a: A1) => boolean
): <RA, RB, EA, EB, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, M.Maybe<EA>, EB, A1, B> {
  return (ref) => filterInput_(ref, f)
}

/**
 * Filters the `get` value of the `SRef` with the specified effectual predicate,
 * returning a `SRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputIO_<RA, RB, EA, EB, A, B, RC, EC>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, boolean>
): SRef<RA, RB & RC, EA, M.Maybe<EC | EB>, A, B> {
  return matchIO_(
    ref,
    (ea) => ea,
    (eb) => M.just<EB | EC>(eb),
    (a) => I.pure(a),
    (b) =>
      I.ifIOLazy_(
        I.asJustError(f(b)),
        () => I.pure(b),
        () => I.fail(M.nothing())
      )
  )
}

/**
 * Filters the `get` value of the `SRef` with the specified effectual predicate,
 * returning a `SRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputIO<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB & RC, EA, M.Maybe<EB | EC>, A, B> {
  return (ref) => filterOutputIO_(ref, f)
}

/**
 * Filters the `get` value of the `SRef` with the specified predicate,
 * returning a `SRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): SRef<RA, RB, EA, M.Maybe<EB>, A, B> {
  return filterOutputIO_(ref, (b) => I.pure(f(b)))
}

/**
 * Filters the `get` value of the `SRef` with the specified predicate,
 * returning a `SRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (b: B) => boolean
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EA, M.Maybe<EB>, A, B> {
  return (ref) => filterOutput_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Folds over the error and value types of the `SRef`.
 */
export function match_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): SRef<RA, RB, EC, ED, C, D> {
  return ref.matchIO(
    ea,
    eb,
    (c) => I.fromEitherLazy(() => ca(c)),
    (b) => I.fromEitherLazy(() => bd(b))
  )
}

/**
 * Folds over the error and value types of the `SRef`.
 */
export function match<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EC, ED, C, D> {
  return (ref) => match_(ref, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `SRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `SRef`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function matchIO_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): SRef<RA & RC, RB & RD, EC, ED, C, D> {
  return ref.matchIO(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `SRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `SRef`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function matchIO<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA & RC, RB & RD, EC, ED, C, D> {
  return (ref) => matchIO_(ref, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `SRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function matchAllIO_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): SRef<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return ref.matchAllIO(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `SRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function matchAllIO<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return (ref) => matchAllIO_(ref, ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `get` value of the `SRef` with the specified effectual
 * function.
 */
export function mapIO_<RA, RB, EA, EB, A, B, RC, EC, C>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): SRef<RA, RB & RC, EA, EB | EC, A, C> {
  return pipe(ref, dimapIO(I.succeed, f))
}

/**
 * Transforms the `get` value of the `SRef` with the specified effectual
 * function.
 */
export function mapIO<B, RC, EC, C>(
  f: (b: B) => I.IO<RC, EC, C>
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB & RC, EA, EC | EB, A, C> {
  return (ref) => mapIO_(ref, f)
}

/**
 * Transforms the `get` value of the `SRef` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): SRef<RA, RB, EA, EB, A, C> {
  return mapIO_(ref, (b) => I.succeed(f(b)))
}

/**
 * Transforms the `get` value of the `SRef` with the specified function.
 */
export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EA, EB, A, C> {
  return (ref) => map_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Tap
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Performs the specified effect every time a value is written to this
 * `SRef`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, any>
): SRef<RA & RC, RB, EA | EC, EB, A1, B> {
  return pipe(
    ref,
    contramapIO((c: A1) => pipe(f(c), I.as(c)))
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `SRef`.
 */
export function tapInput<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA & RC, RB, EC | EA, EB, A1, B> {
  return (ref) => tapInput_(ref, f)
}

/**
 * Performs the specified effect every time a value is written to this
 * `SRef`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, any>
): SRef<RA, RB & RC, EA, EB | EC, A, B> {
  return pipe(
    ref,
    mapIO((b) => pipe(f(b), I.as(b)))
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `SRef`.
 */
export function tapOutput<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB & RC, EA, EC | EB, A, B> {
  return (ref) => tapOutput_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms both the `set` and `get` values of the `SRef` with the
 * specified effectual functions.
 */
export function dimapIO_<RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): SRef<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return ref.matchIO(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `SRef` with the
 * specified effectual functions.
 */
export function dimapIO<B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA & RC, RB & RD, EC | EA, ED | EB, C, D> {
  return (ref) => dimapIO_(ref, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `SRef` with the
 * specified functions.
 */
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): SRef<RA, RB, EC, ED, A, B> {
  return pipe(
    ref,
    match(
      (ea) => f(ea),
      (eb) => g(eb),
      (a) => E.right(a),
      (b) => E.right(b)
    )
  )
}

/**
 * Transforms both the `set` and `get` errors of the `SRef` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): <RA, RB, A, B>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EC, ED, A, B> {
  return (ref) => dimapError_(ref, f, g)
}

/**
 * Atomically modifies the `SRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modifyIO_<RA, RB, EA, EB, R1, E1, B, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    ref,
    concrete,
    P.matchTag({
      Atomic: (atomic) =>
        pipe(
          atomic.ref.get,
          I.chain(f),
          I.chain(([b, a]) => pipe(atomic.ref.set(a), I.as(b))),
          S.withPermit(atomic.semaphore)
        ),
      Derived: (derived) =>
        derived.use((value, getEither, setEither) =>
          pipe(
            value.ref.get,
            I.chain((a) =>
              pipe(
                getEither(a),
                I.chain(f),
                I.chain(([b, a]) =>
                  pipe(
                    setEither(a),
                    I.chain((a) => value.ref.set(a)),
                    I.as(b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
        ),
      DerivedAll: (derivedAll) =>
        derivedAll.use((value, getEither, setEither) =>
          pipe(
            value.ref.get,
            I.chain((s) =>
              pipe(
                getEither(s),
                I.chain(f),
                I.chain(([b, a]) =>
                  pipe(
                    setEither(a)(s),
                    I.chain((a) => value.ref.set(a)),
                    I.as(b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
        )
    })
  )
}

/**
 * Atomically modifies the `SRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modifyIO<R1, E1, B, A>(
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, B> {
  return (ref) => modifyIO_(ref, f)
}

/**
 * Writes a new value to the `SRef`, returning the value immediately before
 * modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, A>, a: A): I.IO<RA & RB, EA | EB, A> {
  return pipe(
    ref,
    modifyIO((v) => I.pure([v, a]))
  )
}

/**
 * Writes a new value to the `SRef`, returning the value immediately before
 * modification.
 */
export function getAndSet<A>(a: A): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, A> {
  return (ref) => getAndSet_(ref, a)
}

/**
 * Atomically modifies the `SRef` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        I.map((r) => [v, r])
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateIO<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (ref) => getAndUpdate_(ref, f)
}

/**
 * Atomically modifies the `SRef` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateJustIO_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        M.getOrElse(() => I.pure(v)),
        I.map((r) => [v, r])
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateJustIO<R1, E1, A>(
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, A> {
  return (ref) => getAndUpdateJustIO_(ref, f)
}

/**
 * Atomically modifies the `SRef` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateJust`.
 */
export function modifyJustIO_<RA, RB, EA, EB, R1, E1, A, B>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => M.Maybe<I.IO<R1, E1, readonly [B, A]>>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        M.getOrElse(() => I.pure(tuple(def, v)))
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateJust`.
 */
export function modifyJustIO<B>(
  def: B
): <R1, E1, A>(
  f: (a: A) => M.Maybe<I.IO<R1, E1, [B, A]>>
) => <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, B> {
  return (f) => (ref) => modifyJustIO_(ref, def, f)
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateIO_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        I.map((r) => [undefined, r])
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateIO<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (ref) => updateIO_(ref, f)
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateAndGetIO_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        I.map((r) => [r, r])
      )
    ),
    I.asUnit
  )
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateAndGetIO<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (ref) => updateAndGetIO_(ref, f)
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateJustIO_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        M.getOrElse(() => I.pure(v)),
        I.map((r) => [undefined, r])
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateJustIO<R1, E1, A>(
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, void> {
  return (ref) => updateJustIO_(ref, f)
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateJustAndGetIO_<RA, RB, EA, EB, R1, E1, A>(
  ref: SRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return pipe(
    ref,
    modifyIO((v) =>
      pipe(
        f(v),
        M.getOrElse(() => I.pure(v)),
        I.map((r) => [r, r])
      )
    )
  )
}

/**
 * Atomically modifies the `SRef` with the specified function.
 */
export function updateJustAndGetIO<R1, E1, A>(
  f: (a: A) => M.Maybe<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: SRef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (ref) => updateJustAndGetIO_(ref, f)
}

/**
 * Maps and filters the `get` value of the `SRef` with the specified
 * effectual partial function, returning a `SRef` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectIO_<RA, RB, EA, EB, A, B, RC, EC, C>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => M.Maybe<I.IO<RC, EC, C>>
): SRef<RA, RB & RC, EA, M.Maybe<EB | EC>, A, C> {
  return ref.matchIO(
    identity,
    (_) => M.just<EB | EC>(_),
    (_) => I.pure(_),
    (b) =>
      pipe(
        f(b),
        M.map((a) => I.asJustError(a)),
        M.getOrElse(() => I.fail(M.nothing()))
      )
  )
}

/**
 * Maps and filters the `get` value of the `SRef` with the specified
 * effectual partial function, returning a `SRef` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectIO<B, RC, EC, C>(
  f: (b: B) => M.Maybe<I.IO<RC, EC, C>>
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB & RC, EA, M.Maybe<EC | EB>, A, C> {
  return (ref) => collectIO_(ref, f)
}

/**
 * Maps and filters the `get` value of the `SRef` with the specified partial
 * function, returning a `SRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  ref: SRef<RA, RB, EA, EB, A, B>,
  f: (b: B) => M.Maybe<C>
): SRef<RA, RB, EA, M.Maybe<EB>, A, C> {
  return pipe(
    ref,
    collectIO((b) => pipe(f(b), M.map(I.pure)))
  )
}

/**
 * Maps and filters the `get` value of the `SRef` with the specified partial
 * function, returning a `SRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  f: (b: B) => M.Maybe<C>
): <RA, RB, EA, EB, A>(ref: SRef<RA, RB, EA, EB, A, B>) => SRef<RA, RB, EA, M.Maybe<EB>, A, C> {
  return (ref) => collect_(ref, f)
}

/**
 * Returns a read-only view of the `SRef`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(ref: SRef<RA, RB, EA, EB, A, B>): SRef<RA, RB, EA, EB, never, B> {
  return ref
}

/**
 * Returns a write-only view of the `SRef`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(ref: SRef<RA, RB, EA, EB, A, B>): SRef<RA, RB, EA, void, A, never> {
  return pipe(
    ref,
    match(
      identity,
      (): void => undefined,
      E.right,
      () => E.left<void>(undefined)
    )
  )
}
