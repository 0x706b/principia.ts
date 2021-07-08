import type * as Ca from '../../Cause'

import * as C from '../../Chunk'
import * as I from '../../IO'
import * as O from '../../Option'
import * as Q from '../../Queue'
import * as Take from './Take'

export type Pull<R, E, A> = I.IO<R, O.Option<E>, C.Chunk<A>>

export function emit<A>(a: A): I.UIO<C.Chunk<A>> {
  return I.succeed(C.single(a))
}

export function emitChunk<A>(as: C.Chunk<A>): I.UIO<C.Chunk<A>> {
  return I.succeed(as)
}

export function fromQueue<E, A>(d: Q.Dequeue<Take.Take<E, A>>): I.FIO<O.Option<E>, C.Chunk<A>> {
  return I.chain_(Q.take(d), (_) => Take.done(_))
}

export function fail<E>(e: E): I.FIO<O.Option<E>, never> {
  return I.fail(O.some(e))
}

export function halt<E>(c: Ca.Cause<E>): I.FIO<O.Option<E>, never> {
  return I.mapError_(I.halt(c), O.some)
}

export function empty<A>(): I.FIO<never, C.Chunk<A>> {
  return I.succeed(C.empty<A>())
}

export const end: I.FIO<O.Option<never>, never> = I.fail(O.none())
