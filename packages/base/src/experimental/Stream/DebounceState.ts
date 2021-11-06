import type { Chunk } from '../../Chunk'
import type { Fiber } from '../../Fiber'
import type { HandoffSignal } from './Handoff'

export const DebounceStateTypeId = Symbol()
export type DebounceStateTypeId = typeof DebounceStateTypeId

export const NotStartedTag = Symbol()
export type NotStartedTag = typeof NotStartedTag
export class NotStarted {
  readonly _tag: NotStartedTag = NotStartedTag
}

export const PreviousTag = Symbol()
export type PreviousTag = typeof PreviousTag
export class Previous<A> {
  readonly _tag: PreviousTag = PreviousTag
  constructor(readonly fiber: Fiber<never, Chunk<A>>) {}
}

export const CurrentTag = Symbol()
export type CurrentTag = typeof CurrentTag
export class Current<E, A> {
  readonly _tag: CurrentTag = CurrentTag
  constructor(readonly fiber: Fiber<E, HandoffSignal<void, E, A>>) {}
}

export type DebounceState<E, A> = NotStarted | Previous<A> | Current<E, A>

export function match_<E, A, B, C, D>(
  ds: DebounceState<E, A>,
  cases: {
    NotStarted: (_: NotStarted) => B
    Current: (_: Current<E, A>) => C
    Previous: (_: Previous<A>) => D
  }
): B | C | D {
  switch (ds._tag) {
    case NotStartedTag:
      return cases.NotStarted(ds)
    case CurrentTag:
      return cases.Current(ds)
    case PreviousTag:
      return cases.Previous(ds)
  }
}

export function match<E, A, B, C, D>(cases: {
  NotStarted: (_: NotStarted) => B
  Current: (_: Current<E, A>) => C
  Previous: (_: Previous<A>) => D
}): (ds: DebounceState<E, A>) => B | C | D {
  return (ds) => match_(ds, cases)
}
