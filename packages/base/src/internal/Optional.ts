import type { GetMaybeFn, ModifyMaybeFn_, Optional, POptional, POptionalMin } from '../Optional'
import type { Predicate } from '../Predicate'

import * as A from '../Array/core'
import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as M from '../Maybe'
import { makePTraversal } from './Traversal'

export function makePOptional<S, T, A, B>(Op: POptionalMin<S, T, A, B>): POptional<S, T, A, B> {
  const getOption: GetMaybeFn<S, A>               = flow(Op.getOrModify, M.getRight)
  const modifyOption_: ModifyMaybeFn_<S, T, A, B> = (s, f) =>
    pipe(
      getOption(s),
      M.map((a) => Op.replace_(s, f(a)))
    )
  return {
    getOrModify: Op.getOrModify,
    getMaybe: getOption,
    modifyMaybe_: modifyOption_,
    modifyMaybe: (f) => (s) => modifyOption_(s, f),
    ...makePTraversal<S, T, A, B>({
      modifyA_: (F) => (s, f) =>
        pipe(
          Op.getOrModify(s),
          E.match(
            F.pure,
            flow(
              f,
              F.map((b) => Op.replace_(s, b))
            )
          )
        )
    })
  }
}

export function andThen_<S, T, A, B, C, D>(
  sa: POptional<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return makePOptional({
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
    replace_: (s, d) => sa.modify_(s, ab.set(d))
  })
}

export function fromFind<A>(predicate: Predicate<A>): Optional<ReadonlyArray<A>, A> {
  return makePOptional({
    getOrModify: (s) =>
      pipe(
        s,
        A.find(predicate),
        M.match(() => E.left(s), E.right)
      ),
    replace_: (s, a) =>
      pipe(
        A.findIndex(predicate)(s),
        M.match(
          () => s,
          (i) => A.unsafeUpdateAt_(s, i, a)
        )
      )
  })
}
