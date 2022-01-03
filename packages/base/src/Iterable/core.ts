import type { Either } from '../Either'
import type * as E from '../internal/Either'
import type { Maybe } from '../Maybe'
import type { IterableF } from './instances'

import * as Ev from '../Eval/core'
import { identity } from '../function'
import * as It from '../internal/Iterable'
import * as M from '../Maybe'
import * as P from '../prelude'
import { tuple } from '../tuple/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const never: Iterable<never> = It.never

export const empty: <A>() => Iterable<A> = It.empty

export const size = <A>(as: Iterable<A>): number => foldl_(as, 0, (b) => b + 1)

export const iterable = It.iterable

export const singleton: <A>(a: A) => Iterable<A> = pure

export function makeBy<A>(n: number, f: (i: number) => A): Iterable<A> {
  return iterable<A>(() => {
    let i    = 0
    let done = false
    return {
      next() {
        return !done && i < n ? { done, value: f(i++) } : this.return!()
      },
      return(value?: unknown) {
        if (!done) {
          done = true
        }
        return { done: true, value }
      }
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

export function zipWithIndex<A>(fa: Iterable<A>): Iterable<readonly [number, A]> {
  return iterable<readonly [number, A]>(() => {
    let n        = 0
    let done     = false
    let iterator = fa[Symbol.iterator]()
    return {
      next() {
        if (done) {
          this.return!()
        }
        const v = iterator.next()
        return v.done ? this.return!() : { done: false, value: [n++, v.value] }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof iterator.return === 'function') {
            iterator.return()
          }
        }
        return { done: true, value }
      }
    }
  })
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
  return iterable<A>(() => {
    let done = false
    return {
      next() {
        return !done ? ((done = true), { done: false, value: a }) : this.return!()
      },
      return(value?: unknown) {
        if (!done) {
          done = true
        }
        return { done, value }
      }
    }
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
  return iterable<A>(() => {
    let done = false
    let i    = 0
    let ia   = fa[Symbol.iterator]()
    let va: IteratorResult<A>
    return {
      next() {
        if (done) {
          return this.return!()
        }
        // eslint-disable-next-line no-constant-condition
        while (true) {
          va = ia.next()
          if (va.done) return this.return!()
          if (predicate(i++, va.value)) return { done, value: va.value }
        }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof ia.return === 'function') {
            ia.return()
          }
        }
        return { done, value }
      }
    }
  })
}

/**
 * @dataFirst ifilter_
 */
export function ifilter<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => Iterable<B>
/**
 * @dataFirst ifilter_
 */
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Iterable<A>) => Iterable<A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<A, B extends A>(fa: Iterable<A>, refinement: P.Refinement<A, B>): Iterable<B>
export function filter_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): Iterable<A>
export function filter_<A>(fa: Iterable<A>, predicate: P.Predicate<A>): Iterable<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

/**
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Iterable<A>) => Iterable<B>
/**
 * @dataFirst filter_
 */
export function filter<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => Iterable<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => Iterable<A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => Maybe<B>): Iterable<B> {
  return iterable<B>(() => {
    let i    = 0
    let ia   = fa[Symbol.iterator]()
    let va: IteratorResult<A>
    let done = false
    return {
      next() {
        if (done) {
          this.return!()
        }
        // eslint-disable-next-line no-constant-condition
        while (true) {
          va = ia.next()
          if (va.done) {
            return this.return!()
          }
          const mb = f(i++, va.value)
          if (M.isJust(mb)) {
            return { done, value: mb.value }
          }
        }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof ia.return === 'function') {
            ia.return()
          }
        }
        return { done, value }
      }
    }
  })
}

/**
 * @dataFirst ifilterMap_
 */
export function ifilterMap<A, B>(f: (i: number, a: A) => Maybe<B>): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => ifilterMap_(fa, f)
}

export function filterMap_<A, B>(fa: Iterable<A>, f: (a: A) => Maybe<B>): Iterable<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => Maybe<B>): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => filterMap_(fa, f)
}

type PartitionHandleResult<A> = { emit: true, value: A } | { emit: false }

function handlePartition<A>(
  predicate: P.PredicateWithIndex<number, A>,
  i: number,
  a: A,
  h: boolean
): PartitionHandleResult<A> {
  return h === predicate(i, a) ? { emit: true, value: a } : { emit: false }
}

