import type { Clock } from './Clock'
import type { Console } from './Console'
import type { Has } from './Has'
import type { Random } from './Random'

import { ClockTag, LiveClock } from './Clock'
import { ConsoleTag, LiveConsole } from './Console'
import * as L from './Layer'
import { defaultRandom, RandomTag } from './Random'

export type IOEnv = Has<Clock> & Has<Random> & Has<Console>

export const live = L.allPar(
  L.succeed(ClockTag)(new LiveClock()),
  L.succeed(RandomTag)(defaultRandom),
  L.succeed(ConsoleTag)(new LiveConsole())
)
