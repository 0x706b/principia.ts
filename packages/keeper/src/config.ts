import type * as Z from 'node-zookeeper-client'

import { tag } from '@principia/base/Has'

export const KeeperConfigSym = Symbol()

export interface KeeperConfig {
  readonly [KeeperConfigSym]: typeof KeeperConfigSym
  readonly connectionString: string
  readonly options?: Z.Option
}

export const KeeperConfig = tag<KeeperConfig>()

export function makeKeeperConfig(_: { connectionString: string, options?: Z.Option }): KeeperConfig {
  return {
    [KeeperConfigSym]: KeeperConfigSym,
    connectionString: _.connectionString,
    options: _.options
  }
}