function ipartitionIterator_<A>(fa: Iterable<A>, predicate: P.PredicateWithIndex<number, A>, h: boolean): Iterator<A> {
  const ia = fa[Symbol.iterator]()
  let i    = 0
  let done = false
  let va: IteratorResult<A>
  return {
    next() {
      if (done) {
        return this.return!()
      }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        va = ia.next()
        if (va.done) {
          return this.return!()
        }
        const ra = handlePartition(predicate, i++, va.value, h)
        if (ra.emit) {
          return { done, value: ra.value }
        }
      }
    },
    return(value?: unknown) {
      if (!done) {
        done = true
        if (typeof ia.return === 'function') {
          ia.return()
        }
      }
      return { done, value }
    }
  }
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
  return tuple(
    iterable(() => ipartitionIterator_(fa, predicate, false)),
    iterable(() => ipartitionIterator_(fa, predicate, true))
  )
}

/**
 * @dataFirst ipartition_
 */
export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<B>]
/**
 * @dataFirst ipartition_
 */
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

/**
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<B>]
/**
 * @dataFirst partition_
 */
export function partition<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Iterable<A>) => readonly [Iterable<A>, Iterable<A>] {
  return (fa) => partition_(fa, predicate)
}

function handlePartitionMap<A, B, C>(
  f: (i: number, a: A) => E.Either<B, C>,
  i: number,
  a: A,
  h: 'Left' | 'Right'
): PartitionHandleResult<B | C> {
  const bc = f(i, a)
  return h === 'Left' && bc._tag === 'Left'
    ? { emit: true, value: bc.left }
    : h === 'Right' && bc._tag === 'Right'
    ? { emit: true, value: bc.right }
    : { emit: false }
}

function ipartitionMapIterator_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => E.Either<B, C>,
  h: 'Left' | 'Right'
): Iterator<B | C> {
  const ia = fa[Symbol.iterator]()
  let i    = 0
  let done = false
  let va: IteratorResult<A>
  return {
    next() {
      if (done) {
        return this.return!()
      }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        va = ia.next()
        if (va.done) {
          return this.return!()
        }
        const ra = handlePartitionMap(f, i++, va.value, h)
        if (ra.emit) {
          return { done, value: ra.value }
        }
      }
    },
    return(value?: unknown) {
      if (!done) {
        done = true
        if (typeof ia.return === 'function') {
          ia.return()
        }
      }
      return { done, value }
    }
  }
}

export function ipartitionMap_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Iterable<B>, Iterable<C>] {
  return tuple(
    iterable(() => ipartitionMapIterator_(fa, f, 'Left')) as Iterable<B>,
    iterable(() => ipartitionMapIterator_(fa, f, 'Right')) as Iterable<C>
  )
}

/**
 * @dataFirst ipartitionMap_
 */
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

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
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

/**
 * @dataFirst ifoldMap_
 */
export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Iterable<A>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function ifoldl_<A, B>(fa: Iterable<A>, b: B, f: (i: number, b: B, a: A) => B): B {
  let res = b
  let i   = -1
  for (const value of fa) {
    i  += 1
    res = f(i, res, value)
  }
  return res
}

/**
 * @dataFirst ifoldl_
 */
export function ifoldl<A, B>(b: B, f: (i: number, b: B, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (_, b, a) => f(b, a))
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function ifoldr_<A, B>(
  fa: Iterable<A>,
  b: Ev.Eval<B>,
  f: (i: number, a: A, b: Ev.Eval<B>) => Ev.Eval<B>
): Ev.Eval<B> {
  let i                = 0
  const iterator       = fa[Symbol.iterator]()
  const go: Ev.Eval<B> = Ev.defer(() => {
    const { value: current, done } = iterator.next()
    if (done) {
      return b
    } else {
      return f(i++, current, go)
    }
  })
  return go
}

/**
 * @dataFirst ifoldr_
 */
export function ifoldr<A, B>(
  b: Ev.Eval<B>,
  f: (i: number, a: A, b: Ev.Eval<B>) => Ev.Eval<B>
): (fa: Iterable<A>) => Ev.Eval<B> {
  return (fa) => ifoldr_(fa, b, f)
}

export function foldr_<A, B>(fa: Iterable<A>, b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): Ev.Eval<B> {
  return ifoldr_(fa, b, (_, a, b) => f(a, b))
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): (fa: Iterable<A>) => Ev.Eval<B> {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function imap_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> {
  return iterable<B>(() => {
    const ia = fa[Symbol.iterator]()
    let i    = 0
    let done = false
    let va: IteratorResult<A>
    return {
      next() {
        if (done) {
          return this.return!()
        }
        va = ia.next()
        if (va.done) {
          return this.return!()
        }
        return { done, value: f(i++, va.value) }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof ia.return === 'function') {
            ia.return()
          }
        }
        return { done, value }
      }
    }
  })
}

