import * as NT from './Newtype'

export interface Byte extends NT.Newtype<'Byte', number> {}
export const Byte = NT.newtype<Byte>()

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
