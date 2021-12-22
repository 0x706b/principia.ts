import type { Cache } from '../Cache'
import type { UFiberRef } from '@principia/base/FiberRef'

export class QueryContext {
  constructor(readonly cache: Cache, readonly cachingEnabled: UFiberRef<boolean>) {}
}
