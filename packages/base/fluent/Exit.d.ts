import type { Cause, GenericCause } from '@principia/base/Cause'
import type { Exit } from '@principia/base/Exit'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/prelude'

export interface ExitOps<Id, E, A> {
  /**
   * @rewrite chain_ from "@principia/base/Exit"
   */
  chain<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    f: (a: A) => GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, B>

  /**
   * @rewrite cross_ from "@principia/base/Exit"
   */
  cross<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossFirst_ from "@principia/base/Exit"
   */
  crossFirst<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, A>

  /**
   * @rewrite crossFirstPar_ from "@principia/base/Exit"
   */
  crossFirstPar<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, A>

  /**
   * @rewrite crossPar_ from "@principia/base/Exit"
   */
  crossPar<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossSecond_ from "@principia/base/Exit"
   */
  crossSecond<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, B>

  /**
   * @rewrite crossSecondPar_ from "@principia/base/Exit"
   */
  crossSecondPar<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, B>

  /**
   * @rewrite crossWith_ from "@principia/base/Exit"
   */
  crossWith<Id, E, A, Id1, E1, B, C>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>,
    f: (a: A, b: B) => C
  ): GenericExit<Id | Id1, E | E1, C>

  /**
   * @rewrite crossWithCause_ from "@principia/base/Exit"
   */
  crossWithCause<Id, E, A, Id1, E1, B, C>(
    this: GenericExit<Id, E, A>,
    that: GenericExit<Id1, E1, B>,
    f: (a: A, b: B) => C,
    g: (ca: GenericCause<Id, E>, cb: GenericCause<Id1, E1>) => GenericCause<Id | Id1, E | E1>
  ): GenericExit<Id | Id1, E | E1, C>

  /**
   * @rewrite exists_ from "@principia/base/Exit"
   */
  exists<Id, E, A>(this: GenericExit<Id, E, A>, predicate: Predicate<A>): boolean

  /**
   * @rewrite map_ from "@principia/base/Exit"
   */
  map<Id, E, A, B>(this: GenericExit<Id, E, A>, f: (a: A) => B): GenericExit<Id, E, B>

  /**
   * @rewrite match_ from "@principia/base/Exit"
   */
  match<Id, E, A, B, C>(
    this: GenericExit<Id, E, A>,
    onFailure: (e: GenericCause<Id, E>) => B,
    onSuccess: (a: A) => C
  ): B | C

  /**
   * @rewrite matchIO_ from "@principia/base/Exit"
   */
  matchIO<E, A, R1, E1, B, R2, E2, C>(
    this: GenericExit<Id, E, A>,
    onFailure: (e: GenericCause<Id, E>) => IO<R1, E1, B>,
    onSuccess: (a: A) => IO<R2, E2, C>
  ): IO<R1 & R2, E1 | E2, B | C>

  /**
   * @rewrite tap_ from "@principia/base/Exit"
   */
  tap<Id, E, A, Id1, E1, B>(
    this: GenericExit<Id, E, A>,
    f: (a: A) => GenericExit<Id1, E1, B>
  ): GenericExit<Id | Id1, E | E1, A>

  /**
   * @rewrite untraced from "@principia/base/Exit"
   */
  untraced<Id, E, A>(this: GenericExit<Id, E, A>): GenericExit<Id, E, A>
}

declare module '@principia/base/Exit/generic' {
  export interface Success<A> extends ExitOps<never, never, A> {}
  export interface Failure<Id, E> extends ExitOps<Id, E, never> {}
}
