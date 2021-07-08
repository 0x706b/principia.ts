import type { Stream } from './Stream/core'

import * as S from './Stream'

export class StreamAspect<R, E, A, EC = unknown> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(
    readonly apply: <R1, E1 extends EC, A1 extends A>(stream: Stream<R1, E1, A1>) => Stream<R & R1, E | E1, A1>
  ) {}
  ['>>>']<R, E extends EC, A, EC, R1, E1, B extends A>(
    this: StreamAspect<R, E, A, EC>,
    that: StreamAspect<R1, E1, B, EC>
  ): StreamAspect<R & R1, E | E1, B, EC> {
    return andThen_(this, that)
  }
}

export function andThen_<R, E extends EC, A, EC, R1, E1, B extends A>(
  aspectA: StreamAspect<R, E, A, EC>,
  aspectB: StreamAspect<R1, E1, B, EC>
): StreamAspect<R & R1, E | E1, B, EC> {
  return new StreamAspect((stream) => aspectB.apply(aspectA.apply(stream)))
}

export function andThen<A, EC, R1, E1, B extends A>(
  aspectB: StreamAspect<R1, E1, B, EC>
): <R, E extends EC>(aspectA: StreamAspect<R, E, A, EC>) => StreamAspect<R & R1, E | E1, B, EC> {
  return (aspectA) => andThen_(aspectA, aspectB)
}

export function chunkN(n: number): StreamAspect<unknown, never, unknown> {
  return new StreamAspect((s) => S.chunkN_(s, n))
}
