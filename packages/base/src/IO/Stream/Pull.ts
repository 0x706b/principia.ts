import type { Chunk } from '../../Chunk'
import type { Maybe } from '../../Maybe'
import type { Cause } from '../Cause'

import * as C from '../../Chunk'
import { pipe } from '../../function'
import { just, nothing } from '../../Maybe'
import * as I from '../IO'

export type Pull<R, E, O> = I.IO<R, Maybe<E>, Chunk<O>>

export const end = I.fail(nothing())

export function fail<E>(e: E): I.FIO<Maybe<E>, never> {
  return I.fail(just(e))
}

export function halt<E>(e: Cause<E>): I.IO<unknown, Maybe<E>, never> {
  return pipe(I.failCause(e), I.mapError(just))
}

export function empty<A>(): I.UIO<Chunk<A>> {
  return I.pure(C.empty())
}

export function emit<A>(a: A): I.UIO<Chunk<A>> {
  return I.pure(C.single(a))
}

export function emitChunk<A>(as: Chunk<A>): I.UIO<Chunk<A>> {
  return I.pure(as)
}
