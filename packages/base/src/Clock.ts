/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as E from './Either'
import { tag } from './Has'
import * as I from './IO/core'

/**
 * Clock Model
 */

export const ClockTag = tag<Clock>()

/**
 * Live clock implementation
 */
export class LiveClock implements Clock {
  currentTime: I.UIO<number> = I.succeedLazy(() => new Date().getTime())

  sleep = (ms: number): I.UIO<void> =>
    I.asyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(I.unit())
      }, ms)

      return E.left(
        I.succeedLazy(() => {
          clearTimeout(timeout)
        })
      )
    })
}

export abstract class Clock {
  abstract readonly currentTime: I.UIO<number>
  abstract readonly sleep: (ms: number) => I.UIO<void>

  static currentTime = I.asksServiceIO(ClockTag)((_) => _.currentTime)
  static sleep = (ms: number) => I.asksServiceIO(ClockTag)((_) => _.sleep(ms))
}

/**
 * Proxy Clock Implementation
 */
export class ProxyClock implements Clock {
  constructor(readonly currentTime: I.UIO<number>, readonly sleep: (ms: number) => I.UIO<void>) {}
}
