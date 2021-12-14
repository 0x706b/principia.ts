import type { Either } from '@principia/base/Either'
import type { IO } from '@principia/base/IO'
import type { Maybe } from '@principia/base/Maybe'
import type { Predicate } from '@principia/base/prelude'
import type * as R from '@principia/base/Ref'

declare global {
  export const Ref: RefStaticOps
  export interface Ref<EA, EB, A, B> extends R.Ref<EA, EB, A, B> {}
  export interface FRef<E, A> extends R.Ref<E, E, A, A> {}
  export interface URef<A> extends R.Ref<never, never, A, A> {}
}

export interface RefStaticOps {
  /**
   * @rewriteStatic make from "@principia/base/Ref"
   */
  make: typeof R.make
  /**
   * @rewriteStatic unsafeMake from "@principia/base/Ref"
   */
  unsafeMake: typeof R.unsafeMake
}

declare module '@principia/base/Ref/core' {
  export interface Ref<EA, EB, A, B> {
    /**
     * Transforms the `set` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite contramap_ from "@principia/base/Ref"
     * @trace 0
     */
    contramap<EA, EB, A, B, C>(this: R.Ref<EA, EB, A, B>, f: (_: C) => A): R.Ref<EA, EB, C, B>

    /**
     * Transforms the `set` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite contramapEither_ from "@principia/base/Ref"
     * @trace 0
     */
    contramapEither<EA, EB, A, B, EC, C>(
      this: R.Ref<EA, EB, A, B>,
      f: (_: C) => Either<EC, A>
    ): R.Ref<EA | EC, EB, C, B>

    /**
     * Transforms both the `set` and `get` values of the `Ref` with the
     * specified functions.
     *
     * @rewrite dimap_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimap<EA, EB, A, B, C, D>(this: R.Ref<EA, EB, A, B>, f: (_: C) => A, g: (_: B) => D): R.Ref<EA, EB, C, D>

    /**
     * Transforms both the `set` and `get` values of the `Ref` with the
     * specified fallible functions.
     *
     * @rewrite dimapEither_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimapEither<EA, EB, A, B, EC, C, ED, D>(
      this: R.Ref<EA, EB, A, B>,
      f: (_: C) => Either<EC, A>,
      g: (_: B) => Either<ED, D>
    ): R.Ref<EC | EA, ED | EB, C, D>

    /**
     * Transforms both the `set` and `get` errors of the `Ref` with the
     * specified functions.
     *
     * @rewrite dimapError_ from "@principia/base/Ref"
     * @trace 0
     * @trace 1
     */
    dimapError<EA, EB, A, B, EC, ED>(this: R.Ref<EA, EB, A, B>, f: (_: EA) => EC, g: (_: EB) => ED): R.Ref<EC, ED, A, B>

    /**
     * Filters the `set` value of the `Ref` with the specified predicate,
     * returning a `Ref` with a `set` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterInput_ from "@principia/base/Ref"
     * @trace 0
     */
    filterInput<EA, EB, A, B, A1 extends A>(
      this: R.Ref<EA, EB, A, B>,
      predicate: Predicate<A1>
    ): R.Ref<Maybe<EA>, EB, A1, B>

    /**
     * Maps and filters the `get` value of the `Ref` with the specified partial
     * function, returning a `Ref` with a `get` value that succeeds with the
     * result of the partial function if it is defined or else fails with `None`.
     *
     * @rewrite collect_ from "@principia/base/Ref"
     * @trace 0
     */
    filterMap<EA, EB, A, B, C>(this: R.Ref<EA, EB, A, B>, f: (_: B) => Maybe<C>): R.Ref<EA, Maybe<EB>, A, C>

    /**
     * Filters the `get` value of the `Ref` with the specified predicate,
     * returning a `Ref` with a `get` value that succeeds if the predicate is
     * satisfied or else fails with `None`.
     *
     * @rewrite filterOutput_ from "@principia/base/Ref"
     * @trace 0
     */
    filterOutput<EA, EB, A, B>(this: R.Ref<EA, EB, A, B>, predicate: Predicate<B>): R.Ref<EA, Maybe<EB>, A, B>

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
     * @rewrite getAndUpdateJust_ from "@principia/base/Ref"
     * @trace 0
     */
    getAndUpdateJust<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Maybe<A>): IO<unknown, EA | EB, A>

    /**
     * Transforms the `get` value of the `Ref` with the specified function.
     *
     * @rewrite map_ from "@principia/base/Ref"
     * @trace 0
     */
    map<EA, EB, A, B, C>(this: R.Ref<EA, EB, A, B>, f: (b: B) => C): R.Ref<EA, EB, A, C>

    /**
     * Transforms the `get` value of the `Ref` with the specified fallible
     * function.
     *
     * @rewrite mapEither_ from "@principia/base/Ref"
     * @trace 0
     */
    mapEither<EA, EB, A, B, EC, C>(this: R.Ref<EA, EB, A, B>, f: (_: B) => Either<EC, C>): R.Ref<EA, EB | EC, A, C>

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
     * is a more powerful version of `updateJust`.
     *
     * @rewrite modifyJust_ from "@principia/base/Ref"
     * @trace 1
     */
    modifyJust<EA, EB, A, B>(
      this: R.Ref<EA, EB, A, A>,
      def: B,
      f: (a: A) => Maybe<readonly [B, A]>
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
     * @rewrite updateJust_ from "@principia/base/Ref"
     * @trace 0
     */
    updateJust<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Maybe<A>): IO<unknown, EA | EB, void>

    /**
     * Atomically modifies the `Ref` with the specified partial function. If
     * the function is undefined on the current value it returns the old value
     * without changing it.
     *
     * @rewrite updateJustAndGet_ from "@principia/base/Ref"
     * @trace 0
     */
    updateJustAndGet<EA, EB, A>(this: R.Ref<EA, EB, A, A>, f: (a: A) => Maybe<A>): IO<unknown, EA | EB, A>
  }
}
