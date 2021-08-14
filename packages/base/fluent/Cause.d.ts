import type { GenericCause, Halt, Renderer } from '@principia/base/Cause'
import type { Either } from '@principia/base/Either'
import type { FiberId } from '@principia/base/Fiber'
import type { Trace } from '@principia/base/Fiber/trace'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/prelude'

export interface CauseOps {
  /**
   * @rewrite chain_ from "@principia/base/Cause"
   */
  chain<Id, A, Id1, B>(this: GenericCause<Id, A>, f: (a: A) => GenericCause<Id1, B>): GenericCause<Id | Id1, B>

  /**
   * @rewrite defects from "@principia/base/Cause"
   */
  defects<Id, E>(this: GenericCause<Id, E>): ReadonlyArray<unknown>

  /**
   * @rewrite halted from "@principia/base/Cause"
   */
  halted<Id, E>(this: GenericCause<Id, E>): this is Halt

  /**
   * @rewrite equals from "@principia/base/Cause"
   */
  equals<Id, E>(this: GenericCause<Id, E>, that: GenericCause<Id, E>): boolean

  /**
   * @rewrite failed from "@principia/base/Cause"
   */
  failed<Id, E>(this: GenericCause<Id, E>): boolean

  /**
   * @rewrite failureOption from "@principia/base/Cause"
   */
  failureOption<Id, E>(this: GenericCause<Id, E>): Option<E>

  /**
   * @rewrite failureOrCause from "@principia/base/Cause"
   */
  failureOrGenericCause<Id, E>(this: GenericCause<Id, E>): Either<E, GenericCause<Id, never>>

  /**
   * @rewrite failureTraceOption from "@principia/base/Cause"
   */
  failureTraceOption<Id, E>(this: GenericCause<Id, E>): Option<readonly [E, Option<Trace>]>

  /**
   * @rewrite failureTraceOrCause from "@principia/base/Cause"
   */
  failureTraceOrGenericCause<Id, E>(
    this: GenericCause<Id, E>
  ): Either<readonly [E, Option<Trace>], GenericCause<Id, never>>

  /**
   * @rewrite failures from "@principia/base/Cause"
   */
  failures<Id, E>(this: GenericCause<Id, E>): ReadonlyArray<E>

  /**
   * @rewrite find_ from "@principia/base/Cause"
   */
  find<Id, E, A>(this: GenericCause<Id, E>, f: (cause: GenericCause<Id, E>) => Option<A>): Option<A>

  /**
   * @rewrite flipCauseEither from "@principia/base/Cause"
   */
  flipCauseEither<Id, E, A>(this: GenericCause<Id, Either<E, A>>): Either<GenericCause<Id, E>, A>

  /**
   * @rewrite flipCauseOption from "@principia/base/Cause"
   */
  flipCauseOption<Id, E>(this: GenericCause<Id, Option<E>>): Option<GenericCause<Id, E>>

  /**
   * @rewrite match_ from "@principia/base/Cause"
   */
  fold<Id, E, A>(
    this: GenericCause<Id, E>,
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
  foldl<Id, E, A>(this: GenericCause<Id, E>, b: A, f: (b: A, a: GenericCause<Id, E>) => Option<A>): A

  /**
   * @rewrite interruptOption from "@principia/base/Cause"
   */
  interruptOption<Id, E>(this: GenericCause<Id, E>): Option<FiberId>

  /**
   * @rewrite interrupted from "@principia/base/Cause"
   */
  interrupted<Id, E>(this: GenericCause<Id, E>): boolean

  /**
   * @rewrite interruptedOnly from "@principia/base/Cause"
   */
  interruptedOnly<Id, E>(this: GenericCause<Id, E>): boolean

  /**
   * @rewrite interruptors from "@principia/base/Cause"
   */
  interruptors<Id, E>(this: GenericCause<Id, E>): ReadonlySet<FiberId>

  /**
   * @rewrite keepDefects from "@principia/base/Cause"
   */
  keepDefects<Id, E>(this: GenericCause<Id, E>): Option<GenericCause<Id, never>>

  /**
   * @rewrite map_ from "@principia/base/Cause"
   */
  map<Id, A, B>(this: GenericCause<Id, A>, f: (a: A) => B): GenericCause<Id, B>

  /**
   * @rewrite pretty from "@principia/base/Cause"
   */
  pretty<Id, E>(this: GenericCause<Id, E>, renderer?: Renderer<E>): string

  /**
   * @rewrite sequenceCauseEither from "@principia/base/Cause"
   */
  sequenceCauseEither<Id, E, A>(this: GenericCause<Id, Either<E, A>>): Either<GenericCause<Id, E>, A>

  /**
   * @rewrite sequenceCauseOption from "@principia/base/Cause"
   */
  sequenceCauseOption<Id, E>(this: GenericCause<Id, Option<E>>): Option<GenericCause<Id, E>>

  /**
   * @rewrite stripFailures from "@principia/base/Cause"
   */
  stripFailures<Id, E>(this: GenericCause<Id, E>): GenericCause<Id, never>

  /**
   * @rewrite stripInterrupts from "@principia/base/Cause"
   */
  stripInterrupts<Id, E>(this: GenericCause<Id, E>): GenericCause<Id, E>

  /**
   * @rewrite stripSomeDefects_ from "@principia/base/Cause"
   */
  stripSomeDefects<Id, E>(this: GenericCause<Id, E>, predicate: Predicate<unknown>): Option<GenericCause<Id, E>>
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
