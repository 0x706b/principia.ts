import type { Either } from '@principia/base/Either'
import type { IO } from '@principia/base/IO'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/prelude'
import type * as R from '@principia/base/Ref'

declare module '@principia/base/Ref' {
  export interface Ref<EA, EB, A, B> {
    /**
     * Transforms the `set` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite contramap_ from "@principia/base/Ref"
     * @trace 0
     */
    contramap<C>(f: (_: C) => A): R.Ref<EA, EB, C, B>

    /**
     * Transforms the `set` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite contramapEither_ from "@principia/base/Ref"
     * @trace 0
     */
    contramapEither<EC, C>(f: (_: C) => Either<EC, A>): R.Ref<EA | EC, EB, C, B>

    /**
     * Transforms both the `set` and `get` values of the `Ref` with the
     * specified functions.
     *
     * @rewrite dimap_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimap<C, D>(f: (_: C) => A, g: (_: B) => D): R.Ref<EA, EB, C, D>

    /**
     * Transforms both the `set` and `get` values of the `Ref` with the
     * specified fallible functions.
     *
     * @rewrite dimapEither_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimapEither<EC, C, ED, D>(f: (_: C) => Either<EC, A>, g: (_: B) => Either<ED, D>): R.Ref<EC | EA, ED | EB, C, D>

    /**
     * Transforms both the `set` and `get` errors of the `Ref` with the
     * specified functions.
     *
     * @rewrite dimapError_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimapError<EC, ED>(f: (_: EA) => EC, g: (_: EB) => ED): R.Ref<EC, ED, A, B>

    /**
     * Filters the `set` value of the `Ref` with the specified predicate,
     * returning a `Ref` with a `set` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterInput_ from "@principia/base/Ref"
     * @trace 0
     */
    filterInput<A1 extends A>(predicate: Predicate<A1>): R.Ref<Option<EA>, EB, A1, B>

    /**
     * Maps and filters the `get` value of the `Ref` with the specified partial
     * function, returning a `Ref` with a `get` value that succeeds with the
     * result of the partial function if it is defined or else fails with `None`.
     *
     * @rewrite collect_ from "@principia/base/Ref"
     * @trace 0
     */
    filterMap<C>(f: (_: B) => Option<C>): R.Ref<EA, Option<EB>, A, C>

    /**
     * Filters the `get` value of the `Ref` with the specified predicate,
     * returning a `Ref` with a `get` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterOutput_ from "@principia/base/Ref"
     * @trace 0
     */
    filterOutput(predicate: Predicate<B>): R.Ref<EA, Option<EB>, A, B>

    /**
     * Reads the value from the `Ref`.
     *
     * @rewriteGetter get from "@principia/base/Ref"
     * @trace getter
     */
    readonly get: IO<unknown, EB, B>

    /**
     * Atomically writes the specified value to the `Ref`, returning the value
     * immediately before modification.
     *
     * @rewrite getAndSet_ from "@principia/base/Ref"
     * @trace call
     */
    getAndSet<EA, EB, A>(this: R.Ref<EA, EB, A, A>, value: A): IO<unknown, EA | EB, A>

    /**
     * Atomically modifies the `Ref` with the specified function, returning
     * the value immediately before modification.
     *
     * @rewrite getAndUpdate_ from "@principia/base/Ref"
     * @trace 0
     */
    getAndUpdate<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => A): IO<unknown, EA | EB, A>

    /**
     * Atomically modifies the `Ref` with the specified partial function,
     * returning the value immediately before modification. If the function is
     * undefined on the current value it doesn't change it.
     *
     * @rewrite getAndUpdateSome_ from "@principia/base/Ref"
     * @trace 0
     */
    getAndUpdateSome<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Option<A>): IO<unknown, EA | EB, A>

    /**
     * Transforms the `get` value of the `Ref` with the specified function.
     *
     * @rewrite map_ from "@principia/base/Ref"
     * @trace 0
     */
    map<C>(f: (b: B) => C): R.Ref<EA, EB, A, C>

    /**
     * Transforms the `get` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite mapEither_ from "@principia/base/Ref"
     * @trace 0
     */
    mapEither<EC, C>(f: (_: B) => Either<EC, C>): R.Ref<EA, EB | EC, A, C>

    /**
     * Atomically modifies the `Ref` with the specified function, which
     * computes a return value for the modification. This is a more powerful
     * version of `update`.
     *
     * @rewrite modify_ from "@principia/base/Ref"
     * @trace 0
     */
    modify<EA, EB, A, B>(this: R.Ref<EA, EB, A, A>, f: (a: A) => readonly [B, A]): IO<unknown, EA | EB, B>

    /**
     * Atomically modifies the `Ref` with the specified partial function,
     * which computes a return value for the modification if the function is
     * defined on the current value otherwise it returns a default value. This
     * is a more powerful version of `updateSome`.
     *
     * @rewrite modifySome_ from "@principia/base/Ref"
     * @trace 1
     */
    modifySome<EA, EB, A, B>(
      this: R.Ref<EA, EB, A, A>,
      def: B,
      f: (a: A) => Option<readonly [B, A]>
    ): IO<unknown, EA | EB, B>

    /**
     * Writes a new value to the `Ref`, with a guarantee of immediate
     * consistency (at some cost to performance).
     *
     * @rewrite set_ from "@principia/base/Ref"
     * @trace call
     */
    readonly set: (a: A) => IO<unknown, EA, void>

    /**
     * Atomically modifies the `Ref` with the specified function.
     *
     * @rewrite update_ from "@principia/base/Ref"
     * @trace 0
     */
    update<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => A): IO<unknown, EA | EB, void>

    /**
     * Atomically modifies the `Ref` with the specified function and returns
     * the updated value.
     *
     * @rewrite updateAndGet_ from "@principia/base/Ref"
     * @trace 0
     */
    updateAndGet<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => A): IO<unknown, EA | EB, A>

    /**
     * Atomically modifies the `Ref` with the specified partial function. If
     * the function is undefined on the current value it doesn't change it.
     *
     * @rewrite updateSome_ from "@principia/base/Ref"
     * @trace 0
     */
    updateSome<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Option<A>): IO<unknown, EA | EB, void>

    /**
     * Atomically modifies the `Ref` with the specified partial function. If
     * the function is undefined on the current value it returns the old value
     * without changing it.
     *
     * @rewrite updateSomeAndGet_ from "@principia/base/Ref"
     * @trace 0
     */
    updateSomeAndGet<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Option<A>): IO<unknown, EA | EB, A>
  }
}
