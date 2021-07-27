import type { Cause, Halt, Renderer } from '@principia/base/Cause'
import type { Either } from '@principia/base/Either'
import type { FiberId } from '@principia/base/Fiber'
import type { Trace } from '@principia/base/Fiber/trace'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/prelude'

export interface CauseOps {
  /**
   * @rewrite chain_ from "@principia/base/Cause"
   */
  chain<A, B>(this: Cause<A>, f: (a: A) => Cause<B>): Cause<B>

  /**
   * @rewrite defects from "@principia/base/Cause"
   */
  defects<E>(this: Cause<E>): ReadonlyArray<unknown>

  /**
   * @rewrite halted from "@principia/base/Cause"
   */
  halted<E>(this: Cause<E>): this is Halt

  /**
   * @rewrite equals from "@principia/base/Cause"
   */
  equals<E>(this: Cause<E>, that: Cause<E>): boolean

  /**
   * @rewrite failed from "@principia/base/Cause"
   */
  failed<E>(this: Cause<E>): boolean

  /**
   * @rewrite failureOption from "@principia/base/Cause"
   */
  failureOption<E>(this: Cause<E>): Option<E>

  /**
   * @rewrite failureOrCause from "@principia/base/Cause"
   */
  failureOrCause<E>(this: Cause<E>): Either<E, Cause<never>>

  /**
   * @rewrite failureTraceOption from "@principia/base/Cause"
   */
  failureTraceOption<E>(this: Cause<E>): Option<readonly [E, Option<Trace>]>

  /**
   * @rewrite failureTraceOrCause from "@principia/base/Cause"
   */
  failureTraceOrCause<E>(this: Cause<E>): Either<readonly [E, Option<Trace>], Cause<never>>

  /**
   * @rewrite failures from "@principia/base/Cause"
   */
  failures<E>(this: Cause<E>): ReadonlyArray<E>

  /**
   * @rewrite find_ from "@principia/base/Cause"
   */
  find<E, A>(this: Cause<E>, f: (cause: Cause<E>) => Option<A>): Option<A>

  /**
   * @rewrite flipCauseEither from "@principia/base/Cause"
   */
  flipCauseEither<E, A>(this: Cause<Either<E, A>>): Either<Cause<E>, A>

  /**
   * @rewrite flipCauseOption from "@principia/base/Cause"
   */
  flipCauseOption<E>(this: Cause<Option<E>>): Option<Cause<E>>

  /**
   * @rewrite match_ from "@principia/base/Cause"
   */
  fold<E, A>(
    this: Cause<E>,
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
  foldl<E, A>(this: Cause<E>, b: A, f: (b: A, a: Cause<E>) => Option<A>): A

  /**
   * @rewrite interruptOption from "@principia/base/Cause"
   */
  interruptOption<E>(this: Cause<E>): Option<FiberId>

  /**
   * @rewrite interrupted from "@principia/base/Cause"
   */
  interrupted<E>(this: Cause<E>): boolean

  /**
   * @rewrite interruptedOnly from "@principia/base/Cause"
   */
  interruptedOnly<E>(this: Cause<E>): boolean

  /**
   * @rewrite interruptors from "@principia/base/Cause"
   */
  interruptors<E>(this: Cause<E>): ReadonlySet<FiberId>

  /**
   * @rewrite keepDefects from "@principia/base/Cause"
   */
  keepDefects<E>(this: Cause<E>): Option<Cause<never>>

  /**
   * @rewrite map_ from "@principia/base/Cause"
   */
  map<A, B>(this: Cause<A>, f: (a: A) => B): Cause<B>

  /**
   * @rewrite pretty from "@principia/base/Cause"
   */
  pretty<E>(this: Cause<E>, renderer?: Renderer<E>): string

  /**
   * @rewrite sequenceCauseEither from "@principia/base/Cause"
   */
  sequenceCauseEither<E, A>(this: Cause<Either<E, A>>): Either<Cause<E>, A>

  /**
   * @rewrite sequenceCauseOption from "@principia/base/Cause"
   */
  sequenceCauseOption<E>(this: Cause<Option<E>>): Option<Cause<E>>

  /**
   * @rewrite stripFailures from "@principia/base/Cause"
   */
  stripFailures<E>(this: Cause<E>): Cause<never>

  /**
   * @rewrite stripInterrupts from "@principia/base/Cause"
   */
  stripInterrupts<E>(this: Cause<E>): Cause<E>

  /**
   * @rewrite stripSomeDefects_ from "@principia/base/Cause"
   */
  stripSomeDefects<E>(this: Cause<E>, predicate: Predicate<unknown>): Option<Cause<E>>
}

declare module '@principia/base/Cause/core' {
  export interface Empty extends CauseOps {}
  export interface Fail<E> extends CauseOps {}
  export interface Halt extends CauseOps {}
  export interface Interrupt extends CauseOps {}
  export interface Then<E> extends CauseOps {}
  export interface Both<E> extends CauseOps {}
  export interface Traced<E> extends CauseOps {}
}
