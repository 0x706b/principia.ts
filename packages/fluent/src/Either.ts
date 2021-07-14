import type { Either, Left, Right } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type * as P from '@principia/base/prelude'

interface EitherOps<E, A> {
  /**
   * @rewrite _ap from "@principia/base/Either"
   */
  ap<E, A, E1, B>(this: Either<E, A>, fab: Either<E1, (a: A) => B>): Either<E | E1, B>

  /**
   * @rewrite bimap_ from "@principia/base/Either"
   */
  bimap<E, A, E1, B>(this: Either<E, A>, f: (e: E) => E1, g: (a: A) => B): Either<E1, B>

  /**
   * @rewrite catchAll_ from "@principia/base/Either"
   */
  catchAll<E, A, E1, B>(this: Either<E, A>, f: (e: E) => Either<E1, B>): Either<E1, A | B>

  /**
   * @rewrite catchSome_ from "@principia/base/Either"
   */
  catchSome<E, A, E1, B>(this: Either<E, A>, f: (e: E) => Option<Either<E1, B>>): Either<E | E1, A | B>

  /**
   * @rewrite chain_ from "@principia/base/Either"
   */
  chain<E, A, E1, B>(this: Either<E, A>, f: (a: A) => Either<E1, B>): Either<E | E1, B>

  /**
   * @rewrite cross_ from "@principia/base/Either"
   */
  cross<E, A, E1, B>(this: Either<E, A>, that: Either<E1, B>): Either<E | E1, readonly [A, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Either"
   */
  crossWith<E, A, E1, B, C>(this: Either<E, A>, that: Either<E1, B>, f: (a: A, b: B) => C): Either<E | E1, C>

  /**
   * @rewrite getLeft from "@principia/base/Option"
   */
  getLeft<E, A>(this: Either<E, A>): Option<E>

  /**
   * @rewrite getOrElse_ from "@principia/base/Either"
   */
  getOrElse<E, A, B>(this: Either<E, A>, onLeft: (e: E) => B): A | B

  /**
   * @rewrite getRight from "@principia/base/Option"
   */
  getRight<E, A>(this: Either<E, A>): Option<A>

  /**
   * @rewrite isLeft from "@principia/base/Either"
   */
  isLeft<E, A>(this: Either<E, A>): this is Left<E>

  /**
   * @rewrite isRight from "@principia/base/Either"
   */
  isRight<E, A>(this: Either<E, A>): this is Right<A>

  /**
   * @rewrite map_ from "@principia/base/Either"
   */
  map<E, A, B>(this: Either<E, A>, f: (a: A) => B): Either<E, B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Either"
   */
  mapA<E, A, F extends HKT.URIS, C = HKT.Auto>(
    this: Either<E, A>,
    A: P.Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E1, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, Either<E, B>>

  /**
   * @rewrite mapLeft_ from "@principia/base/Either"
   */
  mapLeft<E, A, E1>(this: Either<E, A>, f: (e: E) => E): Either<E1, A>

  /**
   * @rewrite match_ from "@principia/base/Either"
   */
  match<E, A, B, C>(this: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C

  /**
   * @rewrite swap from "@principia/base/Either"
   */
  swap<E, A>(this: Either<E, A>): Either<A, E>

  /**
   * @rewrite tap_ from "@principia/base/Either"
   */
  tap<E, A, E1, B>(this: Either<E, A>, f: (a: A) => Either<E1, B>): Either<E | E1, A>
}

declare module '@principia/base/internal/Either' {
  interface Left<E> extends EitherOps<E, never> {}
  interface Right<A> extends EitherOps<never, A> {}
}
