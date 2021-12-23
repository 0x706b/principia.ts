import type { PredicateWithIndex } from '../prelude'
import type { RefinementWithIndex } from '../Refinement'

import * as E from '../Either'
import { pipe } from '../function'
import * as Ix from '../Ix'
import * as M from '../Maybe'
import * as O from '../Optional'
import * as Pr from '../Prism'
import * as A from './core'

export function findP<A, B extends A>(refinement: RefinementWithIndex<number, A, B>): Pr.Prism<ReadonlyArray<A>, B>
export function findP<A>(predicate: PredicateWithIndex<number, A>): Pr.Prism<ReadonlyArray<A>, A>
export function findP<A>(predicate: PredicateWithIndex<number, A>): Pr.Prism<ReadonlyArray<A>, A> {
  return Pr.PPrism({
    reverseGet: A.pure,
    getOrModify: (as) =>
      pipe(
        as,
        A.ifind(predicate),
        M.match(() => E.left(as), E.right)
      )
  })
}

export function getIx<A>(): Ix.Ix<ReadonlyArray<A>, number, A> {
  return Ix.Ix((i) =>
    O.Optional({
      getOrModify: (as) =>
        pipe(
          as,
          A.lookup(i),
          M.match(() => E.left(as), E.right)
        ),
      replace_: (as, a) =>
        pipe(
          as,
          A.updateAt(i, a),
          M.getOrElse(() => as)
        )
    })
  )
}

export function ix<A>(index: number): O.Optional<ReadonlyArray<A>, A> {
  return getIx<A>().ix(index)
}
