import type { PCause } from '@principia/base/Cause'
import type { PExit } from '@principia/base/Exit'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/prelude'

export interface ExitOps<Id, E, A> {
  /**
   * @rewrite chain_ from "@principia/base/Exit"
   */
  chain<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, f: (a: A) => PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, B>

  /**
   * @rewrite cross_ from "@principia/base/Exit"
   */
  cross<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, that: PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossFirst_ from "@principia/base/Exit"
   */
  crossFirst<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, that: PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, A>

  /**
   * @rewrite crossFirstPar_ from "@principia/base/Exit"
   */
  crossFirstPar<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, that: PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, A>

  /**
   * @rewrite crossPar_ from "@principia/base/Exit"
   */
  crossPar<Id, E, A, Id1, E1, B>(
    this: PExit<Id, E, A>,
    that: PExit<Id1, E1, B>
  ): PExit<Id | Id1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossSecond_ from "@principia/base/Exit"
   */
  crossSecond<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, that: PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, B>

  /**
   * @rewrite crossSecondPar_ from "@principia/base/Exit"
   */
  crossSecondPar<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, that: PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, B>

  /**
   * @rewrite crossWith_ from "@principia/base/Exit"
   */
  crossWith<Id, E, A, Id1, E1, B, C>(
    this: PExit<Id, E, A>,
    that: PExit<Id1, E1, B>,
    f: (a: A, b: B) => C
  ): PExit<Id | Id1, E | E1, C>

  /**
   * @rewrite crossWithCause_ from "@principia/base/Exit"
   */
  crossWithCause<Id, E, A, Id1, E1, B, C>(
    this: PExit<Id, E, A>,
    that: PExit<Id1, E1, B>,
    f: (a: A, b: B) => C,
    g: (ca: PCause<Id, E>, cb: PCause<Id1, E1>) => PCause<Id | Id1, E | E1>
  ): PExit<Id | Id1, E | E1, C>

  /**
   * @rewrite exists_ from "@principia/base/Exit"
   */
  exists<Id, E, A>(this: PExit<Id, E, A>, predicate: Predicate<A>): boolean

  /**
   * @rewrite map_ from "@principia/base/Exit"
   */
  map<Id, E, A, B>(this: PExit<Id, E, A>, f: (a: A) => B): PExit<Id, E, B>

  /**
   * @rewrite match_ from "@principia/base/Exit"
   */
  match<Id, E, A, B, C>(this: PExit<Id, E, A>, onFailure: (e: PCause<Id, E>) => B, onSuccess: (a: A) => C): B | C

  /**
   * @rewrite matchIO_ from "@principia/base/Exit"
   */
  matchIO<E, A, R1, E1, B, R2, E2, C>(
    this: PExit<Id, E, A>,
    onFailure: (e: PCause<Id, E>) => IO<R1, E1, B>,
    onSuccess: (a: A) => IO<R2, E2, C>
  ): IO<R1 & R2, E1 | E2, B | C>

  /**
   * @rewrite tap_ from "@principia/base/Exit"
   */
  tap<Id, E, A, Id1, E1, B>(this: PExit<Id, E, A>, f: (a: A) => PExit<Id1, E1, B>): PExit<Id | Id1, E | E1, A>

  /**
   * @rewrite untraced from "@principia/base/Exit"
   */
  untraced<Id, E, A>(this: PExit<Id, E, A>): PExit<Id, E, A>
}

declare module '@principia/base/Exit/core' {
  export interface Success<A> extends ExitOps<never, never, A> {}
  export interface Failure<Id, E> extends ExitOps<Id, E, never> {}
}
