import type { IO } from '../IO/core'

import { flow, pipe } from '../function'
import * as I from '../IO/core'
import { matchTag_ } from '../util/match'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type Decision<R, I, O> = Done<O> | Continue<R, I, O>

export interface Continue<R, I, O> {
  readonly _tag: 'Continue'
  readonly out: O
  readonly interval: number
  readonly next: StepFunction<R, I, O>
}

export interface Done<O> {
  readonly _tag: 'Done'
  readonly out: O
}

export type StepFunction<R, I, O> = (interval: number, input: I) => IO<R, never, Decision<R, I, O>>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function makeDone<O>(out: O): Done<O> {
  return {
    _tag: 'Done',
    out
  }
}

export function makeContinue<R, I, O>(out: O, interval: number, next: StepFunction<R, I, O>): Decision<R, I, O> {
  return {
    _tag: 'Continue',
    out,
    interval,
    next
  }
}

export function toDone<R, I, O>(decision: Decision<R, I, O>): Done<O> {
  return matchTag_(decision, {
    Done: (_) => _,
    Continue: (c) => makeDone(c.out)
  })
}

export function done<A>(a: A): StepFunction<unknown, unknown, A> {
  return () => I.pure(makeDone(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, I, A, B>(fa: Decision<R, I, A>, f: (a: A) => B): Decision<R, I, B> {
  return matchTag_(fa, {
    Done: ({ out }) => makeDone(f(out)),
    Continue: ({ out, next, interval }) => makeContinue(f(out), interval, flow(next, I.map(map(f))))
  })
}

export function map<A, B>(f: (a: A) => B): <R, I>(fa: Decision<R, I, A>) => Decision<R, I, B> {
  return (fa) => map_(fa, f)
}

export function as_<R, I, O, O1>(fa: Decision<R, I, O>, o: O1): Decision<R, I, O1> {
  return map_(fa, () => o)
}

export function as<O1>(o: O1): <R, I, O>(fa: Decision<R, I, O>) => Decision<R, I, O1> {
  return (fa) => as_(fa, o)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function contramapIn_<R, I, I1, O>(fa: Decision<R, I, O>, f: (i: I1) => I): Decision<R, I1, O> {
  return matchTag_(fa, {
    Done: (_) => _,
    Continue: ({ out, interval, next }) =>
      makeContinue(out, interval, (n, i: I1) => pipe(next(n, f(i)), I.map(contramapIn(f))))
  })
}

export function contramapIn<I, I1>(f: (i: I1) => I): <R, O>(fa: Decision<R, I, O>) => Decision<R, I1, O> {
  return (fa) => contramapIn_(fa, f)
}
