export class Pulled<A> {
  readonly _tag = 'Pulled'
  constructor(readonly value: A) {}
}

export class NoUpstream {
  readonly _tag = 'NoUpstream'
  constructor(readonly activeDownstreamCount: number) {}
}

export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream
