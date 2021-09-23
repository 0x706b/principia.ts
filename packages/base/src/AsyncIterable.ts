import type { Either } from './Either'
import type * as HKT from './HKT'
import type { AsyncIterableURI } from './Modules'
import type { Option } from './Option'

import { identity } from './function'
import * as P from './prelude'
import { tuple } from './tuple'

type URI = [HKT.URI<AsyncIterableURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function asyncIterable<A>(iterator: () => AsyncIterator<A>): AsyncIterable<A> {
  return {
    [Symbol.asyncIterator]() {
      return iterator()
    }
  }
}

export function unit(): AsyncIterable<void> {
  return asyncIterable(async function* () {
    yield undefined
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function zipWith_<A, B, C>(fa: AsyncIterable<A>, fb: AsyncIterable<B>, f: (a: A, b: B) => C): AsyncIterable<C> {
  return asyncIterable<C>(() => {
    let done = false
    const ia = fa[Symbol.asyncIterator]()
    const ib = fb[Symbol.asyncIterator]()
    return {
      async next() {
        if (done) {
          return this.return!()
        }

        const [va, vb] = await Promise.all([ia.next(), ib.next()])
        return va.done || vb.done ? this.return!() : { done: false, value: f(va.value, vb.value) }
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
        return Promise.resolve({ done: true, value })
      }
    }
  })
}

export function zipWith<A, B, C>(
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => C
): (fa: AsyncIterable<A>) => AsyncIterable<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zip_<A, B>(fa: AsyncIterable<A>, fb: AsyncIterable<B>): AsyncIterable<readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

export function zip<B>(fb: AsyncIterable<B>): <A>(fa: AsyncIterable<A>) => AsyncIterable<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWithPromise_<A, B, C>(
  fa: AsyncIterable<A>,
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => Promise<C>
): AsyncIterable<C> {
  return asyncIterable<C>(() => {
    let done = false
    const ia = fa[Symbol.asyncIterator]()
    const ib = fb[Symbol.asyncIterator]()
    return {
      async next() {
        if (done) {
          return this.return!()
        }

        const [va, vb] = await Promise.all([ia.next(), ib.next()])
        if (va.done || vb.done) {
          return this.return!()
        }
        const value = await f(va.value, vb.value)
        return { done: false, value }
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
        return Promise.resolve({ done: true, value })
      }
    }
  })
}

export function zipWithPromise<A, B, C>(
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => Promise<C>
): (fa: AsyncIterable<A>) => AsyncIterable<C> {
  return (fa) => zipWithPromise_(fa, fb, f)
}

export function crossWith_<A, B, C>(
  fa: AsyncIterable<A>,
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => C
): AsyncIterable<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, B, C>(
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => C
): (fa: AsyncIterable<A>) => AsyncIterable<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function crossWithPromise_<A, B, C>(
  fa: AsyncIterable<A>,
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => Promise<C>
): AsyncIterable<C> {
  return chain_(fa, (a) => mapPromise_(fb, (b) => f(a, b)))
}

export function cross_<A, B>(fa: AsyncIterable<A>, fb: AsyncIterable<B>): AsyncIterable<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<B>(fb: AsyncIterable<B>): <A>(fa: AsyncIterable<A>) => AsyncIterable<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<A, B>(fab: AsyncIterable<(a: A) => B>, fa: AsyncIterable<A>): AsyncIterable<B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

export function ap<A>(fa: AsyncIterable<A>): <B>(fab: AsyncIterable<(a: A) => B>) => AsyncIterable<B> {
  return (fab) => ap_(fab, fa)
}

export function apPromise_<A, B>(fab: AsyncIterable<(a: A) => Promise<B>>, fa: AsyncIterable<A>): AsyncIterable<B> {
  return chain_(fab, (f) => mapPromise_(fa, (a) => f(a)))
}

export function apPromise<A>(fa: AsyncIterable<A>): <B>(fab: AsyncIterable<(a: A) => Promise<B>>) => AsyncIterable<B> {
  return (fab) => apPromise_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield a
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(
  fa: AsyncIterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): AsyncIterable<B>
export function filter_<A>(fa: AsyncIterable<A>, predicate: P.PredicateWithIndex<number, A>): AsyncIterable<A>
export function filter_<A>(fa: AsyncIterable<A>, predicate: P.PredicateWithIndex<number, A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    let i    = -1
    const it = fa[Symbol.asyncIterator]()
    for (;;) {
      const result = await it.next()
      if (result.done) {
        break
      }
      i += 1
      if (predicate(result.value, i)) {
        yield result.value
      }
    }
  })
}

export function filter<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: AsyncIterable<A>) => AsyncIterable<B>
export function filter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: AsyncIterable<A>) => AsyncIterable<A>
export function filter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMap_<A, B>(fa: AsyncIterable<A>, f: (a: A, i: number) => Option<B>): AsyncIterable<B> {
  return asyncIterable(async function* () {
    let i = -1
    for await (const a of fa) {
      i       += 1
      const ob = f(a, i)
      if (ob._tag === 'Some') {
        yield ob.value
      }
    }
  })
}

export function filterMap<A, B>(f: (a: A, i: number) => Option<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => filterMap_(fa, f)
}

export function partition_<A, B extends A>(
  fa: AsyncIterable<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [AsyncIterable<A>, AsyncIterable<B>]
export function partition_<A>(
  fa: AsyncIterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [AsyncIterable<A>, AsyncIterable<A>]
export function partition_<A>(
  fa: AsyncIterable<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [AsyncIterable<A>, AsyncIterable<A>] {
  return tuple(
    asyncIterable(async function* () {
      let n = -1
      for await (const a of fa) {
        n += 1
        if (!predicate(a, n)) {
          yield a
        }
      }
    }),
    asyncIterable(async function* () {
      let n = -1
      for await (const a of fa) {
        n += 1
        if (predicate(a, n)) {
          yield a
        }
      }
    })
  )
}

export function partition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<A>, AsyncIterable<B>]
export function partition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<A>, AsyncIterable<A>]
export function partition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<A>, AsyncIterable<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(
  fa: AsyncIterable<A>,
  f: (a: A, i: number) => Either<B, C>
): readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return tuple(
    asyncIterable(async function* () {
      const mapped = map_(fa, f)
      for await (const ea of mapped) {
        if (ea._tag === 'Left') {
          yield ea.left
        }
      }
    }),
    asyncIterable(async function* () {
      const mapped = map_(fa, f)
      for await (const ea of mapped) {
        if (ea._tag === 'Right') {
          yield ea.right
        }
      }
    })
  )
}

export function partitionMap<A, B, C>(
  f: (a: A, i: number) => Either<B, C>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: AsyncIterable<A>, f: (a: A, i: number) => M) => Promise<M> {
  return async (fa, f) => {
    let res = M.nat
    let n   = 0
    for await (const a of fa) {
      res = M.combine_(res, f(a, n))
      n++
    }
    return res
  }
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A, i: number) => M) => (fa: AsyncIterable<A>) => Promise<M> {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export async function foldl_<A, B>(fa: AsyncIterable<A>, b: B, f: (b: B, a: A, i: number) => B): Promise<B> {
  let res = b
  let n   = 0
  for await (const a of fa) {
    res = f(res, a, n)
    n++
  }
  return res
}

export function foldl<A, B>(b: B, f: (b: B, a: A, i: number) => B): (fa: AsyncIterable<A>) => Promise<B> {
  return (fa) => foldl_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: AsyncIterable<A>, f: (a: A, i: number) => B): AsyncIterable<B> {
  return asyncIterable(async function* () {
    let n = 0
    for await (const a of fa) {
      yield f(a, n)
      n++
    }
  })
}

export function map<A, B>(f: (a: A, i: number) => B): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => map_(fa, f)
}

