import type { Either } from '../Either'
import type * as HKT from '../HKT'
import type * as E from '../internal/Either'
import type { Maybe } from '../Maybe'
import type { IterableURI } from '../Modules'
import type * as P from '../prelude'

import * as Ev from '../Eval/core'
import { identity } from '../function'
import * as It from '../internal/Iterable'
import * as M from '../Maybe'
import { tuple } from '../tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const never: Iterable<never> = It.never

export const empty: <A>() => Iterable<A> = It.empty

export const iterable = It.iterable

export function singleton<A>(a: A): Iterable<A> {
  return iterable((): Iterator<A> => {
    let done = false
    return {
      next: () => {
        if (done) {
          return { done, value: undefined }
        }
        done = true
        return { done: false, value: a }
      }
    }
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

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C): (fa: Iterable<A>) => Iterable<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
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

/**
 * @dataFirst zipWith_
 */
export function zipWith<A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C): (fa: Iterable<A>) => Iterable<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function ap_<A, B>(fab: Iterable<(a: A) => B>, fa: Iterable<A>): Iterable<B> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * @dataFirst ap_
 */
export function ap<A>(fa: Iterable<A>): <B>(fab: Iterable<(a: A) => B>) => Iterable<B> {
  return (fab) => ap_(fab, fa)
}

export function zip_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b] as const)
}

/**
 * @dataFirst zip_
 */
export function zip<B>(fb: Iterable<B>): <A>(fa: Iterable<A>) => Iterable<readonly [A, B]> {
  return (fa) => zipWith_(fa, fb, (a, b) => [a, b] as const)
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

export function filter_<A, B extends A>(fa: Iterable<A>, refinement: P.RefinementWithIndex<number, A, B>): Iterable<B>
export function filter_<A>(fa: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): Iterable<A>
export function filter_<A>(fa: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): Iterable<A> {
  return iterable(function* () {
    let i = 0
    for (const value of fa) {
      if (predicate(value, i)) {
        yield value
      }
      i++
    }
  })
}

/**
 * @dataFirst filter_
 */
export function filter<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => Iterable<B>
/**
 * @dataFirst filter_
 */
export function filter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A>
export function filter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMap_<A, B>(fa: Iterable<A>, f: (a: A, i: number) => Maybe<B>): Iterable<B> {
  return iterable(function* () {
    let i = 0
    for (const value of fa) {
      const ob = f(value, i)
      if (ob._tag === 'Just') {
        yield ob.value
      }
      i++
    }
  })
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A, i: number) => Maybe<B>): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => filterMap_(fa, f)
}

