import type * as I from './IO/core'

import { pipe } from './function'
import * as STM from './stm/STM'
import * as TS from './stm/TSemaphore'

export interface Semaphore extends TS.TSemaphore {}

export const unsafeMake = TS.unsafeMake

export function make(permits: number): I.UIO<TS.TSemaphore> {
  return pipe(TS.make(permits), STM.commit)
}

export const withPermits_ = TS.withPermits_

/**
 * @dataFirst withPermits_
 */
export const withPermits = TS.withPermits

export const withPermit_ = TS.withPermit_

/**
 * @dataFirst withPermit_
 */
export const withPermit = TS.withPermit

export const withPermitsManaged = TS.withPermitsManaged

export const withPermitManaged = TS.withPermitManaged
