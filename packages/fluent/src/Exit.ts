import type { Cause } from '@principia/base/Cause'
import type { Exit } from '@principia/base/Exit'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/prelude'

export interface ExitOps<E, A> {
  /**
   * @rewrite chain_ from "@principia/base/Exit"
   */
  chain<E, A, E1, B>(this: Exit<E, A>, f: (a: A) => Exit<E1, B>): Exit<E | E1, B>

  /**
   * @rewrite cross_ from "@principia/base/Exit"
   */
  cross<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, readonly [A, B]>

  /**
   * @rewrite crossFirst_ from "@principia/base/Exit"
   */
  crossFirst<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, A>

  /**
   * @rewrite crossFirstPar_ from "@principia/base/Exit"
   */
  crossFirstPar<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, A>

  /**
   * @rewrite crossPar_ from "@principia/base/Exit"
   */
  crossPar<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, readonly [A, B]>

  /**
   * @rewrite crossSecond_ from "@principia/base/Exit"
   */
  crossSecond<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, B>

  /**
   * @rewrite crossSecondPar_ from "@principia/base/Exit"
   */
  crossSecondPar<E, A, E1, B>(this: Exit<E, A>, that: Exit<E1, B>): Exit<E | E1, B>

  /**
   * @rewrite crossWith_ from "@principia/base/Exit"
   */
  crossWith<E, A, E1, B, C>(this: Exit<E, A>, that: Exit<E1, B>, f: (a: A, b: B) => C): Exit<E | E1, C>

  /**
   * @rewrite crossWithCause_ from "@principia/base/Exit"
   */
  crossWithCause<E, A, E1, B, C>(
    this: Exit<E, A>,
    that: Exit<E1, B>,
    f: (a: A, b: B) => C,
    g: (ca: Cause<E>, cb: Cause<E1>) => Cause<E | E1>
  ): Exit<E | E1, C>

  /**
   * @rewrite exists_ from "@principia/base/Exit"
   */
  exists<E, A>(this: Exit<E, A>, predicate: Predicate<A>): boolean

  /**
   * @rewrite map_ from "@principia/base/Exit"
   */
  map<E, A, B>(this: Exit<E, A>, f: (a: A) => B): Exit<E, B>

  /**
   * @rewrite match_ from "@principia/base/Exit"
   */
  match<E, A, B, C>(this: Exit<E, A>, onFailure: (e: Cause<E>) => B, onSuccess: (a: A) => C): B | C

  /**
   * @rewrite matchIO_ from "@principia/base/Exit"
   */
  matchIO<E, A, R1, E1, B, R2, E2, C>(
    this: Exit<E, A>,
    onFailure: (e: Cause<E>) => IO<R1, E1, B>,
    onSuccess: (a: A) => IO<R2, E2, C>
  ): IO<R1 & R2, E1 | E2, B | C>

  /**
   * @rewrite tap_ from "@principia/base/Exit"
   */
  tap<E, A, E1, B>(this: Exit<E, A>, f: (a: A) => Exit<E1, B>): Exit<E | E1, A>

  /**
   * @rewrite untraced from "@principia/base/Exit"
   */
  untraced<E, A>(this: Exit<E, A>): Exit<E, A>
}

declare module '@principia/base/Exit/core' {
  export interface Success<A> extends ExitOps<never, A> {}
  export interface Failure<E> extends ExitOps<E, never> {}
}
