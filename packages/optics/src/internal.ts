/* eslint-disable @typescript-eslint/no-use-before-define */

import type { Fold, FoldMin } from './Fold'
import type { Getter, GetterMin } from './Getter'
import type { PIso, PIsoMin } from './Iso'
import type { PLens, PLensMin } from './Lens'
import type { GetOptionFn, ModifyOptionFn_, Optional, POptional, POptionalMin } from './Optional'
import type { PPrism, PPrismMin, Prism } from './Prism'
import type { PSetter, PSetterMin } from './Setter'
import type { PTraversal, PTraversalMin } from './Traversal'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/Predicate'
import type * as P from '@principia/base/prelude'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Const'
import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/Identity'
import * as O from '@principia/base/Option'

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function makeFold<S, A>(_: FoldMin<S, A>): Fold<S, A> {
  return {
    foldMap_: _.foldMap_,
    foldMap: (M) => (f) => (s) => _.foldMap_(M)(s, f)
  }
}

export function makeGetter<S, A>(_: GetterMin<S, A>): Getter<S, A> {
  return {
    get: _.get,
    foldMap_: (_M) => (s, f) => f(_.get(s)),
    foldMap: (_M) => (f) => (s) => f(_.get(s))
  }
}

export function makePSetter<S, T, A, B>(_: PSetterMin<S, T, A, B>): PSetter<S, T, A, B> {
  return {
    modify_: _.modify_,
    modify: (f) => (s) => _.modify_(s, f),
    replace_: _.replace_,
    replace: (b) => (s) => _.replace_(s, b)
  }
}

export function makePTraversal<S, T, A, B>(_: PTraversalMin<S, T, A, B>): PTraversal<S, T, A, B> {
  return {
    modifyA_: _.modifyA_,
    modifyA: (F) => (f) => (s) => _.modifyA_(F)(s, f),
    ...makePSetter({
      modify_: (s, f) => _.modifyA_(I.Applicative)(s, f),
      replace_: (s, b) => _.modifyA_(I.Applicative)(s, () => b)
    }),
    ...makeFold({
      foldMap_:
        <M>(M: P.Monoid<M>) =>
        (s: S, f: (a: A) => M) =>
          _.modifyA_(C.getApplicative(M))(s, (a) => C.make(f(a)))
    })
  }
}

export function makePOptional<S, T, A, B>(_: POptionalMin<S, T, A, B>): POptional<S, T, A, B> {
  const getOption: GetOptionFn<S, A>               = flow(_.getOrModify, O.getRight)
  const modifyOption_: ModifyOptionFn_<S, T, A, B> = (s, f) =>
    pipe(
      getOption(s),
      O.map((a) => _.replace_(s, f(a)))
    )
  return {
    getOrModify: _.getOrModify,
    getOption,
    modifyOption_,
    modifyOption: (f) => (s) => modifyOption_(s, f),
    ...makePTraversal({
      modifyA_: (F) => (s, f) =>
        pipe(
          _.getOrModify(s),
          E.match(
            F.pure,
            flow(
              f,
              F.map((b) => _.replace_(s, b))
            )
          )
        )
    })
  }
}

export function makePPrism<S, T, A, B>(_: PPrismMin<S, T, A, B>): PPrism<S, T, A, B> {
  return {
    reverseGet: _.reverseGet,
    ...makePOptional({
      getOrModify: _.getOrModify,
      replace_: (s, b) =>
        pipe(
          _.getOrModify(s),
          E.match(identity, () => _.reverseGet(b))
        )
    })
  }
}

export function makePLens<S, T, A, B>(_: PLensMin<S, T, A, B>): PLens<S, T, A, B> {
  return {
    ...makePOptional({ replace_: _.replace_, getOrModify: flow(_.get, E.right) }),
    ...makeGetter({ get: _.get })
  }
}

export function makePIso<S, T, A, B>(_: PIsoMin<S, T, A, B>): PIso<S, T, A, B> {
  return {
    ...makePPrism({ getOrModify: flow(_.get, E.right), reverseGet: _.reverseGet }),
    ...makePLens({ get: _.get, replace_: (_s, b) => _.reverseGet(b) }),
    reverse: () =>
      makePIso({
        get: _.reverseGet,
        reverseGet: _.get
      })
  }
}

/*
 * -------------------------------------------
 * Internal Lens
 * -------------------------------------------
 */

export function lensId<S, T>(): PLens<S, T, S, T> {
  return makePLens({
    get: identity,
    replace_: (_, t) => t
  })
}

