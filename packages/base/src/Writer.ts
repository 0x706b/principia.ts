import type { Endomorphism } from './Endomorphism'

import * as HKT from './HKT'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Writer<W, A> {
  (): readonly [A, W]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function tell<W>(w: W): Writer<W, void> {
  return () => [undefined, w]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function listen<W, A>(fa: Writer<W, A>): Writer<W, readonly [A, W]> {
  return () => {
    const [a, w] = fa()
    return [[a, w], w]
  }
}

export function pass<W, A>(fa: Writer<W, readonly [A, (w: W) => W]>): Writer<W, A> {
  return () => {
    const [[a, f], w] = fa()
    return [a, f(w)]
  }
}

export function listens_<W, A, B>(fa: Writer<W, A>, f: (w: W) => B): Writer<W, readonly [A, B]> {
  return () => {
    const [a, w] = fa()
    return [[a, f(w)], w]
  }
}

/**
 * @dataFirst listens_
 */
export function listens<W, B>(f: (w: W) => B): <A>(fa: Writer<W, A>) => Writer<W, readonly [A, B]> {
  return (fa) => listens_(fa, f)
}

export function censor_<W, A>(fa: Writer<W, A>, f: Endomorphism<W>): Writer<W, A> {
  return () => {
    const [a, w] = fa()
    return [a, f(w)]
  }
}

/**
 * @dataFirst censor_
 */
export function censor<W>(f: Endomorphism<W>): <A>(fa: Writer<W, A>) => Writer<W, A> {
  return (fa) => censor_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<W, A, B>(fa: Writer<W, A>, f: (a: A) => B): Writer<W, B> {
  return () => {
    const [a, w] = fa()
    return [f(a), w]
  }
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <W>(fa: Writer<W, A>) => Writer<W, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export interface WriterF extends HKT.HKT {
  readonly type: Writer<this['W'], this['A']>
  readonly variance: {
    W: '+'
    A: '+'
  }
}

export const Functor: P.Functor<WriterF> = P.Functor({
  map_
})

export function getSemimonoidalFunctor<W>(S: P.Semigroup<W>): P.SemimonoidalFunctor<WriterF, HKT.Fix<'W', W>> {
  type V_ = HKT.Fix<'W', W>
  const crossWith_: P.CrossWithFn_<WriterF, V_> = (fa, fb, f) => () => {
    const [a, w1] = fa()
    const [b, w2] = fb()
    return [f(a, b), S.combine_(w1, w2)]
  }

  return P.SemimonoidalFunctor<WriterF, HKT.Fix<'W', W>>({
    map_,
    crossWith_
  })
}

export function getApply<W>(S: P.Semigroup<W>): P.Apply<WriterF, HKT.Fix<'W', W>> {
  type V_ = HKT.Fix<'W', W>
  const ap_: P.ApFn_<WriterF, V_> = (fab, fa) => () => {
    const [f, w1] = fab()
    const [a, w2] = fa()
    return [f(a), S.combine_(w1, w2)]
  }
  return P.Apply<WriterF, V_>({
    ...getSemimonoidalFunctor(S),
    ap_
  })
}

export function getMonoidalFunctor<W>(M: P.Monoid<W>) {
  return HKT.instance<P.MonoidalFunctor<WriterF, HKT.Fix<'W', W>>>({
    ...getSemimonoidalFunctor(M),
    unit: () => () => [undefined, M.nat]
  })
}

export function getApplicative<W>(M: P.Monoid<W>): P.Applicative<WriterF, HKT.Fix<'W', W>> {
  return P.Applicative({
    ...getApply(M),
    pure:
      <A>(a: A) =>
      () =>
        [a, M.nat]
  })
}

export function getMonad<W>(M: P.Monoid<W>): P.Monad<WriterF, HKT.Fix<'W', W>> {
  const chain_: P.ChainFn_<WriterF, HKT.Fix<'W', W>> = (ma, f) => () => {
    const [a, w1] = ma()
    const [b, w2] = f(a)()
    return [b, M.combine_(w1, w2)]
  }
  return P.Monad({
    ...getApplicative(M),
    chain_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Utils
 * -------------------------------------------------------------------------------------------------
 */

export function evaluate<W, A>(fa: Writer<W, A>): A {
  return fa()[0]
}

export function execute<W, A>(fa: Writer<W, A>): W {
  return fa()[1]
}
