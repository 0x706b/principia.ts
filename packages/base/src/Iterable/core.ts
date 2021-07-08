import type { Either } from '../Either'
import type * as HKT from '../HKT'
import type { IterableURI } from '../Modules'
import type { Option } from '../Option'

import * as Ev from '../Eval/core'
import * as O from '../Option'
import * as P from '../prelude'

type URI = [HKT.URI<IterableURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
}

export function iterable<A>(iterator: () => Iterator<A>): Iterable<A> {
  return {
    [Symbol.iterator]() {
      return iterator()
    }
  }
}

export function singleton<A>(a: A): Iterable<A> {
  return iterable(function* () {
    yield a
  })
}

export function makeBy<A>(n: number, f: (i: number) => A): Iterable<A> {
  return iterable(function* () {
    for (let i = 0; i < n; i++) {
      yield f(i)
    }
  })
}

export function range(start: number, end: number): Iterable<number> {
  return makeBy(end - start + 1, (i) => start + i)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<A, B, C>(fa: Iterable<A>, fb: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C): (fa: Iterable<A>) => Iterable<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

export function cross<B>(fb: Iterable<B>): <A>(fa: Iterable<A>) => Iterable<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function zipWith_<A, B, C>(fa: Iterable<A>, fb: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> {
  return iterable<C>(() => {
    let done = false
    const ia = fa[Symbol.iterator]()
    const ib = fb[Symbol.iterator]()
    return {
      next() {
        if (done) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return this.return!()
        }

        const va = ia.next()
        const vb = ib.next()

        return va.done || vb.done
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.return!()
          : { done: false, value: f(va.value, vb.value) }
      },
      return(value?: unknown) {
        if (!done) {
          done = true

          if (typeof ia.return === 'function') {
            ia.return()
          }
          if (typeof ib.return === 'function') {
            ib.return()
          }
        }

        return { done: true, value }
      }
    }
  })
}

export function zipWith<A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C): (fa: Iterable<A>) => Iterable<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function ap_<A, B>(fab: Iterable<(a: A) => B>, fa: Iterable<A>): Iterable<B> {
  return chain_(fab, (f) => map_(fa, f))
}

export function ap<A>(fa: Iterable<A>): <B>(fab: Iterable<(a: A) => B>) => Iterable<B> {
  return (fab) => ap_(fab, fa)
}

export function zip<B>(fb: Iterable<B>): <A>(fa: Iterable<A>) => Iterable<readonly [A, B]> {
  return (fa) => zipWith_(fa, fb, (a, b) => [a, b] as const)
}

export function zip_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b] as const)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Iterable<A> {
  return iterable(function* () {
    yield a
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function ifilter_<A, B extends A>(fa: Iterable<A>, refinement: P.RefinementWithIndex<number, A, B>): Iterable<B>
export function ifilter_<A>(fa: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): Iterable<A>
export function ifilter_<A>(fa: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): Iterable<A> {
  return iterable(function* () {
    let i = 0
    for (const value of fa) {
      if (predicate(i, value)) {
        yield value
      }
      i++
    }
  })
}

export function ifilter<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => Iterable<B>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<A, B extends A>(fa: Iterable<A>, refinement: P.Refinement<A, B>): Iterable<B>
export function filter_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): Iterable<A>
export function filter_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): Iterable<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Iterable<A>) => Iterable<B>
export function filter<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => Iterable<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => Iterable<A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => Option<B>): Iterable<B> {
  return iterable(function* () {
    let i = 0
    for (const value of fa) {
      const ob = f(i, value)
      if (ob._tag === 'Some') {
        yield ob.value
      }
      i++
    }
  })
}

export function ifilterMap<A, B>(f: (i: number, a: A) => Option<B>): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => ifilterMap_(fa, f)
}

export function filterMap_<A, B>(fa: Iterable<A>, f: (a: A) => Option<B>): Iterable<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => filterMap_(fa, f)
}

