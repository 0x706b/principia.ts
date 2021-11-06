import { AtomicNumber } from '../util/support/AtomicNumber'

export type TxnId = number

export const txnCounter = new AtomicNumber(0)

export function txnId(): TxnId {
  return txnCounter.incrementAndGet()
}
