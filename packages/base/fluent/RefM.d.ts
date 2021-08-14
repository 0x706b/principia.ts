import type { Either } from '@principia/base/Either'
import type { IO } from '@principia/base/IO'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/prelude'

declare module '@principia/base/IO/RefM' {
  export interface RefM<RA, RB, EA, EB, A, B> {
    /**
     * Maps and filters the `get` value of the `RefM` with the specified partial
     * function, returning a `RefM` with a `get` value that succeeds with the
     * result of the partial function if it is defined or else fails with `None`.
     *
     * @rewrite collect_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    collect<RA, RB, EA, EB, A, B, C>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (b: B) => Option<C>
    ): RefM<RA, RB, EA, Option<EB>, A, C>

    /**
     * Maps and filters the `get` value of the `RefM` with the specified
     * effectual partial function, returning a `RefM` with a `get` value that
     * succeeds with the result of the partial function if it is defined or else
     * fails with `None`.
     *
     * @rewrite collectIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    collectIO<RA, RB, EA, EB, A, B, RC, EC, C>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (b: B) => Option<IO<RC, EC, C>>
    ): RefM<RA, RB & RC, EA, Option<EC | EB>, A, C>

    /**
     * Transforms the `set` value of the `RefM` with the specified function.
     *
     * @rewrite contramap_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    contramap<RA, RB, EA, EB, A, B, C>(this: RefM<RA, RB, EA, EB, A, B>, f: (_: C) => A): RefM<RA, RB, EA, EB, C, B>

    /**
     * Transforms the `set` value of the `RefM` with the specified effectful
     * function.
     *
     * @rewrite contramapIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    contramapIO<RA, RB, EA, EB, A, B, RC, EC, C>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (_: C) => IO<RC, EC, A>
    ): RefM<RA & RC, RB, EC | EA, EB, C, B>

    /**
     * Transforms both the `set` and `get` errors of the `RefM` with the
     * specified functions.
     *
     * @rewrite dimapError_ from "@principia/base/IO/RefM"
     * @trace 0
     * @trace 1
     */
    dimapError<RA, RB, EA, EB, A, B, EC, ED>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (_: EA) => EC,
      g: (_: EB) => ED
    ): RefM<RA, RB, EC, ED, A, B>