export function partition_<A, B extends A>(
  fa: Iterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [Iterable<A>, Iterable<B>]
export function partition_<A>(
  fa: Iterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Iterable<A>, Iterable<A>]
export function partition_<A>(
  fa: Iterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Iterable<A>, Iterable<A>] {
  return tuple(
    iterable(function* () {
      let i = 0
      for (const value of fa) {
        if (!predicate(value, i)) {
          yield value
        }
        i++
      }
    }),
    iterable(function* () {
      let i = 0
      for (const value of fa) {
        if (predicate(value, i)) {
          yield value
        }
        i++
      }
    })
  )
}

/**
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<B>]
/**
 * @dataFirst partition_
 */
export function partition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>]
export function partition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(
  fa: Iterable<A>,
  f: (a: A, i: number) => Either<B, C>
): readonly [Iterable<B>, Iterable<C>] {
  return tuple(
    iterable(function* () {
      const mapped   = map_(fa, f)
      const iterator = mapped[Symbol.iterator]()
      let result
      while (!(result = iterator.next()).done) {
        if (result.value._tag === 'Left') {
          yield result.value.left
        }
      }
    }),
    iterable(function* () {
      const mapped   = map_(fa, f)
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

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<A, B, C>(
  f: (a: A, i: number) => Either<B, C>
): (fa: Iterable<A>) => readonly [Iterable<B>, Iterable<C>] {
  return (fa) => partitionMap_(fa, f)
}

export function separate<A, B>(fa: Iterable<E.Either<A, B>>): readonly [Iterable<A>, Iterable<B>] {
  return partitionMap_(fa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Iterable<A>, f: (a: A, i: number) => M) => M {
  return (fa, f) => {
    let res = M.nat
    let n   = -1
    for (const value of fa) {
      n  += 1
      res = M.combine_(res, f(value, n))
    }
    return res
  }
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A, i: number) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function foldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B {
  let res = b
  let i   = -1
  for (const value of fa) {
    i  += 1
    res = f(res, value, i)
  }
  return res
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A, i: number) => B): (fa: Iterable<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(
  fa: Iterable<A>,
  b: Ev.Eval<B>,
  f: (a: A, b: Ev.Eval<B>, i: number) => Ev.Eval<B>
): Ev.Eval<B> {
  let i                = 0
  const iterator       = fa[Symbol.iterator]()
  const go: Ev.Eval<B> = Ev.defer(() => {
    const { value: current, done } = iterator.next()
    if (done) {
      return b
    } else {
      return f(current, go, i++)
    }
  })
  return go
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(
  b: Ev.Eval<B>,
  f: (a: A, b: Ev.Eval<B>, i: number) => Ev.Eval<B>
): (fa: Iterable<A>) => Ev.Eval<B> {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Iterable<A>, f: (a: A, i: number) => B): Iterable<B> {
  return iterable(function* () {
    let i = -1
    for (const value of fa) {
      i += 1
      yield f(value, i)
    }
  })
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A, i: number) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable(function* () {
    for (const outer of ma) {
      yield* f(outer)
    }
  })
}

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRecDepthFirst_<A, B>(a: A, f: (a: A) => Iterable<Either<A, B>>): Iterable<B> {
  return iterable(function* () {
    for (const ab of f(a)) {
      if (ab._tag === 'Left') {
        yield* chainRecDepthFirst_(ab.left, f)
      } else {
        yield ab.right
      }
    }
  })
}

/**
 * @dataFirst chainRecDepthFirst_
 */
export function chainRecDepthFirst<A, B>(f: (a: A) => Iterable<Either<A, B>>): (a: A) => Iterable<B> {
  return (a) => chainRecDepthFirst_(a, f)
}

export function chainRecBreadthFirst_<A, B>(a: A, f: (a: A) => Iterable<Either<A, B>>): Iterable<B> {
  return iterable(function* () {
    const initial = f(a)
    let buffer: Array<Iterable<Either<A, B>>> = []

    function go(e: Either<A, B>): M.Maybe<B> {
      if (e._tag === 'Left') {
        buffer.push(f(e.left))
        return M.nothing()
      } else {
        return M.just(e.right)
      }
    }

    for (const e of initial) {
      const ob = go(e)
      if (M.isJust(ob)) {
        yield ob.value
      }
    }

    while (buffer.length) {
      for (const e of buffer.shift()!) {
        const ob = go(e)
        if (M.isJust(ob)) {
          yield ob.value
        }
      }
    }
  })
}

/**
 * @dataFirst chainRecBreadthFirst_
 */
export function chainRecBreadthFirst<A, B>(f: (a: A) => Iterable<Either<A, B>>): (a: A) => Iterable<B> {
  return (a) => chainRecBreadthFirst_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const traverse_: P.TraverseIndexFn_<[HKT.URI<IterableURI>]> = (AG) => (ta, f) =>
  foldl_(ta, AG.pure(never as Iterable<any>), (b, a, i) => AG.crossWith_(b, f(a, i), append_))

/**
 * @dataFirst traverse_
 */
export const traverse: P.MapWithIndexAFn<[HKT.URI<IterableURI>]> = (AG) => {
  const _ = traverse_(AG)
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

/**
 * @dataFirst concat_
 */
export function concat<A>(ib: Iterable<A>): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => concat_(ia, ib)
}

export const append_: <A>(ia: Iterable<A>, element: A) => Iterable<A> = It.append_

/**
 * @dataFirst append_
 */
export const append: <A>(element: A) => (ia: Iterable<A>) => Iterable<A> = It.append

export function prepend_<A>(ia: Iterable<A>, element: A): Iterable<A> {
  return iterable(function* () {
    yield element
    yield* ia
  })
}

/**
 * @dataFirst prepend_
 */
export function prepend<A>(element: A): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => prepend_(ia, element)
}

export function find_<A, B extends A>(ia: Iterable<A>, refinement: P.Refinement<A, B>): Maybe<B>
export function find_<A>(ia: Iterable<A>, predicate: P.Predicate<A>): Maybe<A>
export function find_<A>(ia: Iterable<A>, predicate: P.Predicate<A>): Maybe<A> {
  for (const value of ia) {
    if (predicate(value)) {
      return M.just(value)
    }
  }
  return M.nothing()
}

/**
 * @dataFirst find_
 */
export function find<A, B extends A>(refinement: P.Refinement<A, B>): (ia: Iterable<A>) => Maybe<B>
export function find<A>(predicate: P.Predicate<A>): (ia: Iterable<A>) => Maybe<A>
export function find<A>(predicate: P.Predicate<A>): (ia: Iterable<A>) => Maybe<A> {
  return (ia) => find_(ia, predicate)
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

/**
 * @dataFirst take_
 */
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

export function every_<A, B extends A>(
  as: Iterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): as is Iterable<B>
export function every_<A>(as: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): boolean
export function every_<A>(as: Iterable<A>, predicate: P.PredicateWithIndex<number, A>): boolean {
  const iterator = as[Symbol.iterator]()
  let result     = true
  let i          = 0
  let next: IteratorResult<A>
  while (result && !(next = iterator.next()).done) {
    result = predicate(next.value, i)
    i++
  }
  return result
}

/**
 * @dataFirst every_
 */
export function every<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (as: Iterable<A>) => as is Iterable<B>
export function every<A>(predicate: P.PredicateWithIndex<number, A>): (as: Iterable<A>) => boolean
export function every<A>(predicate: P.PredicateWithIndex<number, A>): (as: Iterable<A>) => boolean {
  return (as) => every_(as, predicate)
}
