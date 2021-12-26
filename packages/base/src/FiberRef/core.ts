import type { FIO, IO, UIO } from '../IO/core'

import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import { FiberRefDelete, FiberRefLocally, FiberRefModify, FiberRefWith } from '../IO/core'
import * as M from '../Maybe'
import { matchTag_ } from '../prelude'
import { tuple } from '../tuple'
import * as I from './internal/io'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface FiberRef<EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `FiberRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `FiberRef`. For most use cases one of the more
   * specific combinators implemented in terms of `match` will be more ergonomic
   * but this method is extremely useful for implementing new combinators.
   */
  readonly match: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => FiberRef<EC, ED, C, D>

  /**
   * Folds over the error and value types of the `ZFiberRef`, allowing access
   * to the state in transforming the `set` value. This is a more powerful
   * version of `match` but requires unifying the error types.
   */
  readonly matchAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => FiberRef<EC, ED, C, D>
  /**
   * Reads the value associated with the current fiber. Returns initial value if
   * no value was `set` or inherited from parent.
   */
  readonly get: FIO<EB, B>
  /**
   * Returns the initial value or error.
   */
  readonly initialValue: E.Either<EB, B>
  /**
   * Sets the value associated with the current fiber.
   */
  readonly set: (value: A) => FIO<EA, void>
  /**
   * Returns an `IO` that runs with `value` bound to the current fiber.
   *
   * Guarantees that fiber data is properly restored via `acquireRelease`.
   */
  readonly locally: <R, EC, C>(use: IO<R, EC, C>, value: A) => IO<R, EA | EC, C>

  readonly getWith: <R, E, C>(f: (b: B) => I.IO<R, E, C>) => I.IO<R, EB | E, C>
}

export type UFiberRef<A> = FiberRef<never, never, A, A>

export class Runtime<A> implements FiberRef<never, never, A, A> {
  readonly _tag = 'Runtime'

  constructor(readonly initial: A, readonly fork: (a: A) => A, readonly join: (a0: A, a1: A) => A) {}

  get delete(): UIO<void> {
    return new FiberRefDelete(this)
  }
  match<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): FiberRef<EC, ED, C, D> {
    return new Derived((f) => f(this, bd, ca))
  }

  matchAll<EC, ED, C, D>(
    ea: (_: never) => EC,
    eb: (_: never) => ED,
    ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): FiberRef<EC, ED, C, D> {
    return new DerivedAll((f) => f(this, bd, ca, pipe(this.initialValue, E.chain(bd))))
  }

  modify<B>(f: (a: A) => readonly [B, A]): UIO<B> {
    return new FiberRefModify(this, f)
  }

  get get(): UIO<A> {
    return this.modify((v) => [v, v])
  }

  get initialValue(): E.Either<never, A> {
    return E.right(this.initial)
  }

  locally<R, EC, C>(use: IO<R, EC, C>, value: A): IO<R, EC, C> {
    return new FiberRefLocally(value, this, use)
  }

  set(value: A): UIO<void> {
    return this.modify(() => [undefined, value])
  }

  getWith<R, E, C>(f: (b: A) => IO<R, E, C>): IO<R, E, C> {
    return new FiberRefWith(this, f)
  }
}

export class Derived<EA, EB, A, B> implements FiberRef<EA, EB, A, B> {
  readonly _tag = 'Derived'

  constructor(
    readonly use: <X>(
      f: <S>(value: Runtime<S>, getEither: (s: S) => E.Either<EB, B>, setEither: (a: A) => E.Either<EA, S>) => X
    ) => X
  ) {}

  match<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): FiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived<EC, ED, C, D>((f) =>
          f(
            value,
            flow(
              getEither,
              E.match((e) => E.left(eb(e)), bd)
            ),
            flow(
              ca,
              E.chain(
                flow(
                  setEither,
                  E.match((e) => E.left(ea(e)), E.right)
                )
              )
            )
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
  ): FiberRef<EC, ED, C, D> {
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
              ),
            pipe(this.initialValue, E.mapLeft(eb), E.chain(bd))
          )
        )
    )
  }

  get get(): FIO<EB, B> {
    return this.use((value, getEither) => pipe(value.get, I.chain(flow(getEither, E.match(I.fail, I.succeed)))))
  }

  get initialValue(): E.Either<EB, B> {
    return this.use((value, getEither) => pipe(value.initialValue, E.chain(getEither)))
  }

  locally<R, EC, C>(use: IO<R, EC, C>, a: A): IO<R, EA | EC, C> {
    return this.use((value, _, setEither) =>
      pipe(
        value.get,
        I.chain((old) =>
          pipe(
            setEither(a),
            E.match(
              (e): IO<R, EA | EC, C> => I.fail(e),
              (s) =>
                pipe(
                  value.set(s),
                  I.bracket(
                    () => use,
                    () => value.set(old)
                  )
                )
            )
          )
        )
      )
    )
  }

  set(a: A): FIO<EA, void> {
    return this.use((value, _, setEither) =>
      pipe(
        setEither(a),
        E.match(I.fail, (s) => value.set(s))
      )
    )
  }

  getWith<R, E, C>(f: (b: B) => IO<R, E, C>): IO<R, EB | E, C> {
    return pipe(this.get, I.chain(f))
  }
}

export class DerivedAll<EA, EB, A, B> implements FiberRef<EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>,
        initialValue: E.Either<EB, B>
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
  ): FiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither, initialValue) =>
        new DerivedAll<EC, ED, C, D>((f) =>
          f(
            value,
            flow(
              getEither,
              E.match((e) => E.left(eb(e)), bd)
            ),
            (c) => (s) => E.chain_(ca(c), (a) => E.match_(setEither(a)(s), flow(ea, E.left), E.right)),
            pipe(initialValue, E.mapLeft(eb), E.chain(bd))
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
  ): FiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither, initialValue) =>
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
              ),
            pipe(initialValue, E.mapLeft(eb), E.chain(bd))
          )
        )
    )
  }

  get get(): FIO<EB, B> {
    return this.use((value, getEither) => pipe(value.get, I.chain(flow(getEither, E.match(I.fail, I.succeed)))))
  }

  get initialValue(): E.Either<EB, B> {
    return this.use((_value, _getEither, _setEither, initialValue) => initialValue)
  }

  set(a: A): FIO<EA, void> {
    return this.use((value, _, setEither) =>
      pipe(
        value.modify((s) =>
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

  locally<R, EC, C>(use: IO<R, EC, C>, a: A): IO<R, EA | EC, C> {
    return this.use((value, _getEither, setEither) =>
      pipe(
        value.get,
        I.chain((old) =>
          pipe(
            setEither(a)(old),
            E.match(
              (e): IO<R, EA | EC, C> => I.fail(e),
              (s) =>
                pipe(
                  value.set(s),
                  I.bracket(
                    () => use,
                    () => value.set(old)
                  )
                )
            )
          )
        )
      )
    )
  }

  getWith<R, E, C>(f: (b: B) => IO<R, E, C>): IO<R, EB | E, C> {
    return pipe(this.get, I.chain(f))
  }
}

type Concrete<EA, EB, A, B> = Runtime<A> | Derived<EA, EB, A, B> | DerivedAll<EA, EB, A, B>

// @ts-expect-error
export function concrete<EA, EB, A, B>(_: FiberRef<EA, EB, A, B>): asserts _ is Concrete<EA, EB, A, B> {
  //
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (a0: A, a1: A) => A = (_, a) => a
): Runtime<A> {
  return new Runtime(initial, fork, join)
}

export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (a: A, a1: A) => A = (_, a) => a
): UIO<Runtime<A>> {
  return I.defer(() => {
    const ref = unsafeMake(initial, fork, join)
    return pipe(ref, update(identity), I.as(ref))
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function modify_<EA, EB, A, B>(fiberRef: FiberRef<EA, EB, A, A>, f: (a: A) => readonly [B, A]): FIO<EA | EB, B> {
  concrete(fiberRef)
  return matchTag_(fiberRef, {
    Runtime: (_) => _.modify(f),
    Derived: (_) =>
      _.use((value, getEither, setEither) =>
        pipe(
          value.modify((s) =>
            pipe(
              getEither(s),
              E.match(
                (e) => tuple(E.left(e), s),
                (a1) => {
                  const [b, a2] = f(a1)
                  return pipe(
                    setEither(a2),
                    E.match(
                      (e) => tuple(E.left<EA | EB, B>(e), s),
                      (s) => tuple(E.right(b), s)
                    )
                  )
                }
              )
            )
          ),
          I.subsumeEither
        )
      ),
    DerivedAll: (_) =>
      _.use((value, getEither, setEither) =>
        pipe(
          value.modify((s) =>
            pipe(
              getEither(s),
              E.match(
                (e) => tuple(E.left(e), s),
                (a1) => {
                  const [b, a2] = f(a1)
                  return pipe(
                    setEither(a2)(s),
                    E.match(
                      (e) => tuple(E.left<EA | EB, B>(e), s),
                      (s) => tuple(E.right(b), s)
                    )
                  )
                }
              )
            )
          ),
          I.subsumeEither
        )
      )
  })
}

export function modify<A, B>(f: (a: A) => [B, A]): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA | EB, B> {
  return (fr) => modify_(fr, f)
}

export function update_<EA, EB, A>(fiberRef: FiberRef<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, void> {
  return modify_(fiberRef, (a) => [undefined, f(a)])
}

export function update<A>(f: (a: A) => A): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA | EB, void> {
  return (fr) => update_(fr, f)
}

export function set_<EA, EB, A>(fiberRef: FiberRef<EA, EB, A, A>, a: A): FIO<EA, void> {
  return fiberRef.set(a)
}

export function set<A>(a: A): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA, void> {
  return (fr) => set_(fr, a)
}

export function get<EA, EB, A, B>(fiberRef: FiberRef<EA, EB, A, B>): FIO<EB, B> {
  return fiberRef.get
}

export function getAndSet_<EA, EB, A>(fiberRef: FiberRef<EA, EB, A, A>, a: A): FIO<EA | EB, A> {
  return modify_(fiberRef, (v) => [v, a])
}

export function getAndSet<A>(a: A): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA | EB, A> {
  return (fr) => getAndSet_(fr, a)
}

export function getAndUpdate_<EA, EB, A>(fiberRef: FiberRef<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, A> {
  return modify_(fiberRef, (a) => [a, f(a)])
}

export function getAndUpdate<A>(f: (a: A) => A): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA | EB, A> {
  return (fr) => getAndUpdate_(fr, f)
}

export function getAndUpdateJust_<EA, EB, A>(
  fiberRef: FiberRef<EA, EB, A, A>,
  f: (a: A) => M.Maybe<A>
): FIO<EA | EB, A> {
  return modify_(fiberRef, (a) => [a, M.getOrElse_(f(a), () => a)])
}

export function getAndUpdateJust<A>(
  f: (a: A) => M.Maybe<A>
): <EA, EB>(fiberRef: FiberRef<EA, EB, A, A>) => FIO<EA | EB, A> {
  return (fr) => getAndUpdateJust_(fr, f)
}

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export function locally_<EA, EB, A, B, R1, E1, C>(
  fiberRef: FiberRef<EA, EB, A, B>,
  value: A,
  use: IO<R1, E1, C>
): I.IO<R1, EA | E1, C> {
  return fiberRef.locally(use, value)
}

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export function locally<A, R1, E1, C>(
  value: A,
  use: IO<R1, E1, C>
): <EA, EB, B>(fiberRef: FiberRef<EA, EB, A, B>) => IO<R1, EA | E1, C> {
  return (fiberRef) => locally_(fiberRef, value, use)
}

export function getWith_<EA, EB, A, B, R, E, C>(
  fiberRef: FiberRef<EA, EB, A, B>,
  f: (b: B) => I.IO<R, E, C>
): I.IO<R, EB | E, C> {
  return fiberRef.getWith(f)
}

export function getWith<B, R, E, C>(
  f: (b: B) => I.IO<R, E, C>
): <EA, EB, A>(fiberRef: FiberRef<EA, EB, A, B>) => I.IO<R, EB | E, C> {
  return (fiberRef) => fiberRef.getWith(f)
}
