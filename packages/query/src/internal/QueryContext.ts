import type { Cache } from '../Cache'
import type { FiberRef } from '@principia/base/IO/FiberRef'

export class QueryContext {
  constructor(readonly cache: Cache, readonly cachingEnabled: FiberRef<boolean>) {}
}
