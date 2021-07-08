/*
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/ParSeq.scala
 */
import type { HashSet } from './HashSet'
import type * as HKT from './HKT'

import * as A from './Array/core'
import * as B from './boolean'
import * as E from './Either'
import * as Ev from './Eval'
import { flow, hole, identity, pipe } from './function'
import * as HS from './HashSet'
import * as L from './List/core'
import { FreeSemiringURI } from './Modules'
import * as P from './prelude'
import * as Eq from './Structural/Equatable'
import * as Ha from './Structural/Hashable'
import { tuple } from './tuple'
import { isObject } from './util/predicates'
import { LinkedList, LinkedListNode } from './util/support/LinkedList'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export { FreeSemiringURI }

export const FreeSemiringTypeId = Symbol()
export type FreeSemiringTypeId = typeof FreeSemiringTypeId

export const FreeSemiringTag = {
  Single: 'Single',
  Then: 'Then',
  Both: 'Both',
  Empty: 'Empty'
} as const

export class Single<A> {
  readonly [FreeSemiringTypeId]: FreeSemiringTypeId = FreeSemiringTypeId
  readonly _tag                                     = FreeSemiringTag.Single

  constructor(readonly value: A) {}

  get [Ha.$hash](): number {
    return Ha.hash(this.value)
  }
  [Eq.$equals](that: unknown): boolean {
    return isFreeSemiring(that) && this.equalsEval(that).value
  }

  equalsEval(that: FreeSemiring<any, unknown>): Ev.Eval<boolean> {
    return Ev.now(that._tag === FreeSemiringTag.Single && Eq.equals(this.value, that.value))
  }
}

export class Then<Z, A> {
  readonly [FreeSemiringTypeId]: FreeSemiringTypeId = FreeSemiringTypeId
  readonly _tag                                     = FreeSemiringTag.Then

  constructor(readonly left: FreeSemiring<Z, A>, readonly right: FreeSemiring<Z, A>) {}

  get [Ha.$hash](): number {
    return hashCode(this)
  }
  [Eq.$equals](that: unknown): boolean {
    return isFreeSemiring(that) && this.equalsEval(that).value
  }

  equalsEval(that: FreeSemiring<any, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      return (
        (yield* _(structuralEqualThen(self, that))) ||
        (yield* _(structuralSymmetric(structuralThenAssociate)(self, that))) ||
        (yield* _(structuralSymmetric(structuralThenDistribute)(self, that))) ||
        (yield* _(structuralSymmetric(structuralEqualEmpty)(self, that)))
      )
    })
  }
}

const _emptyHash = Ha.opt(Ha.randomInt())

export class Empty {
  readonly [FreeSemiringTypeId]: FreeSemiringTypeId = FreeSemiringTypeId
  readonly _tag                                     = FreeSemiringTag.Empty

  get [Ha.$hash](): number {
    return _emptyHash
  }
  [Eq.$equals](that: unknown): boolean {
    return isFreeSemiring(that) && this.equalsEval(that).value
  }

  equalsEval(that: FreeSemiring<any, unknown>): Ev.Eval<boolean> {
    return Ev.now(that._tag === FreeSemiringTag.Empty)
  }
}

export class Both<Z, A> {
  readonly [FreeSemiringTypeId]: FreeSemiringTypeId = FreeSemiringTypeId
  readonly _tag                                     = FreeSemiringTag.Both

  constructor(readonly left: FreeSemiring<Z, A>, readonly right: FreeSemiring<Z, A>) {}

  get [Ha.$hash](): number {
    return hashCode(this)
  }
  [Eq.$equals](that: unknown): boolean {
    return isFreeSemiring(that) && this.equalsEval(that).value
  }

  equalsEval(that: FreeSemiring<any, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      return (
        (yield* _(structuralEqualBoth(self, that))) ||
        (yield* _(structuralSymmetric(structuralBothAssociate)(self, that))) ||
        (yield* _(structuralSymmetric(structuralBothDistribute)(self, that))) ||
        (yield* _(structuralBothCommute(self, that))) ||
        (yield* _(structuralSymmetric(structuralEqualEmpty)(self, that)))
      )
    })
  }
}