export function ipartition_<A, B extends A>(
  fa: Iterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [Iterable<A>, Iterable<B>]
export function ipartition_<A>(
  fa: Iterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Iterable<A>, Iterable<A>]
export function ipartition_<A>(
  fa: Iterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Iterable<A>, Iterable<A>] {
  return P.tuple(
    iterable(function* () {
      let n = 0
      for (const value of fa) {
        if (!predicate(n, value)) {
          yield value
        }
        n++
      }
    }),
    iterable(function* () {
      let n = 0
      for (const value of fa) {
        if (predicate(n, value)) {
          yield value
        }
        n++
      }
    })
  )
}

export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<B>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<A, B extends A>(
  fa: Iterable<A>,
  refinement: P.Refinement<A, B>
): readonly [Iterable<A>, Iterable<B>]
export function partition_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): readonly [Iterable<A>, Iterable<A>]
export function partition_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): readonly [Iterable<A>, Iterable<A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<B>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>] {
  return (fa) => partition_(fa, predicate)
}

export function ipartitionMap_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Iterable<B>, Iterable<C>] {
  return P.tuple(
    iterable(function* () {
      const mapped   = imap_(fa, f)
      const iterator = mapped[Symbol.iterator]()
      let result
      while (!(result = iterator.next()).done) {
        if (result.value._tag === 'Left') {
          yield result.value.left
        }
      }
    }),
    iterable(function* () {
      const mapped   = imap_(fa, f)
      const iterator = mapped[Symbol.iterator]()
      let result
      while (!(result = iterator.next()).done) {
        if (result.value._tag === 'Right') {
          yield result.value.right
        }
      }
    })
  )
}

export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (fa: Iterable<A>) => readonly [Iterable<B>, Iterable<C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<A, B, C>(
  fa: Iterable<A>,
  f: (a: A) => Either<B, C>
): readonly [Iterable<B>, Iterable<C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (fa: Iterable<A>) => readonly [Iterable<B>, Iterable<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: Iterable<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => {
    let res = M.nat
    let n   = -1
    for (const value of fa) {
      n  += 1
      res = M.combine_(res, f(n, value))
    }
    return res
  }
}

export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Iterable<A>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function ifoldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, i: number, a: A) => B): B {
  let res = b
  let n   = -1
  for (const value of fa) {
    n  += 1
    res = f(res, n, value)
  }
  return res
}

export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function ifoldr_<A, B>(
  fa: Iterable<A>,
  b: Ev.Eval<B>,
  f: (a: A, i: number, b: Ev.Eval<B>) => Ev.Eval<B>
): Ev.Eval<B> {
  let i                = 0
  const iterator       = fa[Symbol.iterator]()
  const go: Ev.Eval<B> = Ev.defer(() => {
    const { value: current, done } = iterator.next()
    if (done) {
      return b
    } else {
      return f(current, i++, go)
    }
  })
  return go
}

export function ifoldr<A, B>(
  b: Ev.Eval<B>,
  f: (a: A, i: number, b: Ev.Eval<B>) => Ev.Eval<B>
): (fa: Iterable<A>) => Ev.Eval<B> {
  return (fa) => ifoldr_(fa, b, f)
}