export function mapPromise_<A, B>(fa: AsyncIterable<A>, f: (a: A, i: number) => Promise<B>): AsyncIterable<B> {
  return asyncIterable(async function* () {
    let n = 0
    for await (const a of fa) {
      yield await f(a, n)
      n++
    }
  })
}

export function mapPromise<A, B>(f: (a: A, i: number) => Promise<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => mapPromise_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: AsyncIterable<A>, f: (a: A) => AsyncIterable<B>): AsyncIterable<B> {
  return asyncIterable(async function* () {
    for await (const a of ma) {
      yield* f(a)
    }
  })
}

export function chain<A, B>(f: (a: A) => AsyncIterable<B>): (ma: AsyncIterable<A>) => AsyncIterable<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: AsyncIterable<AsyncIterable<A>>): AsyncIterable<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function concat_<A>(fa: AsyncIterable<A>, fb: AsyncIterable<A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield* fa
    yield* fb
  })
}

export function concat<A>(fb: AsyncIterable<A>): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => concat_(fa, fb)
}

export function append_<A>(fa: AsyncIterable<A>, element: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield* fa
    yield element
  })
}

export function append<A>(element: A): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => append_(fa, element)
}

export function prepend_<A>(fa: AsyncIterable<A>, element: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield element
    yield* fa
  })
}

export function prepend<A>(element: A): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => prepend_(fa, element)
}

export function take_<A>(fa: AsyncIterable<A>, n: number): AsyncIterable<A> {
  return asyncIterable(async function* () {
    const ia = fa[Symbol.asyncIterator]()
    for (let i = 0; i < n; i++) {
      const el = await ia.next()
      if (el.done) {
        break
      }
      yield el.value
    }
  })
}

export function take(n: number): <A>(fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => take_(fa, n)
}

export async function toArray<A>(fa: AsyncIterable<A>): Promise<ReadonlyArray<A>> {
  const as: A[] = []
  for await (const a of fa) {
    as.push(a)
  }
  return as
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
  imap_: map_
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
  imap_: map_,
  ifilter_: filter_,
  ifilterMap_: filterMap_,
  ipartition_: partition_,
  ipartitionMap_: partitionMap_
})

export { AsyncIterableURI } from './Modules'
