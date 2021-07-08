import type { Console } from '@principia/base/Console'
import type { Has } from '@principia/base/Has'
import type { UIO, URIO } from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'

import { ConsoleTag } from '@principia/base/Console'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'

export abstract class TestLogger {
  abstract logLine(line: string): UIO<void>
  static get fromConsole(): Layer<Has<Console>, never, Has<TestLogger>> {
    return L.fromIO(TestLoggerTag)(
      I.asksService(ConsoleTag)((console) => ({ logLine: (line) => console.putStrLn(line) }))
    )
  }
  static logLine(line: string): URIO<Has<TestLogger>, void> {
    return I.asksServiceIO(TestLoggerTag)((logger) => logger.logLine(line))
  }
}

export const TestLoggerTag = tag<TestLogger>()