/**
 * @dataFirst imap_
 */
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

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable<B>(() => {
    const ia = ma[Symbol.iterator]()
    let ib: Iterator<B>
    let va: IteratorResult<A>
    let vb: IteratorResult<B>
    let done = false

    const pullA = (onDone: () => IteratorResult<B>): IteratorResult<B> => {
      va = ia.next()
      if (va.done) {
        return onDone()
      }
      ib = f(va.value)[Symbol.iterator]()
      return pullB(onDone)
    }
    const pullB = (onDone: () => IteratorResult<B>): IteratorResult<B> => {
      if (!ib) {
        return pullA(onDone)
      }
      vb = ib!.next()
      if (!vb.done) {
        return { done, value: vb.value }
      }
      return pullA(onDone)
    }

    return {
      next() {
        if (done) {
          return this.return!()
        }
        return pullB(() => this.return!())
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof ia.return === 'function') {
            ia.return()
          }
          if (ib && typeof ib.return === 'function') {
            ib.return()
          }
        }
        return { done, value }
      }
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

export const itraverse_: P.TraverseIndexFn_<IterableF> = P.implementTraverseWithIndex_<IterableF>()(
  () => (AG) => (ta, f) => ifoldl_(ta, AG.pure(never as Iterable<any>), (i, b, a) => AG.crossWith_(b, f(i, a), append_))
)

/**
 * @dataFirst itraverse_
 */
export const itraverse: P.MapWithIndexAFn<IterableF> = (AG) => {
  const _ = itraverse_(AG)
  return (f) => (ta) => _(ta, f)
}

export const traverse_: P.TraverseFn_<IterableF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (ta, f) => itraverseA_(ta, (_, a) => f(a))
}

export const traverse: P.TraverseFn<IterableF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (ta) => itraverseA_(ta, (_, a) => f(a))
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
  return iterable(() => {
    const iterA = ia[Symbol.iterator]()
    let doneA   = false
    let iterB: Iterator<A>
    return {
      next() {
        if (!doneA) {
          const r = iterA.next()
          if (r.done) {
            doneA = true
            iterB = ib[Symbol.iterator]()
            return iterB.next()
          }
          return r
        }
        return iterB.next()
      }
    }
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
  return iterable<A>(() => {
    const iterator = ia[Symbol.iterator]()
    let i          = 0
    let done       = false
    return {
      next() {
        const r = iterator.next()
        if (r.done || i >= n) {
          return this.return!()
        }
        i++
        return { done: false, value: r.value }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
          if (typeof iterator.return === 'function') {
            iterator.return()
          }
        }
        return { done: true, value }
      }
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

/**
 * @dataFirst ievery_
 */
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

/**
 * @dataFirst every_
 */
export function every<A, B extends A>(refinement: P.Refinement<A, B>): (as: Iterable<A>) => as is Iterable<B>
export function every<A>(predicate: P.Predicate<A>): (as: Iterable<A>) => boolean
export function every<A>(predicate: P.Predicate<A>): (as: Iterable<A>) => boolean {
  return (as) => every_(as, predicate)
}

export function iforEach_<A, B>(as: Iterable<A>, f: (i: number, a: A) => B): void {
  let i = 0
  for (const a of as) {
    f(i, a)
    i++
  }
}

/**
 * @dataFirst iforEach_
 */
export function iforEach<A, B>(f: (i: number, a: A) => B): (as: Iterable<A>) => void {
  return (as) => iforEach_(as, f)
}

export function forEach_<A, B>(as: Iterable<A>, f: (a: A) => B): void {
  return iforEach_(as, (_, a) => f(a))
}

/**
 * @dataFirst forEach_
 */
export function forEach<A, B>(f: (a: A) => B): (as: Iterable<A>) => void {
  return (as) => forEach_(as, f)
}
