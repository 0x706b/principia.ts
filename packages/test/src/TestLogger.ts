import type { Has } from '@principia/base/Has'
import type { UIO, URIO } from '@principia/base/IO'
import type { Console } from '@principia/base/IO/Console'
import type { Layer } from '@principia/base/IO/Layer'

import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import { ConsoleTag } from '@principia/base/IO/Console'
import * as L from '@principia/base/IO/Layer'

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
