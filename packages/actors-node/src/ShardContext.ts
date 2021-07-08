import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import { hash } from '@principia/base/Structural'

export interface ShardContext {
  domain: string
  shards: number
}

export const ShardContext = tag<ShardContext>()

const mod = (m: number) => (x: number) => x < 0 ? (x % m) + m : x % m

export const computeShardForId = (id: string) =>
  T.asksService(ShardContext)(({ domain, shards }) => {
    return mod(shards)(hash(`${domain}-${id}`)) + 1
  })
