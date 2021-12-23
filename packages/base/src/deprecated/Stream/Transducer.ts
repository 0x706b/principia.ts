import type { Chunk } from '../../Chunk'
import type * as Eq from '../../Eq'
import type { IO } from '../../IO'
import type { Cause } from '../../IO/Cause'
import type { Managed } from '../../Managed'
import type { Finalizer } from '../../Managed/ReleaseMap'
import type { Maybe } from '../../Maybe'
import type { Predicate } from '../../Predicate'
import type { Refinement } from '../../Refinement'

import * as C from '../../Chunk'
import * as E from '../../Either'
import { flow, pipe } from '../../function'
import * as I from '../../IO'
import * as Ex from '../../IO/Exit'
import * as Ma from '../../Managed'
import * as Map from '../../Map'
import * as M from '../../Maybe'
import { not } from '../../Predicate'
import * as Ref from '../../Ref'
import * as Set from '../../Set'
import * as RefM from '../../SRef'
import { tuple } from '../../tuple/core'
import { Sink } from './internal/Sink'
import { Transducer } from './internal/Transducer'

export { Transducer }

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Just(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export function transducer<R, E, I, O, R1>(
  push: Managed<R, never, (c: Maybe<Chunk<I>>) => IO<R1, E, Chunk<O>>>
): Transducer<R & R1, E, I, O> {
  return new Transducer<R & R1, E, I, O>(push)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a transducer that always fails with the specified failure.
 */
export function fail<E>(error: E): Transducer<unknown, E, unknown, never> {
  return new Transducer(Ma.succeed((_) => I.fail(error)))
}

/**
 * Creates a transducer that always halts with the specified exception.
 */
export function halt(defect: unknown): Transducer<unknown, never, unknown, never> {
  return new Transducer(Ma.succeed((_) => I.halt(defect)))
}

/**
 * Creates a transducer that always fails with the specified cause.
 */
export function failCause<E>(cause: Cause<E>): Transducer<unknown, E, unknown, never> {
  return new Transducer(Ma.succeed((_) => I.failCause(cause)))
}

/**
 * The identity transducer. Passes elements through.
 */
export function identity<I>(): Transducer<unknown, never, I, I> {
  return fromPush(M.match(() => I.succeed(C.empty()), I.succeed))
}

/**
 * Creates a transducer from a chunk processing function.
 */
export function fromPush<R, E, I, O>(push: (input: M.Maybe<Chunk<I>>) => I.IO<R, E, Chunk<O>>): Transducer<R, E, I, O> {
  return new Transducer(Ma.succeed(push))
}

/**
 * Creates a transducer that always evaluates the specified effect.
 */
export function fromEffect<R, E, A>(io: I.IO<R, E, A>): Transducer<R, E, unknown, A> {
  return new Transducer(Ma.succeed((_: any) => I.map_(io, C.single)))
}

/**
 * Creates a transducer that purely transforms incoming values.
 */
export function fromFunction<I, O>(f: (i: I) => O): Transducer<unknown, never, I, O> {
  return map_(identity(), f)
}

/**
 * Creates a transducer that effectfully transforms incoming values.
 */
export function fromFunctionIO<R, E, I, O>(f: (i: I) => I.IO<R, E, O>): Transducer<R, E, I, O> {
  return mapIO_(identity(), f)
}

/**
 * Creates a transducer that returns the first element of the stream, if it exists.
 */
export function head<O>(): Transducer<unknown, never, O, M.Maybe<O>> {
  return reduce(M.nothing(), (acc, o) =>
    M.match_(
      acc,
      () => M.just(o),
      () => acc
    )
  )
}

/**
 * Creates a transducer that returns the last element of the stream, if it exists.
 */
export function last<O>(): Transducer<unknown, never, O, M.Maybe<O>> {
  return reduce(M.nothing(), (_, a) => M.just(a))
}

/**
 * Emits the provided chunk before emitting any other value.
 */
export function prepend<O>(values: Chunk<O>): Transducer<unknown, never, O, O> {
  return new Transducer(
    Ma.map_(
      Ref.managedRef(values),
      (state) => (is: M.Maybe<Chunk<O>>) =>
        M.match_(
          is,
          () => Ref.getAndSet_(state, C.empty()),
          (xs) =>
            pipe(
              state,
              Ref.getAndSet(C.empty()),
              I.map((c) => (C.isEmpty(c) ? xs : C.concat_(c, xs)))
            )
        )
    )
  )
}

/**
 * Reads the first n values from the stream and uses them to choose the transducer that will be used for the remainder of the stream.
 * If the stream ends before it has collected n values the partial chunk will be provided to f.
 */
export function branchAfter<R, E, I, O>(n: number, f: (c: Chunk<I>) => Transducer<R, E, I, O>): Transducer<R, E, I, O> {
  interface Collecting {
    _tag: 'Collecting'
    data: Chunk<I>
  }
  interface Emitting {
    _tag: 'Emitting'
    finalizer: Finalizer
    push: (is: M.Maybe<Chunk<I>>) => I.IO<R, E, Chunk<O>>
  }
  type State = Collecting | Emitting
  const initialState: State = {
    _tag: 'Collecting',
    data: C.empty()
  }

  const toCollect = Math.max(0, n)

  return new Transducer(
    Ma.chain_(Ma.scope(), (scope) =>
      Ma.map_(
        RefM.makeManaged<State>(initialState),
        (state) => (is: M.Maybe<Chunk<I>>) =>
          M.match_(
            is,
            () =>
              pipe(
                RefM.getAndSet_(state, initialState),
                I.chain((s) => {
                  switch (s._tag) {
                    case 'Collecting': {
                      return Ma.use_(f(s.data).push, (f) => f(M.nothing()))
                    }
                    case 'Emitting': {
                      return I.apFirst_(s.push(M.nothing()), s.finalizer(Ex.unit()))
                    }
                  }
                })
              ),
            (data) =>
              RefM.modifyIO_(state, (s) => {
                switch (s._tag) {
                  case 'Emitting': {
                    return I.map_(s.push(M.just(data)), (_) => [_, s] as const)
                  }
                  case 'Collecting': {
                    if (C.isEmpty(data)) {
                      return I.succeed([C.empty<O>(), s] as const)
                    } else {
                      const remaining = toCollect - s.data.length
                      if (remaining <= data.length) {
                        const [newCollected, remainder] = C.splitAt_(data, remaining)
                        return I.chain_(scope.apply(f(C.concat_(s.data, newCollected)).push), ([finalizer, push]) =>
                          I.map_(push(M.just(remainder)), (_) => [_, { _tag: 'Emitting', finalizer, push }] as const)
                        )
                      } else {
                        return I.succeed([C.empty<O>(), { _tag: 'Collecting', data: C.concat_(s.data, data) }] as const)
                      }
                    }
                  }
                }
              })
          )
      )
    )
  )
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the predicate `p`.
 */
export function dropWhile<I>(predicate: Predicate<I>): Transducer<unknown, never, I, I> {
  return new Transducer(
    Ma.map_(
      Ref.managedRef(true),
      (dropping) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () => I.succeed(C.empty()),
          (is) =>
            Ref.modify_(dropping, (b) => {
              switch (b) {
                case true: {
                  const is1 = C.dropWhile_(is, predicate)
                  return [is1, is1.length === 0]
                }
                case false: {
                  return [is, false]
                }
              }
            })
        )
    )
  )
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the effectful predicate `p`.
 */
export function dropWhileIO<R, E, I>(p: (i: I) => I.IO<R, E, boolean>): Transducer<R, E, I, I> {
  return new Transducer(
    pipe(
      Ref.managedRef(true),
      Ma.map(
        (droppingRef) => (is: M.Maybe<Chunk<I>>) =>
          M.match_(
            is,
            () => I.succeed(C.empty<I>()),
            (is) =>
              pipe(
                droppingRef.get,
                I.chain((dropping) => {
                  if (dropping) {
                    return pipe(
                      is,
                      C.dropWhileIO(p),
                      I.map((l) => tuple(l, C.isEmpty(l)))
                    )
                  } else {
                    return I.succeed(tuple(is, false))
                  }
                }),
                I.chain(([is, pt]) => I.as_(droppingRef.set(pt), is))
              )
          )
      )
    )
  )
}

/**
 * Creates a transducer by folding over a structure of type `O` for as long as
 * `contFn` results in `true`. The transducer will emit a value when `contFn`
 * evaluates to `false` and then restart the folding.
 */
export function fold<I, O>(
  initial: O,
  contFn: (o: O) => boolean,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  const go = (in_: Chunk<I>, state: O, progress: boolean): readonly [Chunk<O>, O, boolean] =>
    C.foldl_(in_, [C.empty<O>(), state, progress] as const, ([os0, state, _], i) => {
      const o = f(state, i)
      if (contFn(o)) {
        return [os0, o, true] as const
      } else {
        return [C.append_(os0, o), initial, false] as const
      }
    })

  return new Transducer(
    Ma.map_(
      Ref.managedRef(M.just(initial)),
      (state) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () => pipe(Ref.getAndSet_(state, M.nothing()), I.map(M.match(() => C.empty(), C.single))),
          (in_) =>
            Ref.modify_(state, (s) => {
              const [o, s2, progress] = go(
                in_,
                M.getOrElse_(s, () => initial),
                M.isJust(s)
              )
              if (progress) {
                return [o, M.just(s2)]
              } else {
                return [o, M.nothing()]
              }
            })
        )
    )
  )
}

/**
 * Creates a transducer by folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function reduce<I, O>(initial: O, f: (output: O, input: I) => O): Transducer<unknown, never, I, O> {
  return fold(initial, () => true, f)
}

/**
 * Creates a sink by effectfully folding over a structure of type `S`.
 */
export function foldWhileIO<R, E, I, O>(
  initial: O,
  cont: (o: O) => boolean,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  const init = M.just(initial)
  const go   = (in_: Chunk<I>, state: O, progress: boolean): I.IO<R, E, readonly [Chunk<O>, O, boolean]> =>
    C.foldl_(in_, I.succeed([C.empty(), state, progress]) as I.IO<R, E, readonly [Chunk<O>, O, boolean]>, (b, i) =>
      I.chain_(b, ([os0, state, _]) =>
        I.map_(f(state, i), (o) => {
          if (cont(o)) {
            return [os0, o, true] as const
          } else {
            return [C.append_(os0, o), initial, false] as const
          }
        })
      )
    )
  return new Transducer(
    Ma.map_(
      Ref.managedRef(init),
      (state) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () => pipe(state, Ref.getAndSet(M.nothing()), I.map(M.match(() => C.empty(), C.single))),
          (in_) =>
            pipe(
              state,
              Ref.get,
              I.chain((s) =>
                go(
                  in_,
                  M.getOrElse_(s, () => initial),
                  M.isJust(s)
                )
              ),
              I.chain(([os, s, progress]) =>
                progress
                  ? I.apSecond_(state.set(M.just(s)), I.succeed(os))
                  : I.apSecond_(state.set(M.nothing()), I.succeed(os))
              )
            )
        )
    )
  )
}

/**
 * Creates a transducer by effectfully folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function foldIO<R, E, I, O>(initial: O, f: (output: O, input: I) => I.IO<R, E, O>): Transducer<R, E, I, O> {
  return foldWhileIO(initial, () => true, f)
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 */
export function foldUntil<I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  return pipe(
    fold(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => [f(o, i), count + 1] as const
    ),
    map(([o, _]) => o)
  )
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeightedM`, but with a constant cost function of 1.
 */
export function foldUntilIO<R, E, I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  return pipe(
    foldWhileIO(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => I.map_(f(o, i), (o) => [o, count + 1] as const)
    ),
    map(([o, _]) => o)
  )
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `O` aggregate to cross `max` into smaller elements.
 *
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The `foldWeightedDecomposeM` allows the decompose function
 * to return a `IO`, and consequently it allows the transducer
 * to fail.
 */
export function foldWeightedDecompose<I, O>(
  initial: O,
  costFn: (output: O, input: I) => number,
  max: number,
  decompose: (input: I) => Chunk<I>,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  interface FoldWeightedState {
    result: O
    cost: number
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  }

  const go = (
    in_: Chunk<I>,
    os0: Chunk<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): readonly [Chunk<O>, FoldWeightedState, boolean] =>
    C.foldl_(in_, [os0, state, dirty] as const, ([os0, state, _], i) => {
      const total = state.cost + costFn(state.result, i)

      if (total > max) {
        const is = decompose(i)
        if (is.length <= 1 && !dirty) {
          return [C.append_(os0, f(state.result, C.isNonEmpty(is) ? is[0] : i)), initialState, false] as const
        } else if (is.length <= 1 && dirty) {
          const elem = C.isNonEmpty(is) ? is[0] : i
          return [
            C.append_(os0, state.result),
            { result: f(initialState.result, elem), cost: costFn(initialState.result, elem) },
            true
          ] as const
        } else {
          return go(is, os0, state, dirty)
        }
      } else {
        return [os0, { result: f(state.result, i), cost: total }, true] as const
      }
    })

  return new Transducer(
    Ma.map_(
      Ref.managedRef(M.just(initialState)),
      (state) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () =>
            pipe(
              state,
              Ref.getAndSet(M.nothing()),
              I.map(
                M.match(
                  () => C.empty(),
                  (s) => C.single(s.result)
                )
              )
            ),
          (in_) =>
            Ref.modify_(state, (s) => {
              const [o, s2, dirty] = go(
                in_,
                C.empty(),
                M.getOrElse_(s, () => initialState),
                M.isJust(s)
              )
              if (dirty) {
                return [o, M.just(s2)]
              } else {
                return [o, M.nothing()]
              }
            })
        )
    )
  )
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See `foldWeightedDecompose` for an example.
 */
export function foldWeightedDecomposeIO<R, E, I, O>(
  initial: O,
  costFn: (output: O, input: I) => I.IO<R, E, number>,
  max: number,
  decompose: (input: I) => I.IO<R, E, Chunk<I>>,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  interface FoldWeightedState {
    result: O
    cost: number
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  }

  const go = (
    in_: Chunk<I>,
    os: Chunk<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): I.IO<R, E, readonly [Chunk<O>, FoldWeightedState, boolean]> =>
    C.foldl_(
      in_,
      I.succeed([os, state, dirty]) as I.IO<R, E, readonly [Chunk<O>, FoldWeightedState, boolean]>,
      (o, i) =>
        I.chain_(o, ([os, state, _]) =>
          I.chain_(costFn(state.result, i), (cost) => {
            const total = cost + state.cost
            if (total > max) {
              return I.chain_(decompose(i), (is) => {
                if (is.length <= 1 && !dirty) {
                  return I.map_(
                    f(state.result, C.isNonEmpty(is) ? is[0] : i),
                    (o) => [C.append_(os, o), initialState, false] as const
                  )
                } else if (is.length <= 1 && dirty) {
                  const elem = C.isNonEmpty(is) ? is[0] : i
                  return I.crossWith_(
                    f(initialState.result, elem),
                    costFn(initialState.result, elem),
                    (result, cost) => [C.append_(os, state.result), { result, cost }, true]
                  )
                } else {
                  return go(is, os, state, dirty)
                }
              })
            } else {
              return I.map_(f(state.result, i), (o) => [os, { result: o, cost: total }, true] as const)
            }
          })
        )
    )

  return new Transducer(
    Ma.map_(
      Ref.managedRef(M.just(initialState)),
      (state) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () =>
            pipe(
              state,
              Ref.getAndSet(M.nothing()),
              I.map(
                M.match(
                  () => C.empty(),
                  (s) => C.single(s.result)
                )
              )
            ),
          (in_) =>
            pipe(
              state,
              Ref.get,
              I.chain((s) =>
                go(
                  in_,
                  C.empty(),
                  M.getOrElse_(s, () => initialState),
                  M.isJust(s)
                )
              ),
              I.chain(([os, s, dirty]) =>
                dirty
                  ? I.apSecond_(state.set(M.just(s)), I.succeed(os))
                  : I.apSecond_(state.set(M.nothing()), I.succeed(os))
              )
            )
        )
    )
  )
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the transducer to cross the `max` cost. See `foldWeightedDecompose`
 * for a variant that can handle these cases.
 */
export function foldWeighted<I, O>(
  initial: O,
  costFn: (o: O, i: I) => number,
  max: number,
  f: (o: O, i: I) => O
): Transducer<unknown, never, I, O> {
  return foldWeightedDecompose(initial, costFn, max, C.single, f)
}

/**
 * Creates a transducer accumulating incoming values into chunks of maximum size `n`.
 */
export function collectAllN<I>(n: number): Transducer<unknown, never, I, Chunk<I>> {
  const go = (in_: Chunk<I>, leftover: Chunk<I>, acc: Chunk<Chunk<I>>): [Chunk<Chunk<I>>, Chunk<I>] => {
    const [left, nextIn] = C.splitAt_(in_, n - leftover.length)
    if (leftover.length + left.length < n) {
      return [acc, C.concat_(leftover, left)]
    } else {
      const nextOut = !C.isEmpty(leftover) ? C.append_(acc, C.concat_(leftover, left)) : C.append_(acc, left)
      return go(nextIn, C.empty(), nextOut)
    }
  }

  return new Transducer(
    Ma.map_(
      Ref.managedRef(C.empty<I>()),
      (state) => (is: M.Maybe<Chunk<I>>) =>
        M.match_(
          is,
          () =>
            I.map_(Ref.getAndSet_(state, C.empty()), (leftover) =>
              !C.isEmpty(leftover) ? C.single(leftover) : C.empty()
            ),
          (in_) => Ref.modify_(state, (leftover) => go(in_, leftover, C.empty()))
        )
    )
  )
}

/**
 * Creates a transducer accumulating incoming values into maps of up to `n` keys. Elements
 * are mapped to keys using the function `key`; elements mapped to the same key will
 * be merged with the function `f`.
 */
export function collectAllToMapN<K, I>(
  n: number,
  key: (i: I) => K,
  merge: (i: I, i1: I) => I
): Transducer<unknown, never, I, ReadonlyMap<K, I>> {
  return pipe(
    foldWeighted<I, ReadonlyMap<K, I>>(
      Map.empty(),
      (acc, i) => (acc.has(key(i)) ? 0 : 1),
      n,
      (acc, i) => {
        const k = key(i)
        if (acc.has(k)) {
          return Map.insert_(acc, k, merge(acc.get(k) as I, i))
        } else {
          return Map.insert_(acc, k, i)
        }
      }
    ),
    filter(not(Map.isEmpty))
  )
}

/**
 * Creates a transducer accumulating incoming values into sets of maximum size `n`.
 */
export function collectAllToSetN<I>(E: Eq.Eq<I>): (n: number) => Transducer<unknown, never, I, ReadonlySet<I>> {
  const insertE = Set.insert_(E)
  return (n) =>
    pipe(
      foldWeighted<I, ReadonlySet<I>>(
        Set.empty(),
        (acc, i) => (acc.has(i) ? 0 : 1),
        n,
        (acc, i) => insertE(acc, i)
      ),
      filter((set) => set.size !== 0)
    )
}

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate `p`.
 */
export function collectAllWhile<I>(p: Predicate<I>): Transducer<unknown, never, I, Chunk<I>> {
  return pipe(
    fold<I, [Chunk<I>, boolean]>(
      [C.empty(), true],
      ([, b]) => b,
      ([is, _], i) => (p(i) ? [C.append_(is, i), true] : [is, false])
    ),
    map(([ci, _]) => ci),
    filter(C.isNonEmpty)
  )
}

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful predicate `p`.
 */
export function collectAllWhileIO<R, E, I>(p: (i: I) => I.IO<R, E, boolean>): Transducer<R, E, I, Chunk<I>> {
  return pipe(
    foldWhileIO<R, E, I, [Chunk<I>, boolean]>(
      [C.empty(), true],
      ([, b]) => b,
      ([is, _], i) => I.map_(p(i), (b) => (b ? [C.append_(is, i), true] : [is, false]))
    ),
    map(([ci, _]) => ci),
    filter(C.isNonEmpty)
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the inputs of this transducer.
 */
export function contramap_<R, E, I, O, J>(fa: Transducer<R, E, I, O>, f: (j: J) => I): Transducer<R, E, J, O> {
  return new Transducer(Ma.map_(fa.push, (push) => (input) => push(M.map_(input, C.map(f)))))
}

/**
 * Transforms the inputs of this transducer.
 */
export function contramap<I, J>(f: (j: J) => I): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, J, O> {
  return (fa) => contramap_(fa, f)
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapIO_<R, E, I, O, R1, E1, J>(
  fa: Transducer<R, E, I, O>,
  f: (j: J) => I.IO<R1, E1, I>
): Transducer<R & R1, E | E1, J, O> {
  return new Transducer(
    Ma.map_(
      fa.push,
      (push) => (is) =>
        M.match_(
          is,
          () => push(M.nothing()),
          flow(
            C.mapIO(f),
            I.chain((in_) => push(M.just(in_)))
          )
        )
    )
  )
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapIO<R1, E1, I, J>(
  f: (j: J) => I.IO<R1, E1, I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, J, O> {
  return (fa) => contramapIO_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filters the outputs of this transducer.
 */
export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O>
export function filter_<R, E, I, O, B extends O>(
  fa: Transducer<R, E, I, O>,
  refinement: Refinement<O, B>
): Transducer<R, E, I, B>
export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O> {
  return new Transducer(Ma.map_(fa.push, (push) => (is) => I.map_(push(is), C.filter(predicate))))
}

/**
 * Filters the outputs of this transducer.
 */
export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>
export function filter<O, B extends O>(
  refinement: Refinement<O, B>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, B>
export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
  return (fa) => filter_(fa, predicate)
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O>
export function filterInput_<R, E, I, O, I1 extends I>(
  fa: Transducer<R, E, I, O>,
  refinement: Refinement<I, I1>
): Transducer<R, E, I1, O>
export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O> {
  return new Transducer(Ma.map_(fa.push, (push) => (is) => push(M.map_(is, C.filter(predicate)))))
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput<I>(predicate: Predicate<I>): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>
export function filterInput<I, I1 extends I>(
  refinement: Refinement<I, I1>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I1, O>
export function filterInput<I>(
  predicate: Predicate<I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
  return (fa) => filterInput_(fa, predicate)
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputIO_<R, E, I, O, R1, E1>(
  fa: Transducer<R, E, I, O>,
  predicate: (i: I) => I.IO<R1, E1, boolean>
): Transducer<R & R1, E | E1, I, O> {
  return new Transducer(
    Ma.map_(
      fa.push,
      (push) => (is) =>
        M.match_(
          is,
          () => push(M.nothing()),
          flow(
            C.filterIO(predicate),
            I.chain((in_) => push(M.just(in_)))
          )
        )
    )
  )
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputIO<I, R1, E1>(
  predicate: (i: I) => I.IO<R1, E1, boolean>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O> {
  return (fa) => filterInputIO_(fa, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the outputs of this transducer.
 */
export function map_<R, E, I, O, O1>(fa: Transducer<R, E, I, O>, f: (o: O) => O1): Transducer<R, E, I, O1> {
  return new Transducer(Ma.map_(fa.push, (push) => (input) => I.map_(push(input), C.map(f))))
}

/**
 * Transforms the outputs of this transducer.
 */
export function map<O, P>(f: (o: O) => P): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, P> {
  return (fa) => map_(fa, f)
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunks: Chunk<O>) => Chunk<O1>
): Transducer<R, E, I, O1> {
  return new Transducer(Ma.map_(fa.push, (push) => (input) => I.map_(push(input), f)))
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks<O, O1>(
  f: (chunks: Chunk<O>) => Chunk<O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O1> {
  return (fa) => mapChunks_(fa, f)
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksIO_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(Ma.map_(fa.push, (push) => (input) => I.chain_(push(input), f)))
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksIO<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapChunksIO_(fa, f)
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapIO_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => I.IO<R1, E1, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(Ma.map_(fa.push, (push) => (input) => I.chain_(push(input), C.mapIO(f))))
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapIO<O, R1, E1, O1>(
  f: (o: O) => I.IO<R1, E1, O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapIO_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then_<R, E, I, O, R1, E1, O1>(
  self: Transducer<R, E, I, O>,
  that: Transducer<R1, E1, O, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(
    pipe(
      self.push,
      Ma.crossWith(that.push, (pushLeft, pushRight) =>
        M.match(
          () =>
            pipe(
              pushLeft(M.nothing()),
              I.chain((cl) =>
                cl.length === 0
                  ? pushRight(M.nothing())
                  : pipe(pushRight(M.just(cl)), I.crossWith(pushRight(M.nothing()), C.concat_))
              )
            ),
          (inputs) =>
            pipe(
              pushLeft(M.just(inputs)),
              I.chain((cl) => pushRight(M.just(cl)))
            )
        )
      )
    )
  )
}

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then<R1, E1, O, O1>(
  that: Transducer<R1, E1, O, O1>
): <R, E, I>(self: Transducer<R, E, I, O>) => Transducer<R & R1, E1 | E, I, O1> {
  return (me) => then_(me, that)
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink_<R, E, I, O, R1, E1, L, Z>(
  me: Transducer<R, E, I, O>,
  that: Sink<R1, E1, O, L, Z>
): Sink<R & R1, E | E1, I, L, Z> {
  return new Sink(
    pipe(
      Ma.crossWith_(
        me.push,
        that.push,
        (pushMe, pushThat) => (is: M.Maybe<Chunk<I>>) =>
          M.match_(
            is,
            () =>
              pipe(
                pushMe(M.nothing()),
                I.mapError((e) => [E.left<E | E1>(e), C.empty<L>()] as const),
                I.chain((chunk) => I.apSecond_(pushThat(M.just(chunk)), pushThat(M.nothing())))
              ),
            (in_) =>
              pipe(
                pushMe(M.just(in_)),
                I.mapError((e) => [E.left(e), C.empty<L>()] as const),
                I.chain((chunk) => pushThat(M.just(chunk)))
              )
          )
      )
    )
  )
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink<R1, E1, O, L, Z>(
  that: Sink<R1, E1, O, L, Z>
): <R, E, I>(me: Transducer<R, E, I, O>) => Sink<R & R1, E | E1, I, L, Z> {
  return (me) => thenSink_(me, that)
}
