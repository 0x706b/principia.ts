import type * as HKT from './HKT'

import * as NT from './Newtype'

interface ByteN extends HKT.HKT {
  readonly type: Byte
}
export interface Byte
  extends NT.Newtype<
    {
      readonly Byte: unique symbol
    },
    number
  > {}
export const Byte = NT.newtype<ByteN>()

export type ByteArray = ArrayLike<Byte> & IterableIterator<Byte> & Uint8Array

/**
 * @optimize identity
 */
export function fromNumber(n: number): Byte {
  return Byte.get(n)
}

/**
 * @optimize identity
 */
export function toNumber(b: Byte): number {
  return Byte.reverseGet(b)
}
