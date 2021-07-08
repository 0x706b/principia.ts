import type * as HKT from '@principia/base/HKT'
import type { None, Option, Some } from '@principia/base/Option'
import type * as P from '@principia/base/prelude'
import type { These } from '@principia/base/These'

interface OptionOps<A> {
  /**
   * @rewrite align_ from "@principia/base/Option"
   */
  align<A, B>(this: Option<A>, that: Option<B>): Option<These<A, B>>

  /**
   * @rewrite alignWith_ from "@principia/base/Option"
   */
  alignWith<A, B, C>(this: Option<A>, that: Option<B>, f: (_: These<A, B>) => C): Option<C>

  /**
   * @rewrite alt_ from "@principia/base/Option"
   */
  alt<A>(this: Option<A>, that: () => Option<A>): Option<A>

  /**
   * @rewrite _ap from "@principia/base/Option"
   */
  ap<A, B>(this: Option<A>, fab: Option<(a: A) => B>): Option<B>

  /**
   * @rewrite chain_ from "@principia/base/Option"
   */
  chain<A, B>(this: Option<A>, f: (a: A) => Option<B>): Option<B>

  /**
   * @rewrite chainNullableK_ from "@principia/base/Option"
   */
  chainNullableK<A, B>(this: Option<A>, f: (a: A) => B | null | undefined): Option<B>

  /**
   * @rewrite cross_ from "@principia/base/Option"
   */
  cross<A, B>(this: Option<A>, that: Option<B>): Option<readonly [A, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Option"
   */
  crossWith<A, B, C>(this: Option<A>, that: Option<B>, f: (a: A, b: B) => C): Option<C>

  /**
   * @rewrite getOrElse_ from "@principia/base/Option"
   */
  getOrElse<A, B>(this: Option<A>, f: () => B): A | B

  /**
   * @rewrite isNone from "@principia/base/Option"
   */
  isNone<A>(this: Option<A>): this is None

  /**
   * @rewrite isSome from "@principia/base/Option"
   */
  isSome<A>(this: Option<A>): this is Some<A>

  /**
   * @rewrite map_ from "@principia/base/Option"
   */
  map<A, B>(this: Option<A>, f: (a: A) => B): Option<B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Option"
   */
  mapA<A, F extends HKT.URIS, C = HKT.Auto>(
    this: Option<A>,
    A: P.Applicative<F, C>
  ): <N extends string, K, Q, W, X, I, S, R, E, B>(
    f: (a: A) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Option<B>>

  /**
   * @rewrite match_ from "@principia/base/Option"
   */
  match<A, B, C>(this: Option<A>, onNone: () => B, onSome: (a: A) => C): B | C

  /**
   * @rewrite tap_ from "@principia/base/Option"
   */
  tap<A, B>(this: Option<A>, f: (a: A) => Option<B>): Option<A>

  /**
   * @rewriteGetter toUndefined from "@principia/base/Option"
   */
  value: A | undefined
}

declare module '@principia/base/internal/Option' {
  interface Some<A> extends OptionOps<A> {}
  interface None extends OptionOps<never> {}
}
