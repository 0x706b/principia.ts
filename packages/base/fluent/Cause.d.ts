import type { Halt, PCause, Renderer } from '@principia/base/Cause'
import type * as C from '@principia/base/Cause'
import type { Either } from '@principia/base/Either'
import type { FiberId } from '@principia/base/Fiber'
import type { Trace } from '@principia/base/Fiber/trace'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

interface CauseStaticOps {
  /**
   * @rewriteStatic both from "@principia/base/Cause"
   */
  Both: typeof C.both
  /**
   * @rewriteStatic empty from "@principia/base/Cause"
   */
  Empty: typeof C.empty
  /**
   * @rewriteStatic fail from "@principia/base/Cause"
   */
  Fail: typeof C.fail
  /**
   * @rewriteStatic halt from "@principia/base/Cause"
   */
  Halt: typeof C.halt
  /**
   * @rewriteStatic interrupt from "@principia/base/Cause"
   */
  Interrupt: typeof C.interrupt
  /**
   * @rewriteStatic then from "@principia/base/Cause"
   */
  Then: typeof C.then
  /**
   * @rewriteStatic traced from "@principia/base/Cause"
   */
  Traced: typeof C.traced
  /**
   * @rewriteStatic pure from "@principia/base/Cause"
   */
  pure: typeof C.pure
}

export interface CauseOps {
  /**
   * @rewrite chain_ from "@principia/base/Cause"
   */
  chain<Id, A, Id1, B>(this: PCause<Id, A>, f: (a: A) => PCause<Id1, B>): PCause<Id | Id1, B>

  /**
   * @rewrite defects from "@principia/base/Cause"
   */
  defects<Id, E>(this: PCause<Id, E>): ReadonlyArray<unknown>

  /**
   * @rewrite equals from "@principia/base/Cause"
   */
  equals<Id, E>(this: PCause<Id, E>, that: PCause<Id, E>): boolean

  /**
   * @rewrite failed from "@principia/base/Cause"
   */
  failed<Id, E>(this: PCause<Id, E>): boolean

  /**
   * @rewrite failureOption from "@principia/base/Cause"
   */
  failureOption<Id, E>(this: PCause<Id, E>): Option<E>

  /**
   * @rewrite failureOrCause from "@principia/base/Cause"
   */
  failureOrCause<Id, E>(this: PCause<Id, E>): Either<E, PCause<Id, never>>

  /**
   * @rewrite failureTraceOption from "@principia/base/Cause"
   */
  failureTraceOption<Id, E>(this: PCause<Id, E>): Option<readonly [E, Option<Trace>]>

  /**
   * @rewrite failureTraceOrCause from "@principia/base/Cause"
   */
  failureTraceOrCause<Id, E>(this: PCause<Id, E>): Either<readonly [E, Option<Trace>], PCause<Id, never>>

  /**
   * @rewrite failures from "@principia/base/Cause"
   */
  failures<Id, E>(this: PCause<Id, E>): ReadonlyArray<E>

  /**
   * @rewrite find_ from "@principia/base/Cause"
   */
  find<Id, E, A>(this: PCause<Id, E>, f: (cause: PCause<Id, E>) => Option<A>): Option<A>

  /**
   * @rewrite flipCauseEither from "@principia/base/Cause"
   */
  flipCauseEither<Id, E, A>(this: PCause<Id, Either<E, A>>): Either<PCause<Id, E>, A>

  /**
   * @rewrite flipCauseOption from "@principia/base/Cause"
   */
  flipCauseOption<Id, E>(this: PCause<Id, Option<E>>): Option<PCause<Id, E>>

  /**
   * @rewrite fold_ from "@principia/base/Cause"
   */
  fold<Id, E, A>(
    this: PCause<Id, E>,
    onEmpty: () => A,
    onFail: (e: E) => A,
    onHalt: (u: unknown) => A,
    onInterrupt: (id: FiberId) => A,
    onThen: (l: A, r: A) => A,
    onBoth: (l: A, r: A) => A,
    onTraced: (a: A, trace: Trace) => A
  ): A

  /**
   * @rewrite foldl_ from "@principia/base/Cause"
   */
  foldl<Id, E, A>(this: PCause<Id, E>, b: A, f: (b: A, a: PCause<Id, E>) => Option<A>): A

  /**
   * @rewrite halted from "@principia/base/Cause"
   */
  halted<Id, E>(this: PCause<Id, E>): this is Halt

  /**
   * @rewrite interruptOption from "@principia/base/Cause"
   */
  interruptOption<Id, E>(this: PCause<Id, E>): Option<FiberId>

  /**
   * @rewrite interrupted from "@principia/base/Cause"
   */
  interrupted<Id, E>(this: PCause<Id, E>): boolean

  /**
   * @rewrite interruptedOnly from "@principia/base/Cause"
   */
  interruptedOnly<Id, E>(this: PCause<Id, E>): boolean

  /**
   * @rewrite interruptors from "@principia/base/Cause"
   */
  interruptors<Id, E>(this: PCause<Id, E>): ReadonlySet<FiberId>

  /**
   * @rewrite keepDefects from "@principia/base/Cause"
   */
  keepDefects<Id, E>(this: PCause<Id, E>): Option<PCause<Id, never>>

  /**
   * @rewrite map_ from "@principia/base/Cause"
   */
  map<Id, A, B>(this: PCause<Id, A>, f: (a: A) => B): PCause<Id, B>

  /**
   * @rewrite pretty from "@principia/base/Cause"
   */
  pretty<Id, E>(this: PCause<Id, E>, renderer?: Renderer<E>): string

  /**
   * @rewrite sequenceCauseEither from "@principia/base/Cause"
   */
  sequenceCauseEither<Id, E, A>(this: PCause<Id, Either<E, A>>): Either<PCause<Id, E>, A>

  /**
   * @rewrite sequenceCauseOption from "@principia/base/Cause"
   */
  sequenceCauseOption<Id, E>(this: PCause<Id, Option<E>>): Option<PCause<Id, E>>

  /**
   * @rewrite stripFailures from "@principia/base/Cause"
   */
  stripFailures<Id, E>(this: PCause<Id, E>): PCause<Id, never>

  /**
   * @rewrite stripInterrupts from "@principia/base/Cause"
   */
  stripInterrupts<Id, E>(this: PCause<Id, E>): PCause<Id, E>

  /**
   * @rewrite stripSomeDefects_ from "@principia/base/Cause"
   */
  stripSomeDefects<Id, E>(this: PCause<Id, E>, predicate: Predicate<unknown>): Option<PCause<Id, E>>
}

declare module '@principia/base/Cause/generic' {
  export interface Empty extends CauseOps {}
  export interface Fail<E> extends CauseOps {}
  export interface Halt extends CauseOps {}
  export interface Interrupt<Id> extends CauseOps {}
  export interface Then<Id, E> extends CauseOps {}
  export interface Both<Id, E> extends CauseOps {}
  export interface Traced<Id, E> extends CauseOps {}
}
