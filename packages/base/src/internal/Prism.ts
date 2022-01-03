import type { Predicate } from '../Predicate'
import type { PPrism, PPrismMin, Prism } from '../Prism'

import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as M from '../Maybe'
import { makePOptional } from './Optional'

export function makePPrism<S, T, A, B>(Pr: PPrismMin<S, T, A, B>): PPrism<S, T, A, B> {
  return {
    reverseGet: Pr.reverseGet,
    ...makePOptional({
      getOrModify: Pr.getOrModify,
      replace_: (s, b) =>
        pipe(
          Pr.getOrModify(s),
          E.match(identity, () => Pr.reverseGet(b))
        )
    })
  }
}

export function compose_<S, T, A, B, C, D>(sa: PPrism<S, T, A, B>, ab: PPrism<A, B, C, D>): PPrism<S, T, C, D> {
  return makePPrism({
    getOrModify: (s) =>
      pipe(
        sa.getOrModify(s),
        E.chain(
          flow(
            ab.getOrModify,
            E.bimap((b) => sa.set_(s, b), identity)
          )
        )
      ),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  })
}

export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return makePPrism({
    getOrModify: (a) => (predicate(a) ? E.right(a) : E.left(a)),
    reverseGet: identity
  })
}

export function fromNullable<A>(): Prism<A, NonNullable<A>> {
  return makePPrism({
    getOrModify: (a) => E.fromNullable_(a, () => a),
    reverseGet: identity
  })
}

export function prismJust<A>(): Prism<M.Maybe<A>, A> {
  return makePPrism({
    getOrModify: M.match(() => E.left(M.nothing()), E.right),
    reverseGet: M.just
  })
}

export function prismRight<E, A>(): Prism<E.Either<E, A>, A> {
  return makePPrism({
    getOrModify: E.match(flow(E.left, E.left), E.right),
    reverseGet: (a) => E.right(a)
  })
}

export function prismLeft<E, A>(): Prism<E.Either<E, A>, E> {
  return makePPrism({
    getOrModify: E.match(E.right, flow(E.right, E.left)),
    reverseGet: (e) => E.left(e)
  })
}
