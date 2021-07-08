import type { Managed } from './Managed/core'

export class ManagedAspect<R, E, A, EC = unknown> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(
    readonly apply: <R1, E1 extends EC, A1 extends A>(managed: Managed<R1, E1, A1>) => Managed<R & R1, E | E1, A1>
  ) {}
  ['>>>']<R, E extends EC, A, EC, R1, E1, B extends A>(
    this: ManagedAspect<R, E, A, EC>,
    that: ManagedAspect<R1, E1, B, EC>
  ): ManagedAspect<R & R1, E | E1, B, EC> {
    return andThen_(this, that)
  }
}

export function andThen_<R, E extends EC, A, EC, R1, E1, B extends A>(
  aspectA: ManagedAspect<R, E, A, EC>,
  aspectB: ManagedAspect<R1, E1, B, EC>
): ManagedAspect<R & R1, E | E1, B, EC> {
  return new ManagedAspect((managed) => aspectB.apply(aspectA.apply(managed)))
}

export function andThen<A, EC, R1, E1, B extends A>(
  aspectB: ManagedAspect<R1, E1, B, EC>
): <R, E extends EC>(aspectA: ManagedAspect<R, E, A, EC>) => ManagedAspect<R & R1, E | E1, B, EC> {
  return (aspectA) => andThen_(aspectA, aspectB)
}
