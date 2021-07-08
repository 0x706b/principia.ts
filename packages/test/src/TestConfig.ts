import type { Has } from '@principia/base/Has'
import type { Layer } from '@principia/base/Layer'

import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'

export abstract class TestConfig {
  abstract readonly repeats: number
  abstract readonly retries: number
  abstract readonly samples: number
  abstract readonly shrinks: number
  static live(_: TestConfig): Layer<unknown, never, Has<TestConfig>> {
    return L.succeed(TestConfigTag)(
      new (class extends TestConfig {
        repeats = _.repeats
        retries = _.retries
        samples = _.samples
        shrinks = _.shrinks
      })()
    )
  }
  static get repeats() {
    return I.asksService(TestConfigTag)((_) => _.repeats)
  }
  static get retries() {
    return I.asksService(TestConfigTag)((_) => _.retries)
  }
  static get samples() {
    return I.asksService(TestConfigTag)((_) => _.samples)
  }
  static get shrinks() {
    return I.asksService(TestConfigTag)((_) => _.shrinks)
  }
}

export const TestConfigTag = tag(TestConfig)
