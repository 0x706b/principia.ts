import type * as HKT from './HKT'
import type { ZReaderURI } from './Modules'

import { identity, pipe } from './function'
import * as P from './prelude'
import * as Z from './Z'

export interface ZReader<R, A> extends Z.Z<never, unknown, never, R, never, A> {}

export type V = HKT.V<'R', '-'>

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export const ask: <R>() => ZReader<R, R> = Z.ask

export const asks: <R, A>(f: (r: R) => A) => ZReader<R, A> = Z.asks

export const asksM: <R, R1, A>(f: (R: R) => ZReader<R1, A>) => ZReader<R & R1, A> = Z.asksZ

export const giveAll_: <R, A>(ra: ZReader<R, A>, r: R) => ZReader<unknown, A> = Z.giveAll_

export const giveAll: <R>(r: R) => <A>(ra: ZReader<R, A>) => ZReader<unknown, A> = Z.giveAll

export const gives_: <R0, R, A>(ra: ZReader<R, A>, f: (r0: R0) => R) => ZReader<R0, A> = Z.gives_

export const gives: <R0, R>(f: (r0: R0) => R) => <A>(ra: ZReader<R, A>) => ZReader<R0, A> = Z.gives

export function runReader_<A>(ra: ZReader<unknown, A>): A
export function runReader_<R, A>(ra: ZReader<R, A>, r: R): A
export function runReader_<R, A>(ra: ZReader<R, A>, r?: R): A {
  return r ? Z.runReader_(ra, r) : Z.runResult(ra as any)
}

export function runReader(): <A>(ra: ZReader<unknown, A>) => A
export function runReader<R>(r: R): <A>(ra: ZReader<R, A>) => A
export function runReader<R>(r?: R): <A>(ra: ZReader<R, A>) => A {
  return (ra) => runReader_(ra, r as any)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <A>(a: A) => ZReader<unknown, A> = Z.pure

/*
 * -------------------------------------------------------------------------------------------------
 * Monoidal
 * -------------------------------------------------------------------------------------------------
 */

export const unit: () => ZReader<unknown, void> = Z.unit

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal
 * -------------------------------------------------------------------------------------------------
 */

export const cross_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, readonly [A, B]> = Z.zip_

export const cross: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, readonly [A, B]> = Z.zip

export const crossWith_: <R, A, R1, B, C>(
  fa: ZReader<R, A>,
  fb: ZReader<R1, B>,
  f: (a: A, b: B) => C
) => ZReader<R & R1, C> = Z.zipWith_

export const crossWith: <A, R1, B, C>(
  fb: ZReader<R1, B>,
  f: (a: A, b: B) => C
) => <R>(fa: ZReader<R, A>) => ZReader<R & R1, C> = Z.zipWith

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export const ap_: <R, A, R1, B>(fab: ZReader<R1, (a: A) => B>, fa: ZReader<R, A>) => ZReader<R & R1, B> = Z.zap_

export const ap: <R, A>(fa: ZReader<R, A>) => <R1, B>(fab: ZReader<R1, (a: A) => B>) => ZReader<R & R1, B> = Z.zap

export const crossFirst_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, A> = Z.zipFirst_

export const crossFirst: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, A> = Z.zipFirst

export const crossSecond_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, B> = Z.zipSecond_

export const crossSecond: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, B> = Z.zipSecond

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export const map_: <R, A, B>(fa: ZReader<R, A>, f: (a: A) => B) => ZReader<R, B> = Z.map_

export const map: <A, B>(f: (a: A) => B) => <R>(fa: ZReader<R, A>) => ZReader<R, B> = Z.map

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export const chain_: <R, A, R1, B>(ma: ZReader<R, A>, f: (a: A) => ZReader<R1, B>) => ZReader<R & R1, B> = Z.chain_

export const chain: <A, R1, B>(f: (a: A) => ZReader<R1, B>) => <R>(ma: ZReader<R, A>) => ZReader<R & R1, B> = Z.chain

export function flatten<R, R1, A>(mma: ZReader<R, ZReader<R1, A>>): ZReader<R & R1, A> {
  return chain_(mma, identity)
}

export const tap_: <R, A, R1, B>(ma: ZReader<R, A>, f: (a: A) => ZReader<R1, B>) => ZReader<R & R1, A> = Z.tap_

export const tap: <A, R1, B>(f: (a: A) => ZReader<R1, B>) => <R>(ma: ZReader<R, A>) => ZReader<R & R1, A> = Z.tap

/*
 * -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function andThen_<R, A, B>(ra: ZReader<R, A>, ab: ZReader<A, B>): ZReader<R, B> {
  return chain_(ra, (a) => giveAll_(ab, a))
}

export function andThen<A, B>(ab: ZReader<A, B>): <R>(ra: ZReader<R, A>) => ZReader<R, B> {
  return (ra) => andThen_(ra, ab)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function dimap_<R, A, Q, B>(pa: ZReader<R, A>, f: (q: Q) => R, g: (a: A) => B): ZReader<Q, B> {
  return pipe(pa, gives(f), map(g))
}

export function dimap<R, A, Q, B>(f: (q: Q) => R, g: (a: A) => B): (pa: ZReader<R, A>) => ZReader<Q, B> {
  return (pa) => dimap_(pa, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const MonadEnv: P.MonadEnv<[HKT.URI<ZReaderURI>], V> = P.MonadEnv({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  asks,
  giveAll_
})

export { ZReaderURI } from './Modules'
