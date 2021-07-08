import type { Clock } from './Clock'
import type { Has } from './Has'
import type { Schedule } from './Schedule'

import { Console } from './Console'
import * as I from './IO'
import { show } from './Structural'

export class IOAspect<R, E, A, EC = unknown> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _E0!: () => EC
  readonly _A!: () => A
  constructor(readonly apply: <R1, E1 extends EC, A1 extends A>(io: I.IO<R1, E1, A1>) => I.IO<R & R1, E | E1, A1>) {}
  ['>>>']<R, E extends EC, A, EC, R1, E1, B extends A>(
    this: IOAspect<R, E, A, EC>,
    that: IOAspect<R1, E1, B, EC>
  ): IOAspect<R & R1, E | E1, B, EC> {
    return andThen_(this, that)
  }
}

export const debug = new IOAspect<Has<Console>, never, unknown>((io) =>
  I.bitap_(
    io,
    (e) => Console.putStrLn(`[ERROR]: ${show(e)}`),
    (a) => Console.putStrLn(`[INFO]: ${show(a)}`)
  )
)

export function timeoutFail<E>(duration: number, e: () => E): IOAspect<Has<Clock>, E, unknown> {
  return new IOAspect((io) => I.timeoutFail_(io, duration, e))
}

export function retry<R, E>(schedule: Schedule<R, E, unknown>): IOAspect<Has<Clock> & R, never, unknown, E> {
  return new IOAspect((io) => I.retry_(io, schedule))
}

export function andThen_<R, E extends EC, A, EC, R1, E1, B extends A>(
  aspectA: IOAspect<R, E, A, EC>,
  aspectB: IOAspect<R1, E1, B, EC>
): IOAspect<R & R1, E | E1, B, EC> {
  return new IOAspect((io) => aspectB.apply(aspectA.apply(io)))
}

export function andThen<A, EC, R1, E1, B extends A>(
  aspectB: IOAspect<R1, E1, B, EC>
): <R, E extends EC>(aspectA: IOAspect<R, E, A, EC>) => IOAspect<R & R1, E | E1, B, EC> {
  return (aspectA) => andThen_(aspectA, aspectB)
}
