import * as P from '../prelude'
import { AtomicNumber } from '../util/support/AtomicNumber'

/*
 * -------------------------------------------------------------------------------------------------
 * FiberId
 * -------------------------------------------------------------------------------------------------
 */

export interface FiberId {
  readonly _tag: 'FiberId'
  /** Start time in milliseconds */
  readonly startTime: number
  readonly seqNumber: number
}

const _fiberCounter = new AtomicNumber(0)

export function fiberId(startTime: number, seqNumber: number): FiberId {
  return {
    _tag: 'FiberId',
    startTime,
    seqNumber
  }
}

export const emptyFiberId = fiberId(0, 0)

export const eqFiberId: P.Eq<FiberId> = P.Eq((x, y) => x.seqNumber === y.seqNumber && x.startTime === y.startTime)

export function newFiberId(): FiberId {
  return fiberId(new Date().getTime(), _fiberCounter.getAndIncrement())
}

export function prettyFiberId(_: FiberId): string {
  return `#${_.seqNumber} (started at: ${new Date(_.startTime).toISOString()})`
}