export function lensAndThenLens<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PLens<A, B, C, D>): PLens<S, T, C, D> {
  return makePLens({
    get: flow(sa.get, ab.get),
    replace_: (s, d) => sa.modify_(s, ab.replace(d))
  })
}

/** @internal */

/*
 * -------------------------------------------
 * Prism Internal
 * -------------------------------------------
 */

export function prismAndThenPrism<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: PPrism<A, B, C, D>
): PPrism<S, T, C, D> {
  return makePPrism({
    getOrModify: (s) =>
      pipe(
        sa.getOrModify(s),
        E.chain(
          flow(
            ab.getOrModify,
            E.bimap((b) => sa.replace_(s, b), identity)
          )
        )
      ),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  })
}

/** @internal */
export function prismAndThenLens<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: PLens<A, B, C, D>
): POptional<S, T, C, D> {
  return optionalAndThenOptional(sa, ab)
}

/** @internal */
export function prismFromNullable<A>(): Prism<A, NonNullable<A>> {
  return makePPrism({
    getOrModify: (a) => E.fromNullable_(a, () => a),
    reverseGet: identity
  })
}

/** @internal */
export function prismFromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return makePPrism({
    getOrModify: (a) => (predicate(a) ? E.right(a) : E.left(a)),
    reverseGet: identity
  })
}

/** @internal */
export function prismSome<A>(): Prism<Option<A>, A> {
  return makePPrism({
    getOrModify: O.match(() => E.left(O.none()), E.right),
    reverseGet: O.some
  })
}

/** @internal */
export function prismRight<E, A>(): Prism<Either<E, A>, A> {
  return makePPrism({
    getOrModify: E.match(flow(E.left, E.left), E.right),
    reverseGet: (a) => E.right(a)
  })
}

/** @internal */
export function prismLeft<E, A>(): Prism<E.Either<E, A>, E> {
  return makePPrism({
    getOrModify: E.match(E.right, flow(E.right, E.left)),
    reverseGet: (e) => E.left(e)
  })
}

/*
 * -------------------------------------------
 * Optional Internal
 * -------------------------------------------
 */

export function optionalAndThenOptional<S, T, A, B, C, D>(
  sa: POptional<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return makePOptional({
    getOrModify: (s) =>
      pipe(
        sa.getOrModify(s),
        E.chain(
          flow(
            ab.getOrModify,
            E.bimap((b) => sa.replace_(s, b), identity)
          )
        )
      ),
    replace_: (s, d) => sa.modify_(s, ab.replace(d))
  })
}

export function findFirst<A>(predicate: Predicate<A>): Optional<ReadonlyArray<A>, A> {
  return makePOptional({
    getOrModify: (s) =>
      pipe(
        s,
        A.find(predicate),
        O.match(() => E.left(s), E.right)
      ),
    replace_: (s, a) =>
      pipe(
        A.findIndex(predicate)(s),
        O.match(
          () => s,
          (i) => A.unsafeUpdateAt_(s, i, a)
        )
      )
  })
}

/*
 * -------------------------------------------
 * Traversal Internal
 * -------------------------------------------
 */

/** @internal */
export function traversalAndThenTraversal<S, T, A, B, C, D>(
  sa: PTraversal<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return makePTraversal({
    modifyA_: (F) => (s, f) => sa.modifyA_(F)(s, ab.modifyA(F)(f))
  })
}

/**
 * Create a `Traversal` from a `Traversable`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromTraversable<T extends HKT.URIS, C = HKT.Auto>(
  T: P.Traversable<T, C>
): <
  A,
  B,
  K = HKT.Initial<C, 'K'>,
  Q = HKT.Initial<C, 'Q'>,
  W = HKT.Initial<C, 'W'>,
  X = HKT.Initial<C, 'X'>,
  I = HKT.Initial<C, 'I'>,
  S = HKT.Initial<C, 'S'>,
  R = HKT.Initial<C, 'R'>,
  E = HKT.Initial<C, 'E'>,
  K1 = HKT.Initial<C, 'K'>,
  Q1 = HKT.Initial<C, 'Q'>,
  W1 = HKT.Initial<C, 'W'>,
  X1 = HKT.Initial<C, 'X'>,
  I1 = HKT.Initial<C, 'I'>,
  S1 = HKT.Initial<C, 'S'>,
  R1 = HKT.Initial<C, 'R'>,
  E1 = HKT.Initial<C, 'E'>
>() => PTraversal<HKT.Kind<T, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<T, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>, A, B> {
  return () =>
    makePTraversal({
      modifyA_: (F) => {
        const mapA_ = T.mapA_(F)
        return (s, f) => mapA_(s, f)
      }
    })
}