export function foldr_<A, B>(fa: Iterable<A>, b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): Ev.Eval<B> {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

export function foldr<A, B>(b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): (fa: Iterable<A>) => Ev.Eval<B> {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function imap_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> {
  return iterable(function* () {
    let n = -1
    for (const value of fa) {
      n += 1
      yield f(n, value)
    }
  })
}

export function imap<A, B>(f: (i: number, a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => imap_(fa, f)
}

export function map_<A, B>(fa: Iterable<A>, f: (a: A) => B): Iterable<B> {
  return imap_(fa, (_, a) => f(a))
}

export function map<A, B>(f: (a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
  return (ma) => chain_(ma, f)
}

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable(function* () {
    for (const outer of ma) {
      yield* f(outer)
    }
  })
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
  return chain_(mma, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const imapA_: P.MapWithIndexAFn_<[HKT.URI<IterableURI>]> = (AG) => (ta, f) =>
  ifoldl_(ta, AG.pure(never as Iterable<any>), (b, i, a) => AG.crossWith_(b, f(i, a), append_))

export const imapA: P.MapWithIndexAFn<[HKT.URI<IterableURI>]> = (AG) => {
  const _ = imapA_(AG)
  return (f) => (ta) => _(ta, f)
}

export const mapA_: P.MapAFn_<[HKT.URI<IterableURI>]> = (AG) => {
  const _ = imapA_(AG)
  return (ta, f) => _(ta, (_, a) => f(a))
}

export const mapA: P.MapAFn<[HKT.URI<IterableURI>]> = (AG) => {
  const _ = mapA_(AG)
  return (f) => (ta) => _(ta, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Iterable<void> {
  return pure(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function concat_<A>(ia: Iterable<A>, ib: Iterable<A>): Iterable<A> {
  return iterable(function* () {
    yield* ia
    yield* ib
  })
}

export function concat<A>(ib: Iterable<A>): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => concat_(ia, ib)
}

export function append_<A>(ia: Iterable<A>, element: A): Iterable<A> {
  return iterable(function* () {
    yield* ia
    yield element
  })
}

export function append<A>(element: A): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => append_(ia, element)
}

export function prepend_<A>(ia: Iterable<A>, element: A): Iterable<A> {
  return iterable(function* () {
    yield element
    yield* ia
  })
}

export function findFirst_<A, B extends A>(ia: Iterable<A>, refinement: P.Refinement<A, B>): Option<B>
export function findFirst_<A>(ia: Iterable<A>, predicate: P.Predicate<A>): Option<A>
export function findFirst_<A>(ia: Iterable<A>, predicate: P.Predicate<A>): Option<A> {
  for (const value of ia) {
    if (predicate(value)) {
      return O.some(value)
    }
  }
  return O.none()
}

export function findFirst<A, B extends A>(refinement: P.Refinement<A, B>): (ia: Iterable<A>) => Option<B>
export function findFirst<A>(predicate: P.Predicate<A>): (ia: Iterable<A>) => Option<A>
export function findFirst<A>(predicate: P.Predicate<A>): (ia: Iterable<A>) => Option<A> {
  return (ia) => findFirst_(ia, predicate)
}

export function take_<A>(ia: Iterable<A>, n: number): Iterable<A> {
  return iterable(function* () {
    let i = 0
    for (const value of ia) {
      yield value
      i++
      if (i >= n) break
    }
  })
}

export function take(n: number): <A>(fa: Iterable<A>) => Iterable<A> {
  return (fa) => take_(fa, n)
}

export function toArray<A>(fa: Iterable<A>): ReadonlyArray<A> {
  const as: A[] = []
  for (const value of fa) {
    as.push(value)
  }
  return as
}

/*
 * -------------------------------------------------------------------------------------------------
 * utils
 * -------------------------------------------------------------------------------------------------
 */

export function corresponds<A, B>(left: Iterable<A>, right: Iterable<B>, f: (a: A, b: B) => boolean): boolean {
  const leftIterator  = left[Symbol.iterator]()
  const rightIterator = right[Symbol.iterator]()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lnext = leftIterator.next()
    const rnext = rightIterator.next()
    if (lnext.done !== rnext.done) {
      return false
    }
    if (lnext.done) {
      return true
    }
    if (!f(lnext.value, rnext.value)) {
      return false
    }
  }
}

export function ievery_<A, B extends A>(
  as: Iterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): as is Iterable<B>
export function ievery_<A>(as: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): boolean
export function ievery_<A>(as: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): boolean {
  const iterator = as[Symbol.iterator]()
  let result     = true
  let i          = 0
  let next: IteratorResult<A>
  while (result && !(next = iterator.next()).done) {
    result = predicate(i, next.value)
    i++
  }
  return result
}

export function ievery<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (as: Iterable<A>) => as is Iterable<B>
export function ievery<A>(predicate: P.PredicateWithIndex<number, A>): (as: Iterable<A>) => boolean
export function ievery<A>(predicate: P.PredicateWithIndex<number, A>): (as: Iterable<A>) => boolean {
  return (as) => ievery_(as, predicate)
}

export function every_<A, B extends A>(as: Iterable<A>, refinement: P.Refinement<A, B>): as is Iterable<B>
export function every_<A>(as: Iterable<A>, predicate: P.Predicate<A>): boolean
export function every_<A>(as: Iterable<A>, predicate: P.Predicate<A>): boolean {
  return ievery_(as, (_, a) => predicate(a))
}

export function every<A, B extends A>(refinement: P.Refinement<A, B>): (as: Iterable<A>) => as is Iterable<B>
export function every<A>(predicate: P.Predicate<A>): (as: Iterable<A>) => boolean
export function every<A>(predicate: P.Predicate<A>): (as: Iterable<A>) => boolean {
  return (as) => every_(as, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI>({
  map_
})

export const FunctorWithIndex = P.FunctorWithIndex<URI>({
  imap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<URI>({
  imap_,
  ifilter_,
  ifilterMap_,
  ipartition_,
  ipartitionMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_,
  ifoldr_,
  ifoldMap_
})

export { IterableURI } from '../Modules'
