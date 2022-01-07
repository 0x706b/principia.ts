import type { NonEmptyArray } from '@principia/base/collection/immutable/NonEmptyArray'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

import * as NEA from '@principia/base/collection/immutable/NonEmptyArray'
import { flow, pipe } from '@principia/base/function'
import * as M from '@principia/base/Maybe'
import * as Th from '@principia/base/These'

export interface Parse<I, E, A> {
  (i: I): These<E, A>
}

export function fromPredicateFail<I, E, A extends I>(refinement: Refinement<I, A>, onFalse: (i: I) => E): Parse<I, E, A>
export function fromPredicateFail<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): Parse<A, E, A>
export function fromPredicateFail<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): Parse<A, E, A> {
  return (a) => (predicate(a) ? Th.right(a) : Th.left(onFalse(a)))
}

export function fromPredicateWarn<I, E, A extends I>(refinement: Refinement<I, A>, onFalse: (i: I) => E): Parse<I, E, A>
export function fromPredicateWarn<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): Parse<A, E, A>
export function fromPredicateWarn<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): Parse<A, E, A> {
  return (a) => (predicate(a) ? Th.right(a) : Th.both(onFalse(a), a))
}

export function fromPredicate<I, E, W, A extends I>(
  refinement: Refinement<I, A>,
  onFalse: (i: I) => E,
  onTrueWarn: (i: A) => M.Maybe<W>
): Parse<I, E, A>
export function fromPredicate<E, W, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E,
  onTrueWarn: (a: A) => M.Maybe<W>
): Parse<A, E | W, A>
export function fromPredicate<E, W, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E,
  onTrueWarn: (a: A) => M.Maybe<W>
): Parse<A, E | W, A> {
  return (a) => {
    if (predicate(a)) {
      const w = onTrueWarn(a)
      return M.isJust(w) ? Th.both(w.value, a) : Th.right(a)
    }
    return Th.left(onFalse(a))
  }
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<I, E, A, B>(fa: Parse<I, E, A>, f: (a: A) => B): Parse<I, E, B> {
  return flow(fa, Th.map(f))
}

export function map<A, B>(f: (a: A) => B): <I, E>(fa: Parse<I, E, A>) => Parse<I, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function mapLeft_<I, E, A, E1>(fa: Parse<I, E, A>, f: (e: E) => E1): Parse<I, E1, A> {
  return flow(fa, Th.mapLeft(f))
}

export function mapLeft<E, E1>(f: (e: E) => E1): <I, A>(fa: Parse<I, E, A>) => Parse<I, E1, A> {
  return (fa) => mapLeft_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<I, E, A, I0>(fa: Parse<I, E, A>, f: (i0: I0) => I): Parse<I0, E, A> {
  return flow(f, fa)
}

export function contramap<I0, I>(f: (i0: I0) => I): <E, A>(fa: Parse<I, E, A>) => Parse<I0, E, A> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function id<A>(): Parse<A, never, A> {
  return Th.right
}

export function compose_<I, E, A, E1, B>(ia: Parse<I, E, A>, ab: Parse<A, E1, B>): Parse<I, E | E1, B> {
  return flow(
    ia,
    Th.match(Th.left, ab, (e, a) =>
      pipe(
        ab(a),
        Th.match(
          Th.left,
          (b) => Th.both(e, b),
          (e1, b) => Th.both(e1, b)
        )
      )
    )
  )
}

export function compose<A, E1, B>(ab: Parse<A, E1, B>): <I, E>(ia: Parse<I, E, A>) => Parse<I, E | E1, B> {
  return (ia) => compose_(ia, ab)
}

export function composeCollect_<I, E, A, E1, B>(
  ia: Parse<I, E, A>,
  ab: Parse<A, E1, B>
): Parse<I, [_: E | E1, _?: E | E1 | undefined], B> {
  return flow(
    ia,
    Th.match(
      (e) => Th.left([e]),
      flow(
        ab,
        Th.mapLeft((e1) => [e1])
      ),
      (e, a) =>
        pipe(
          ab(a),
          Th.match(
            (e1) => Th.left([e, e1]),
            (b) => Th.both([e], b),
            (e1, b) => Th.both([e, e1], b)
          )
        )
    )
  )
}

export function composeCollect<A, E1, B>(
  ab: Parse<A, E1, B>
): <I, E>(ia: Parse<I, E, A>) => Parse<I, [_: E | E1, _?: E | E1 | undefined], B> {
  return (ia) => composeCollect_(ia, ab)
}
