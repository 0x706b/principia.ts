import type * as Ev from './Eval/core'
import type * as HKT from './HKT'
import type { Show } from './Show'

import * as A from './collection/immutable/Array/core'
import { identity } from './function'
import * as It from './Iterable/core'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

/**
 * `RoseTree` is an implementation of a multi-way rose tree
 */
export interface RoseTree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

export type Forest<A> = ReadonlyArray<RoseTree<A>>

export interface RoseTreeF extends HKT.HKT {
  readonly type: RoseTree<this['A']>
  readonly variance: {
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function roseTree<A>(value: A, forest: Forest<A> = []): RoseTree<A> {
  return {
    value,
    forest
  }
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): RoseTree<A> {
  const [a, bs] = f(b)
  return roseTree(a, unfoldForest(bs, f))
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldForest<A, B>(bs: Array<B>, f: (b: B) => [A, Array<B>]): Forest<A> {
  return bs.map((b) => unfoldTree(b, f))
}

export function unfoldTreeM<M extends HKT.HKT, C = HKT.None>(
  M: P.Monad<M, C>
): <K, Q, W, X, I, S, R, E, A, B>(
  b: B,
  f: (b: B) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, RoseTree<A>>
export function unfoldTreeM<M>(
  M: P.Monad<HKT.F<M>>
): <K, Q, W, X, I, S, R, E, A, B>(
  b: B,
  f: (b: B) => HKT.FK<M, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.FK<M, K, Q, W, X, I, S, R, E, RoseTree<A>> {
  const unfoldForestMM = unfoldForestM(M)
  return (b, f) =>
    M.chain_(f(b), ([a, bs]) => M.chain_(unfoldForestMM(bs, f), (ts) => M.pure({ value: a, forest: ts })))
}

export function unfoldForestM<M extends HKT.HKT, C = HKT.None>(
  M: P.Monad<M, C>
): <K, Q, W, X, I, S, R, E, A, B>(
  bs: ReadonlyArray<B>,
  f: (b: B) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, Forest<A>>
export function unfoldForestM<M>(
  M: P.Monad<HKT.F<M>>
): <K, Q, W, X, I, S, R, E, A, B>(
  bs: ReadonlyArray<B>,
  f: (b: B) => HKT.FK<M, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.FK<M, K, Q, W, X, I, S, R, E, Forest<A>> {
  const traverseM = A.traverse_(M)
  return (bs, f) => traverseM(bs, (b) => unfoldTreeM(M)(b, f))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): RoseTree<A> {
  return {
    value: a,
    forest: A.empty()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function cross_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<readonly [A, B]> {
  return {
    value: [fa.value, fb.value],
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => cross_(a, b))
  }
}

/**
 * @dataFirst cross_
 */
export function cross<B>(fb: RoseTree<B>): <A>(fa: RoseTree<A>) => RoseTree<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<A, B, C>(fa: RoseTree<A>, fb: RoseTree<B>, f: (a: A, b: B) => C): RoseTree<C> {
  return {
    value: f(fa.value, fb.value),
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => crossWith_(a, b, f))
  }
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: RoseTree<B>, f: (a: A, b: B) => C): (fa: RoseTree<A>) => RoseTree<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<A, B>(fab: RoseTree<(a: A) => B>, fa: RoseTree<A>): RoseTree<B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

/**
 * @dataFirst ap_
 */
export function ap<A>(fa: RoseTree<A>): <B>(fab: RoseTree<(a: A) => B>) => RoseTree<B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst apFirst_
 */
export function apFirst<B>(fb: RoseTree<B>): <A>(fa: RoseTree<A>) => RoseTree<A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst apSecond_
 */
export function apSecond<B>(fb: RoseTree<B>): <A>(fa: RoseTree<A>) => RoseTree<B> {
  return (fa) => apSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<A, B>(wa: RoseTree<A>, f: (wa: RoseTree<A>) => B): RoseTree<B> {
  return {
    value: f(wa),
    forest: A.map_(wa.forest, (a) => extend_(a, f))
  }
}

/**
 * @dataFirst extend_
 */
export function extend<A, B>(f: (wa: RoseTree<A>) => B): (wa: RoseTree<A>) => RoseTree<B> {
  return (wa) => extend_(wa, f)
}

export const duplicate: <A>(wa: RoseTree<A>) => RoseTree<RoseTree<A>> = extend(identity)

export function extract<A>(wa: RoseTree<A>): A {
  return wa.value
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: RoseTree<A>, b: B, f: (b: B, a: A) => B): B {
  let r: B  = f(b, fa.value)
  const len = fa.forest.length
  for (let i = 0; i < len; i++) {
    r = foldl_(fa.forest[i], r, f)
  }
  return r
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: RoseTree<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: RoseTree<A>, b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): Ev.Eval<B> {
  const r = It.foldr_(fa.forest, b, (t, b) => foldr_(t, b, f))
  return f(fa.value, r)
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: Ev.Eval<B>, f: (a: A, b: Ev.Eval<B>) => Ev.Eval<B>): (fa: RoseTree<A>) => Ev.Eval<B> {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: RoseTree<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (acc, a) => M.combine_(acc, f(a)))
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: RoseTree<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: RoseTree<A>, f: (a: A) => B): RoseTree<B> {
  return {
    value: f(fa.value),
    forest: A.map_(fa.forest, (a) => map_(a, f))
  }
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: RoseTree<A>) => RoseTree<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: RoseTree<A>, f: (a: A) => RoseTree<B>): RoseTree<B> {
  const { value, forest } = f(ma.value)
  const combine           = A.getMonoid<RoseTree<B>>().combine_
  return {
    value,
    forest: combine(
      forest,
      A.map_(ma.forest, (a) => chain_(a, f))
    )
  }
}

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => RoseTree<B>): (ma: RoseTree<A>) => RoseTree<B> {
  return (ma) => chain_(ma, f)
}

export const flatten: <A>(mma: RoseTree<RoseTree<A>>) => RoseTree<A> = chain(identity)

export function tap_<A, B>(ma: RoseTree<A>, f: (a: A) => RoseTree<B>): RoseTree<A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * @dataFirst tap_
 */
export function tap<A, B>(f: (a: A) => RoseTree<B>): (ma: RoseTree<A>) => RoseTree<A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

function draw<A>(S: Show<A>): (indentation: string, forest: Forest<A>) => string {
  return (indentation, forest) => {
    let r     = ''
    const len = forest.length
    let tree: RoseTree<A>
    for (let i = 0; i < len; i++) {
      tree         = forest[i]
      const isLast = i === len - 1
      r           += indentation + (isLast ? '└' : '├') + '─ ' + S.show(tree.value)
      r           += draw(S)(indentation + (len > 1 && !isLast ? '│  ' : '   '), tree.forest)
    }
    return r
  }
}

export function drawForest<A>(S: Show<A>): (forest: Forest<A>) => string {
  return (forest) => draw(S)('\n', forest)
}

export function drawTree<A>(S: Show<A>): (tree: RoseTree<A>) => string {
  return (tree) => S.show(tree.value) + drawForest(S)(tree.forest)
}

export function getShow<A>(S: Show<A>): Show<RoseTree<A>> {
  return {
    show: drawTree(S)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const traverse_: P.TraverseFn_<RoseTreeF> = P.implementTraverse_<RoseTreeF>()((_) => (AG) => {
  const traverseArrayG_ = A.traverse_(AG)

  const out = <A, B>(
    ta: RoseTree<A>,
    f: (
      a: A
    ) => HKT.FK<
      typeof _.G,
      typeof _.K1,
      typeof _.Q1,
      typeof _.W1,
      typeof _.X1,
      typeof _.I1,
      typeof _.S1,
      typeof _.R1,
      typeof _.E1,
      B
    >
  ): HKT.FK<
    typeof _.G,
    typeof _.K1,
    typeof _.Q1,
    typeof _.W1,
    typeof _.X1,
    typeof _.I1,
    typeof _.S1,
    typeof _.R1,
    typeof _.E1,
    RoseTree<B>
  > =>
    AG.crossWith_(
      traverseArrayG_(ta.forest, (a) => out(a, f)),
      f(ta.value),
      (forest, value) => ({ value, forest })
    )
  return out
})

/**
 * @dataFirst traverse_
 */
export const traverse: P.TraverseFn<RoseTreeF> = (AG) => (f) => (ta) => traverse_(AG)(ta, f)

export const sequence: P.SequenceFn<RoseTreeF> = (AG) => (ta) => traverse_(AG)(ta, identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): RoseTree<void> {
  return {
    value: undefined,
    forest: A.empty()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<RoseTreeF>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<RoseTreeF>({ map_, cross_, crossWith_ })

export const Apply = P.Apply<RoseTreeF>({ map_, cross_, crossWith_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<RoseTreeF>({ map_, cross_, crossWith_, unit })

export const Applicative = P.Applicative<RoseTreeF>({ map_, cross_, crossWith_, unit, pure })

export const Monad = P.Monad<RoseTreeF>({ map_, cross_, crossWith_, unit, pure, chain_, flatten })

export const Traversable = P.Traversable<RoseTreeF>({ map_, foldl_, foldr_, foldMap_, traverse_ })
