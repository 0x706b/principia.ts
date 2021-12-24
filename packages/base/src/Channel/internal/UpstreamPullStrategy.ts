import type { Maybe } from '../../Maybe'

export interface PullAfterNext<A> {
  readonly _tag: 'PullAfterNext'
  readonly emitSeparator: Maybe<A>
}

export function PullAfterNext<A>(emitSeparator: Maybe<A>): UpstreamPullStrategy<A> {
  return {
    _tag: 'PullAfterNext',
    emitSeparator
  }
}

export interface PullAfterAllEnqueued<A> {
  readonly _tag: 'PullAfterAllEnqueued'
  readonly emitSeparator: Maybe<A>
}

export function PullAfterAllEnqueued<A>(emitSeparator: Maybe<A>): UpstreamPullStrategy<A> {
  return {
    _tag: 'PullAfterAllEnqueued',
    emitSeparator
  }
}

export type UpstreamPullStrategy<A> = PullAfterNext<A> | PullAfterAllEnqueued<A>