/**
 * `FreeSemiring` is an algebraic structure that generalizes fields of type `A`,
 * having an identity element `Empty`, an additive operation `Then`, and a multiplicative
 * operation `Both`.
 *
 * It can be used to represent some notion of "events" that can
 * take place in parallel or in sequence. For example, a `FreeSemiring`
 * parameterized on some error type could be used to model the potentially
 * multiple ways that an application can fail. On the other hand, a `FreeSemiring`
 * parameterized on some request type could be used to model a collection of
 * requests to external data sources, some of which could be executed in
 * parallel and some of which must be executed sequentially.
 *
 * The "emptiness" of the structure is parameterized on `Z`, making it more
 * simple to define folds specifically for non-empty structures. `void` represents
 * an empty structure, while `never` represents a non-empty structure
 */
export type FreeSemiring<Z, A> = Empty | Single<A> | Then<Z, A> | Both<Z, A>

export type V = HKT.V<'X', '+'>

export function isFreeSemiring(u: unknown): u is FreeSemiring<unknown, unknown> {
  return isObject(u) && FreeSemiringTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function single<A>(a: A): FreeSemiring<never, A> {
  return new Single(a)
}

export function empty<A>(): FreeSemiring<void, A> {
  return new Empty()
}

export function then<Z, A, B>(left: FreeSemiring<Z, A>, right: FreeSemiring<Z, B>): FreeSemiring<Z, A | B> {
  return new Then<Z, A | B>(left, right)
}

export function both<Z, A, B>(left: FreeSemiring<Z, A>, right: FreeSemiring<Z, B>): FreeSemiring<Z, A | B> {
  return new Both<Z, A | B>(left, right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */
function foldLoop<A, B>(
  onEmpty: B,
  onSingle: (a: A) => B,
  onThen: (l: B, r: B) => B,
  onBoth: (l: B, r: B) => B,
  input: LinkedList<FreeSemiring<any, A>>,
  output: LinkedList<E.Either<boolean, B>>
): LinkedList<B> {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  for (;;) {
    if (input.empty) {
      return output.foldl(new LinkedList(), (acc, val) => {
        if (val._tag === 'Right') {
          acc.prepend(val.right)
          return acc
        } else {
          if (val.left) {
            const left  = acc.unprepend()!
            const right = acc.unprepend()!
            acc.prepend(onBoth(left!, right!))
            return acc
          } else {
            const left  = acc.unprepend()!
            const right = acc.unprepend()!
            acc.prepend(onThen(left!, right!))
            return acc
          }
        }
      })
    } else {
      const head    = input.head!.value!
      const parSeqs = input.head!.next!
      /* eslint-disable no-param-reassign */
      switch (head._tag) {
        case FreeSemiringTag.Empty: {
          input = new LinkedList(parSeqs)
          output.prepend(E.right(onEmpty))
          break
        }
        case FreeSemiringTag.Single: {
          input = new LinkedList(parSeqs)
          output.prepend(E.right(onSingle(head.value)))
          break
        }
        case FreeSemiringTag.Then: {
          input = new LinkedList(parSeqs)
          input.prepend(head.right)
          input.prepend(head.left)
          output.prepend(E.left(false))
          break
        }
        case FreeSemiringTag.Both: {
          input = new LinkedList(parSeqs)
          input.prepend(head.right)
          input.prepend(head.left)
          output.prepend(E.left(true))
          break
        }
      }
      /* eslint-enable */
    }
  }
}

/**
 * Folds over the events in this collection of events using the specified
 * functions.
 */
export function fold_<Z, A, B>(
  fs: FreeSemiring<Z, A>,
  emptyCase: B,
  singleCase: (a: A) => B,
  thenCase: (l: B, r: B) => B,
  bothCase: (l: B, r: B) => B
): B {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return foldLoop(
    emptyCase,
    singleCase,
    thenCase,
    bothCase,
    new LinkedList<FreeSemiring<any, A>>(new LinkedListNode(fs)),
    new LinkedList()
  ).head!.value!
}

export function fold<A, B>(
  onEmpty: B,
  onSingle: (a: A) => B,
  onThen: (l: B, r: B) => B,
  onBoth: (l: B, r: B) => B
): <Z>(fs: FreeSemiring<Z, A>) => B {
  return (fs) => fold_(fs, onEmpty, onSingle, onThen, onBoth)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<Z, A, Z1, B, C>(
  fa: FreeSemiring<Z, A>,
  fb: FreeSemiring<Z1, B>,
  f: (a: A, b: B) => C
): FreeSemiring<Z | Z1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, Z1, B, C>(
  fb: FreeSemiring<Z1, B>,
  f: (a: A, b: B) => C
): <Z>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<Z, A, Z1, B>(
  fa: FreeSemiring<Z, A>,
  fb: FreeSemiring<Z1, B>
): FreeSemiring<Z | Z1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<Z1, B>(
  fb: FreeSemiring<Z1, B>
): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<Z, A, Z1, B>(fab: FreeSemiring<Z, (a: A) => B>, fa: FreeSemiring<Z1, A>): FreeSemiring<Z | Z1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<Z1, A>(
  fa: FreeSemiring<Z1, A>
): <Z, B>(fab: FreeSemiring<Z, (a: A) => B>) => FreeSemiring<Z | Z1, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<Z, A, Z1, B>(fa: FreeSemiring<Z, A>, fb: FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<Z1, B>(fb: FreeSemiring<Z1, B>): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<Z, A, Z1, B>(fa: FreeSemiring<Z, A>, fb: FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<Z1, B>(fb: FreeSemiring<Z1, B>): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, B> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<Z, A, B>(fa: FreeSemiring<Z, A>, f: (a: A) => B): FreeSemiring<Z, B> {
  return chain_(fa, (a) => single(f(a)))
}

export function map<A, B>(f: (a: A) => B): <Z>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z, B> {
  return (fa) => map_(fa, f)
}

export function as_<Z, A, B>(fa: FreeSemiring<Z, A>, b: B): FreeSemiring<Z, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z, B> {
  return (fa) => as_(fa, b)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<Z, A, Z1, B>(ma: FreeSemiring<Z, A>, f: (a: A) => FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, B> {
  return fold_(ma, empty(), f, then, both)
}

export function chain<A, Z1, B>(
  f: (a: A) => FreeSemiring<Z1, B>
): <Z>(ma: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<Z, Z1, A>(ma: FreeSemiring<Z, FreeSemiring<Z1, A>>): FreeSemiring<Z | Z1, A> {
  return chain_(ma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapAFn_<[HKT.URI<FreeSemiringURI>]> = (AG) => (ta, f) =>
  fold_(
    ta,
    AG.pure(empty()),
    flow(f, AG.map(single)),
    (gb1, gb2) => AG.crossWith_(gb1, gb2, then),
    (gb1, gb2) => AG.crossWith_(gb1, gb2, both)
  )

export const mapA: P.MapAFn<[HKT.URI<FreeSemiringURI>]> = (AG) => {
  const mapA__ = mapA_(AG)
  return (f) => (ta) => mapA__(ta, f)
}

export const sequence: P.SequenceFn<[HKT.URI<FreeSemiringURI>]> = (AG) => {
  const mapA__ = mapA_(AG)
  return (ta) => mapA__(ta, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function first<A>(ma: FreeSemiring<never, A>): A {
  let current = ma
  for (;;) {
    switch (current._tag) {
      case FreeSemiringTag.Empty: {
        return hole<A>()
      }
      case FreeSemiringTag.Single: {
        return current.value
      }
      case FreeSemiringTag.Both: {
        current = current.left
        break
      }
      case FreeSemiringTag.Then: {
        current = current.left
        break
      }
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<FreeSemiring<any, A>> {
  const equalsE = equals_(E)
  return P.Eq((x, y) => equalsE(x, y).value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

function equals_<A>(E: P.Eq<A>): (l: FreeSemiring<any, A>, r: FreeSemiring<any, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (l._tag) {
      case FreeSemiringTag.Empty: {
        if (r._tag !== FreeSemiringTag.Empty) {
          return Ev.pure(false)
        }
        return Ev.pure(true)
      }
      case FreeSemiringTag.Single: {
        if (r._tag !== FreeSemiringTag.Single) {
          return Ev.pure(false)
        }
        return Ev.pure(E.equals_(l.value, r.value))
      }
      case FreeSemiringTag.Both: {
        return pipe(
          Ev.sequenceT(
            equalBoth(E, l, r),
            symmetric(bothAssociate)(E, l, r),
            symmetric(bothDistribute)(E, l, r),
            bothCommute(E, l, r),
            symmetric(equalEmpty)(E, l, r)
          ),
          Ev.map(A.foldl(false, B.or_))
        )
      }
      case FreeSemiringTag.Then: {
        return pipe(
          Ev.sequenceT(
            equalThen(E, l, r),
            symmetric(thenAssociate)(E, l, r),
            symmetric(thenDistribute)(E, l, r),
            symmetric(equalEmpty)(E, l, r)
          ),
          Ev.map(A.foldl(false, B.or_))
        )
      }
    }
  }
}

function symmetric<X, A>(
  f: (E: P.Eq<A>, x: FreeSemiring<X, A>, y: FreeSemiring<X, A>) => Ev.Eval<boolean>
): (E: P.Eq<A>, x: FreeSemiring<X, A>, y: FreeSemiring<X, A>) => Ev.Eval<boolean> {
  return (E, x, y) => Ev.crossWith_(f(E, x, y), f(E, y, x), B.or_)
}

function bothAssociate<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.right._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function bothDistribute<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.left, l.right.left),
        equalsE(l.left.left, r.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.left._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.right, l.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.left.right, r.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function bothCommute<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === FreeSemiringTag.Both && r._tag === FreeSemiringTag.Both) {
    return Ev.crossWith_(equalsE(l.left, r.right), equalsE(l.right, r.left), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function thenAssociate<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === FreeSemiringTag.Then &&
    l.left._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function thenDistribute<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.right._tag === FreeSemiringTag.Then &&
    r.left._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.left, r.right.left),
        equalsE(l.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === FreeSemiringTag.Then &&
    l.left._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.left._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.right, r.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right, r.left.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function equalBoth<A>(E: P.Eq<A>, l: FreeSemiring<never, A>, r: FreeSemiring<never, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === FreeSemiringTag.Both && r._tag === FreeSemiringTag.Both) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalThen<A>(E: P.Eq<A>, l: FreeSemiring<never, A>, r: FreeSemiring<never, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === FreeSemiringTag.Then && r._tag === FreeSemiringTag.Then) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalEmpty<A>(E: P.Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === FreeSemiringTag.Then || l._tag === FreeSemiringTag.Both) {
    if (l.left._tag === FreeSemiringTag.Empty) {
      return equalsE(l.right, r)
    } else if (l.right._tag === FreeSemiringTag.Empty) {
      return equalsE(l.left, r)
    } else {
      return Ev.pure(false)
    }
  } else {
    return Ev.pure(false)
  }
}

function structuralSymmetric<A>(
  f: (x: FreeSemiring<any, A>, y: FreeSemiring<any, A>) => Ev.Eval<boolean>
): (x: FreeSemiring<any, A>, y: FreeSemiring<any, A>) => Ev.Eval<boolean> {
  return (x, y) => Ev.crossWith_(f(x, y), f(y, x), B.or_)
}

function structuralEqualEmpty<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (l._tag === FreeSemiringTag.Then || l._tag === FreeSemiringTag.Both) {
    if (l.left._tag === FreeSemiringTag.Empty) {
      return l.right.equalsEval(r)
    } else if (l.right._tag === FreeSemiringTag.Empty) {
      return l.left.equalsEval(r)
    } else {
      return Ev.pure(false)
    }
  } else {
    return Ev.pure(false)
  }
}

function structuralThenAssociate<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (
    l._tag === FreeSemiringTag.Then &&
    l.left._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralThenDistribute<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (
    l._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.right._tag === FreeSemiringTag.Then &&
    r.left._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        r.left.left.equalsEval(r.right.left),
        l.left.equalsEval(r.left.left),
        l.right.left.equalsEval(r.left.right),
        l.right.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === FreeSemiringTag.Then &&
    l.left._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.left._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        r.left.right.equalsEval(r.right.right),
        l.left.left.equalsEval(r.left.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.left.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralEqualThen<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (l._tag === FreeSemiringTag.Then && r._tag === FreeSemiringTag.Then) {
    return Ev.crossWith_(l.left.equalsEval(r.left), l.right.equalsEval(r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function structuralBothAssociate<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Both &&
    r._tag === FreeSemiringTag.Both &&
    r.right._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralBothDistribute<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.right._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(l.right.left),
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === FreeSemiringTag.Both &&
    l.left._tag === FreeSemiringTag.Then &&
    l.right._tag === FreeSemiringTag.Then &&
    r._tag === FreeSemiringTag.Then &&
    r.left._tag === FreeSemiringTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.right.equalsEval(l.right.right),
        l.left.left.equalsEval(r.left.left),
        l.right.left.equalsEval(r.left.right),
        l.left.right.equalsEval(r.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralBothCommute<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (l._tag === FreeSemiringTag.Both && r._tag === FreeSemiringTag.Both) {
    return Ev.crossWith_(l.left.equalsEval(r.right), l.right.equalsEval(r.left), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function structuralEqualBoth<A>(l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  if (l._tag === FreeSemiringTag.Both && r._tag === FreeSemiringTag.Both) {
    return Ev.crossWith_(l.left.equalsEval(r.left), l.right.equalsEval(r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * hash internals
 * -------------------------------------------------------------------------------------------------
 */

function stepLoop<A>(
  fa: FreeSemiring<any, A>,
  stack: L.List<FreeSemiring<any, A>>,
  parallel: HashSet<FreeSemiring<any, A>>,
  sequential: L.List<FreeSemiring<any, A>>
): readonly [HashSet<FreeSemiring<any, A>>, L.List<FreeSemiring<any, A>>] {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    /* eslint-disable no-param-reassign */
    switch (fa._tag) {
      case FreeSemiringTag.Empty: {
        if (L.isEmpty(stack)) {
          return tuple(parallel, sequential)
        } else {
          fa    = L.unsafeHead(stack)!
          stack = L.tail(stack)
        }
        break
      }
      case FreeSemiringTag.Then: {
        const left  = fa.left
        const right = fa.right
        switch (left._tag) {
          case FreeSemiringTag.Empty: {
            fa = right
            break
          }
          case FreeSemiringTag.Then: {
            fa = then(left.left, then(left.right, right))
            break
          }
          case FreeSemiringTag.Both: {
            fa = both(then(left.left, right), then(left.right, right))
            break
          }
          default: {
            fa         = left
            sequential = L.prepend_(sequential, right)
          }
        }
        break
      }
      case FreeSemiringTag.Both: {
        stack = L.prepend_(stack, fa.right)
        fa    = fa.left
        break
      }
      default: {
        if (L.isEmpty(stack)) {
          return tuple(HS.add_(parallel, fa), sequential)
        } else {
          fa       = L.unsafeHead(stack)!
          stack    = L.tail(stack)
          parallel = HS.add_(parallel, fa)
          break
        }
      }
    }
  }
  return hole()
  /* eslint-enable no-param-reassign */
}

function step<A>(fa: FreeSemiring<any, A>): readonly [HashSet<FreeSemiring<any, A>>, L.List<FreeSemiring<any, A>>] {
  return stepLoop(fa, L.empty(), HS.makeDefault(), L.empty())
}

function flattenLoop<A>(
  fas: L.List<FreeSemiring<any, A>>,
  flattened: L.List<HashSet<FreeSemiring<any, A>>>
): L.List<HashSet<FreeSemiring<any, A>>> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = L.foldl_(
      fas,
      tuple(HS.makeDefault<FreeSemiring<any, A>>(), L.empty<FreeSemiring<any, A>>()),
      ([parallel, sequential], fa) => {
        const [set, seq] = step(fa)
        return tuple(HS.union_(parallel, set), L.concat_(sequential, seq))
      }
    )
    const updated = HS.size(parallel) > 0 ? L.prepend_(flattened, parallel) : flattened
    if (L.isEmpty(sequential)) {
      return L.reverse(updated)
    } else {
      /* eslint-disable no-param-reassign */
      fas       = sequential
      flattened = updated
      /* eslint-enable no-param-reassign */
    }
  }
  return hole()
}

function flat<A>(fa: FreeSemiring<any, A>): L.List<HashSet<FreeSemiring<any, A>>> {
  return flattenLoop(L.single(fa), L.empty())
}

function hashCode<A>(fa: FreeSemiring<any, A>): number {
  const flattened = flat(fa)
  const size      = L.length(flattened)
  let head
  if (size === 0) {
    return _emptyHash
  } else if (size === 1 && (head = L.unsafeHead(flattened)!) && HS.size(head) === 1) {
    return L.unsafeHead(L.from(head))![Ha.$hash]
  } else {
    return Ha.hashIterator(flattened[Symbol.iterator]())
  }
}
