import type { Sized } from '../Sized'
import type { Gen, LengthConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as A from '@principia/base/Array'

import { arrayN_ } from './array'
import { alphaNumericChar, asciiChar, base64Char, char16, fullUnicodeChar, hexChar, unicodeChar } from './char'
import * as G from './core'

export function asciiString<R>(constraints?: LengthConstraints): Gen<R & Has<Random> & Has<Sized>, string> {
  return string(asciiChar, constraints)
}

export function alphaNumericString(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(alphaNumericChar, constraints)
}

export function base64String(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(base64Char, constraints)
}

export function fullUnicodeString(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(fullUnicodeChar, constraints)
}

export function hexString(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(hexChar, constraints)
}

export function string16(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(char16, constraints)
}

export function string<R>(
  char: Gen<R, string>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, string> {
  const min = constraints.minLength || 0
  return constraints.maxLength
    ? G.bounded(min, constraints.maxLength, (n) => stringN(char, n))
    : G.small((n) => stringN(char, n), min)
}

export function stringN<R>(char: Gen<R, string>, n: number): Gen<R, string> {
  return G.map_(arrayN_(char, n), A.join(''))
}

export function unicodeString(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(unicodeChar, constraints)
}
