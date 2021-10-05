import type { Chunk } from '../../Chunk'
import type { Maybe } from '../../Maybe'
import type { Exit } from '../Exit'
import type { Pull } from './Pull'

import * as C from '../../Chunk'
import { flow, pipe } from '../../function'
import * as M from '../../Maybe'
import * as I from '..'
import * as Ca from '../Cause'
import * as Ex from '../Exit'

export type Take<E, A> = Exit<Maybe<E>, Chunk<A>>

export function chunk<A>(as: Chunk<A>): Take<never, A> {
  return Ex.succeed(as)
}

export function halt<E>(cause: Ca.Cause<E>): Take<E, never> {
  return Ex.failCause(pipe(cause, Ca.map(M.just)))
}

export const end: Take<never, never> = Ex.fail(M.nothing())

export function done<E, A>(take: Take<E, A>): I.FIO<Maybe<E>, Chunk<A>> {
  return I.fromExit(take)
}

export function fromPull<R, E, O>(pull: Pull<R, E, O>): I.IO<R, never, Take<E, O>> {
  return pipe(
    pull,
    I.matchCause(
      (c) =>
        pipe(
          Ca.sequenceCauseOption(c),
          M.match(() => end, halt)
        ),
      chunk
    )
  )
}

export function tap_<E, A, R, E1>(take: Take<E, A>, f: (as: Chunk<A>) => I.IO<R, E1, any>): I.IO<R, E1, void> {
  return I.asUnit(Ex.foreachIO_(take, f))
}

export function tap<A, R, E1>(
  f: (as: Chunk<A>) => I.IO<R, E1, any>
): <E>(take: Exit<Maybe<E>, Chunk<A>>) => I.IO<R, E1, void> {
  return (take) => tap_(take, f)
}

export function matchM_<E, A, R, E1, Z>(
  take: Take<E, A>,
  end: () => I.IO<R, E1, Z>,
  error: (cause: Ca.Cause<E>) => I.IO<R, E1, Z>,
  value: (chunk: Chunk<A>) => I.IO<R, E1, Z>
): I.IO<R, E1, Z> {
  return Ex.matchIO_(take, flow(Ca.sequenceCauseOption, M.match(end, error)), value)
}

export function matchM<E, A, R, E1, Z>(
  end: () => I.IO<R, E1, Z>,
  error: (cause: Ca.Cause<E>) => I.IO<R, E1, Z>,
  value: (chunk: Chunk<A>) => I.IO<R, E1, Z>
): (take: Take<E, A>) => I.IO<R, E1, Z> {
  return (take) => matchM_(take, end, error, value)
}

export function map_<E, A, B>(take: Take<E, A>, f: (a: A) => B): Take<E, B> {
  return Ex.map_(take, C.map(f))
}

export function map<A, B>(f: (a: A) => B): <E>(take: Exit<Maybe<E>, Chunk<A>>) => Exit<Maybe<E>, Chunk<B>> {
  return (take) => map_(take, f)
}
