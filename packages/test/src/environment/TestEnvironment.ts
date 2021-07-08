import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IOEnv'
import type { Layer } from '@principia/base/Layer'

import { live as liveIOEnv } from '@principia/base/IOEnv'

import { Annotations } from '../Annotation'
import { Sized } from '../Sized'
import { TestConfig } from '../TestConfig'
import { Live } from './Live'
import { TestClock } from './TestClock'
import { TestConsole } from './TestConsole'
import { TestRandom } from './TestRandom'

export type TestEnvironment = Has<Annotations> &
  Has<Live> &
  Has<Sized> &
  Has<TestClock> &
  Has<TestConfig> &
  Has<TestConsole> &
  Has<TestRandom> &
  IOEnv

export const liveTestEnvironment: Layer<IOEnv, never, TestEnvironment> = Annotations.live['+++'](Live.default)
  ['+++'](Sized.live(100))
  ['+++'](Live.default['+++'](Annotations.live)['>>>'](TestClock.default))
  ['+++'](TestConfig.live({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
  ['+++'](Live.default['>>>'](TestConsole.debug))
  ['+++'](TestRandom.determinictic)

export const testEnvironment = liveIOEnv['>>>'](liveTestEnvironment)
