import type * as O from '@principia/base/Option'

export const ContextURI = 'graphql/Context'
export type ContextURI = typeof ContextURI

export interface RequestContext<Req> {
  req: O.Option<Req>
}

export interface Context<URI extends string, Ctx> {
  [ContextURI]: {
    [k in URI]: Ctx
  }
}
