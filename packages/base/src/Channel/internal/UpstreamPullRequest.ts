export class Pulled<A> {
  readonly _tag = 'Pulled'
  constructor(readonly value: A) {}
}

export class NoUpstream {
  readonly _tag = 'NoUpstream'
  constructor(readonly activeDownstreamCount: number) {}
}

export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream

export function match_<A, B, C>(
  upr: UpstreamPullRequest<A>,
  pulled: (value: A) => B,
  noUpstream: (activeDownstreamCount: number) => C
): B | C {
  switch (upr._tag) {
    case 'Pulled': {
      return pulled(upr.value)
    }
    case 'NoUpstream': {
      return noUpstream(upr.activeDownstreamCount)
    }
  }
}

export function match<A, B, C>(
  pulled: (value: A) => B,
  noUpstream: (activeDownstreamCount: number) => C
): (upr: UpstreamPullRequest<A>) => B | C {
  return (upr) => match_(upr, pulled, noUpstream)
}