    /**
     * Transforms both the `set` and `get` values of the `RefM` with the
     * specified effectual functions.
     *
     * @rewrite dimapIO_ from "@principia/base/IO/RefM"
     * @trace 0
     * @trace 1
     */
    dimapIO<RA, RB, EA, EB, A, B, RC, EC, C, RD, ED, D>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (_: C) => IO<RC, EC, A>,
      g: (_: B) => IO<RD, ED, D>
    ): RefM<RA & RC, RB & RD, EA | EC, EB | ED, C, D>

    /**
     * Filters the `set` value of the `RefM` with the specified
     * predicate, returning a `RefM` with a `set` value that succeeds if the
     * predicate is satisfied or else fails with `None`.
     *
     * @rewrite filterInput_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    filterInput<RA, RB, EA, EB, A, B, A1 extends A>(
      this: RefM<RA, RB, EA, EB, A, B>,
      predicate: Predicate<A1>
    ): RefM<RA, RB, Option<EA>, EB, A1, B>

    /**
     * Filters the `set` value of the `RefM` with the specified effectful
     * predicate, returning a `RefM` with a `set` value that succeeds if the
     * predicate is satisfied or else fails with `None`.
     *
     * @rewrite filterInputIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    filterInputIO<RA, RB, EA, EB, A, B, RC, EC, A1 extends A>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (a: A1) => IO<RC, EC, boolean>
    ): RefM<RA & RC, RB, Option<EC | EA>, EB, A1, B>

    /**
     * Filters the `get` value of the `RefM` with the specified predicate,
     * returning a `RefM` with a `get` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterOutput_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    filterOutput(predicate: Predicate<B>): RefM<RA, RB, EA, Option<EB>, A, B>

    /**
     * Filters the `get` value of the `RefM` with the specified effectual predicate,
     * returning a `RefM` with a `get` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterOutputIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    filterOutputIO<RA, RB, EA, EB, A, B, RC, EC>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (b: B) => IO<RC, EC, boolean>
    ): RefM<RA, RB & RC, EA, Option<EB | EC>, A, B>

    /**
     * Reads the value from the `RefM`.
     *
     * @rewriteGetter get from "@principia/base/IO/RefM"
     * @trace getter
     */
    readonly get: IO<RB, EB, B>

    /**
     * Writes a new value to the `RefM`, returning the value immediately before
     * modification.
     *
     * @rewrite getAndSet_ from "@principia/base/IO/RefM"
     * @trace call
     */
    getAndSet<RA, RB, EA, EB, A>(this: RefM<RA, RB, EA, EB, A, A>, a: A): IO<RA & RB, EA | EB, A>

    /**
     * @rewrite getAndUpdateIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    getAndUpdateIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => IO<R1, E1, A>
    ): IO<RA & RB & R1, EA | EB | E1, A>

    /**
     * @rewrite getAndUpdateSomeIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    getAndUpdateSomeIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => Option<IO<R1, E1, A>>
    ): IO<RA & RB & R1, EA | EB | E1, A>

    /**
     * Transforms the `get` value of the `RefM` with the specified function.
     *
     * @rewrite map_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    map<RA, RB, EA, EB, A, B, C>(this: RefM<RA, RB, EA, EB, A, B>, f: (b: B) => C): RefM<RA, RB, EA, EB, A, C>

    /**
     * Transforms the `get` value of the `RefM` with the specified effectful
     * function.
     *
     * @rewrite mapIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    mapIO<RA, RB, EA, EB, A, B, RC, EC, C>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (b: B) => IO<RC, EC, C>
    ): RefM<RA, RB & RC, EA, EB | EC, A, C>

    /**
     * Folds over the error and value types of the `RefM`. This is a highly
     * polymorphic method that is capable of arbitrarily transforming the error
     * and value types of the `RefM`. For most use cases one of the more
     * specific combinators implemented in terms of `matchM` will be more
     * ergonomic but this method is extremely useful for implementing new
     * combinators.
     *
     * @rewrite match_ from "@principia/base/IO/RefM"
     * @trace 0
     * @trace 1
     * @trace 2
     * @trace 3
     */
    readonly match: <EC, ED, C, D>(
      ea: (_: EA) => EC,
      eb: (_: EB) => ED,
      ca: (_: C) => Either<EC, A>,
      bd: (_: B) => Either<ED, D>
    ) => RefM<RA, RB, EC, ED, C, D>

    /**
     * Folds over the error and value types of the `RefM`, allowing access to
     * the state in transforming the `set` value. This is a more powerful version
     * of `matchIO` but requires unifying the environment and error types.
     *
     * @rewrite matchAllIO_ from "@principia/base/IO/RefM"
     * @trace 0
     * @trace 1
     * @trace 2
     * @trace 3
     * @trace 4
     */
    readonly matchAllIO: <RC, RD, EC, ED, C, D>(
      ea: (_: EA) => EC,
      eb: (_: EB) => ED,
      ec: (_: EB) => EC,
      ca: (_: C) => (_: B) => IO<RC, EC, A>,
      bd: (_: B) => IO<RD, ED, D>
    ) => RefM<RB & RA & RC, RB & RD, EC, ED, C, D>

    /**
     * Folds over the error and value types of the `RefM`. This is a highly
     * polymorphic method that is capable of arbitrarily transforming the error
     * and value types of the `RefM`. For most use cases one of the more
     * specific combinators implemented in terms of `matchM` will be more
     * ergonomic but this method is extremely useful for implementing new
     * combinators.
     *
     * @rewrite matchIO_ from "@principia/base/IO/RefM"
     * @trace 0
     * @trace 1
     * @trace 2
     * @trace 3
     */
    readonly matchIO: <RC, RD, EC, ED, C, D>(
      ea: (_: EA) => EC,
      eb: (_: EB) => ED,
      ca: (_: C) => IO<RC, EC, A>,
      bd: (_: B) => IO<RD, ED, D>
    ) => RefM<RA & RC, RB & RD, EC, ED, C, D>

    /**
     * Atomically modifies the `RefM` with the specified function, which computes
     * a return value for the modification. This is a more powerful version of
     * `update`.
     *
     * @rewrite modifyIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    modifyIO<RA, RB, EA, EB, A, B, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => IO<R1, E1, readonly [B, A]>
    ): IO<RA & RB & R1, EA | EB | E1, B>

    /**
     * Atomically modifies the `RefM` with the specified function, which computes
     * a return value for the modification if the function is defined in the current value
     * otherwise it returns a default value.
     * This is a more powerful version of `updateSome`.
     *
     * @rewrite modifySomeIO_ from "@principia/base/IO/RefM"
     * @trace 1
     */
    modifySomeIO<RA, RB, EA, EB, A, R1, E1, B>(
      this: RefM<RA, RB, EA, EB, A, A>,
      def: B,
      f: (a: A) => Option<IO<R1, E1, readonly [B, A]>>
    ): IO<RA & RB & R1, EA | EB | E1, B>

    /**
     * Writes a new value to the `RefM`, with a guarantee of immediate
     * consistency (at some cost to performance).
     *
     * @rewrite set_ from "@principia/base/IO/RefM"
     * @trace call
     */
    readonly set: (a: A) => IO<RA, EA, void>

    /**
     * Performs the specified effect every time a value is written to this
     * `RefM`.
     *
     * @rewrite tapInput_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    tapInput<RA, RB, EA, EB, A, B, RC, EC>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (a: A) => IO<RC, EC, any>
    ): RefM<RA & RC, RB, EA | EC, EB, A, B>

    /**
     * Performs the specified effect every time a value is read from this
     * `RefM`.
     *
     * @rewrite tapOutput_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    tapOutput<RA, RB, EA, EB, A, B, RC, EC>(
      this: RefM<RA, RB, EA, EB, A, B>,
      f: (b: B) => IO<RC, EC, any>
    ): RefM<RA, RB & RC, EA, EB | EC, A, B>

    /**
     * @rewrite updateAndGetIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    updateAndGetIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => IO<R1, E1, A>
    ): IO<RA & RB & R1, EA | EB | E1, A>

    /**
     * @rewrite updateIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    updateIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => IO<R1, E1, A>
    ): IO<RA & RB & R1, EA | EB | E1, void>

    /**
     * @rewrite updateSomeAndGetIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    updateSomeAndGetIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => Option<IO<R1, E1, A>>
    ): IO<RA & RB & R1, EA | EB | E1, A>

    /**
     * @rewrite updateSomeIO_ from "@principia/base/IO/RefM"
     * @trace 0
     */
    updateSomeIO<RA, RB, EA, EB, A, R1, E1>(
      this: RefM<RA, RB, EA, EB, A, A>,
      f: (a: A) => Option<IO<R1, E1, A>>
    ): IO<RA & RB & R1, EA | EB | E1, void>
  }
}
