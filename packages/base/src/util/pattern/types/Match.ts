import type { DeepExclude } from './DeepExclude'
import type { ExtractPreciseValue } from './ExtractPreciseValue'
import type { FindSelected } from './FindSelected'
import type { Union, WithDefault } from './helpers'
import type { InvertPattern, InvertPatternForExclude } from './InvertPattern'
import type { GuardPattern, GuardValue, Pattern } from './Pattern'

// We fall back to `a` if we weren't able to extract anything more precise
export type MatchedValue<a, invpattern> = WithDefault<ExtractPreciseValue<a, invpattern>, a>

export type Unset = '@ts-pattern/unset'

export type PickReturnValue<A, B> = A extends Unset ? B : A

type NonExhaustiveError<I> = { __nonExhaustive: never } & I

/**
 * #### Match
 * An interface to create a pattern matching clause.
 */
export type Match<I, O, PatternValueTuples extends [any, any] = never, InferredOutput = never> = {
  /**
   * #### Match.with
   *
   * If the input matches the pattern provided as first argument,
   * execute the handler function and return its result.
   **/
  with<P extends Pattern<I>, C, Value = MatchedValue<I, InvertPattern<P>>>(
    pattern: P,
    handler: (selections: FindSelected<Value, P>, value: Value) => PickReturnValue<O, C>
  ): Match<I, O, PatternValueTuples | [P, Value], Union<InferredOutput, C>>

  with<
    P1 extends Pattern<I>,
    P2 extends Pattern<I>,
    C,
    P = P1 | P2,
    Value = P extends any ? MatchedValue<I, InvertPattern<P>> : never
  >(
    pattern1: P1,
    pattern2: P2,
    handler: (value: Value) => PickReturnValue<O, C>
  ): Match<I, O, PatternValueTuples | (P extends any ? [P, Value] : never), Union<InferredOutput, C>>

  with<
    Pat extends Pattern<I>,
    Pred extends (value: MatchedValue<I, InvertPattern<Pat>>) => unknown,
    C,
    Value = GuardValue<Pred>
  >(
    pattern: Pat,
    predicate: Pred,
    handler: (selections: FindSelected<Value, Pat>, value: Value) => PickReturnValue<O, C>
  ): Match<
    I,
    O,
    | PatternValueTuples
    | (Pred extends (value: any) => value is infer narrowed ? [GuardPattern<unknown, narrowed>, Value] : never),
    Union<InferredOutput, C>
  >

  with<
    Ps extends [Pattern<I>, ...Pattern<I>[]],
    C,
    P = Ps[number],
    Value = P extends any ? MatchedValue<I, InvertPattern<P>> : never
  >(
    ...args: [...patterns: Ps, handler: (value: Value) => PickReturnValue<O, C>]
  ): Match<I, O, PatternValueTuples | (P extends any ? [P, Value] : never), Union<InferredOutput, C>>

  /**
   * #### Match.when
   *
   * When the first function returns a truthy value,
   * execute the handler function and return its result.
   **/
  when: <Pred extends (value: I) => unknown, C, Value = GuardValue<Pred>>(
    predicate: Pred,
    handler: (value: Value) => PickReturnValue<O, C>
  ) => Match<
    I,
    O,
    | PatternValueTuples
    | (Pred extends (value: any) => value is infer narrowed ? [GuardPattern<unknown, narrowed>, Value] : never),
    Union<InferredOutput, C>
  >

  /**
   * #### Match.otherwise
   *
   * takes a function returning the **default value**.
   * and return the result of the pattern matching expression.
   *
   * Equivalent to `.with(__, () => x).run()`
   **/
  otherwise: <C>(handler: (value: I) => PickReturnValue<O, C>) => PickReturnValue<O, Union<InferredOutput, C>>

  /**
   * #### Match.exhaustive
   *
   * Runs the pattern matching expression and return the result value.
   *
   * If this is of type `NonExhaustiveError`, it means you aren't matching
   * every cases, and you should probably add another `.with(...)` clause
   * to prevent potential runtime errors.
   *
   * */
  exhaustive: DeepExcludeAll<I, PatternValueTuples> extends infer remainingCases
    ? [remainingCases] extends [never]
      ? () => PickReturnValue<O, InferredOutput>
      : NonExhaustiveError<remainingCases>
    : never

  /**
   * #### Match.run
   * Runs the pattern matching expression and return the result.
   * */
  run: () => PickReturnValue<O, InferredOutput>
}

type DeepExcludeAll<a, tuple extends [any, any]> = DeepExclude<
  a,
  tuple extends any ? InvertPatternForExclude<tuple[0], tuple[1]> : never
>
