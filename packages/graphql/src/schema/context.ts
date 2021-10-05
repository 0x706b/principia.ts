import type * as M from '@principia/base/Maybe'

export const ContextURI = 'graphql/Context'
export type ContextURI = typeof ContextURI

export interface RequestContext<Req> {
  req: M.Maybe<Req>
}

export interface Context<URI extends string, Ctx> {
  [ContextURI]: {
    [k in URI]: Ctx
  }
}
