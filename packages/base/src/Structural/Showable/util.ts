import type { Chunk } from '../../Chunk'

import * as C from '../../Chunk/core'
import * as str from '../../string'
import { isFunction } from '../../util/predicates'

const builtInObjects = new Set(Object.getOwnPropertyNames(globalThis).filter((e) => /^[A-Z][a-zA-Z0-9]+$/.test(e)))

export const addBacktickQuotes = str.surround('`')
export const addSingleQuotes   = str.surround("'")
export const addDoubleQuotes   = str.surround('"')

const byteToHex: Array<string> = []

// Regex used for ansi escape code splitting
// Adopted from https://github.com/chalk/ansi-regex/blob/HEAD/index.js
// License: MIT, authors: @sindresorhus, Qix-, arjunmehta and LitoMore
// Matches all ansi escape code sequences in a string
export const ansiPattern =
  '[\\u001B\\u009B][[\\]()#;?]*' +
  '(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)' +
  '|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
export const ansi        = new RegExp(ansiPattern, 'g')

// Escaped control characters (plus the single quote and the backslash). Use
// empty strings to fill up unused entries.
// prettier-ignore
export const meta = [
  '\\x00', '\\x01', '\\x02', '\\x03', '\\x04', '\\x05', '\\x06', '\\x07', // x07
  '\\b', '\\t', '\\n', '\\x0B', '\\f', '\\r', '\\x0E', '\\x0F',           // x0F
  '\\x10', '\\x11', '\\x12', '\\x13', '\\x14', '\\x15', '\\x16', '\\x17', // x17
  '\\x18', '\\x19', '\\x1A', '\\x1B', '\\x1C', '\\x1D', '\\x1E', '\\x1F', // x1F
  '', '', '', '', '', '', '', "\\'", '', '', '', '', '', '', '', '',      // x2F
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',         // x3F
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',         // x4F
  '', '', '', '', '', '', '', '', '', '', '', '', '\\\\', '', '', '',     // x5F
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',         // x6F
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '\\x7F',    // x7F
  '\\x80', '\\x81', '\\x82', '\\x83', '\\x84', '\\x85', '\\x86', '\\x87', // x87
  '\\x88', '\\x89', '\\x8A', '\\x8B', '\\x8C', '\\x8D', '\\x8E', '\\x8F', // x8F
  '\\x90', '\\x91', '\\x92', '\\x93', '\\x94', '\\x95', '\\x96', '\\x97', // x97
  '\\x98', '\\x99', '\\x9A', '\\x9B', '\\x9C', '\\x9D', '\\x9E', '\\x9F', // x9F
]

/* eslint-disable no-control-regex */
export const strEscapeSequencesRegExp         = /[\x00-\x1f\x27\x5c\x7f-\x9f]/
export const strEscapeSequencesReplacer       = /[\x00-\x1f\x27\x5c\x7f-\x9f]/g
export const strEscapeSequencesRegExpSingle   = /[\x00-\x1f\x5c\x7f-\x9f]/
export const strEscapeSequencesReplacerSingle = /[\x00-\x1f\x5c\x7f-\x9f]/g
export const colorRegExp                      = /\u001b\[\d\d?m/g
/* eslint-enable no-control-regex */

export const classRegExp         = /^(\s+[^(]*?)\s*{/
export const stripCommentsRegExp = /(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g

export const keyStrRegExp = /^[a-zA-Z_][a-zA-Z_0-9]*$/
export const numberRegExp = /^(0|[1-9][0-9]*)$/

export function escapeFn(str: string): string {
  return meta[str.charCodeAt(0)]
}

export const OBJECT_TYPE       = 0
export const ARRAY_TYPE        = 1
export const ARRAY_EXTRAS_TYPE = 2
export const PROTO_TYPE        = 3

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, '0')
  byteToHex.push(hexOctet)
}

export function hex(arrayBuffer: ArrayBuffer) {
  const buff      = new Uint8Array(arrayBuffer)
  const hexOctets = new Array(buff.length)

  for (let i = 0; i < buff.length; ++i) {
    // eslint-disable-next-line functional/immutable-data
    hexOctets[i] = byteToHex[buff[i]]
  }

  return hexOctets.join('')
}

export function pluralize(n: number): string {
  return n > 1 ? 's' : ''
}

export function getKeys(value: object, showHidden = true): Array<PropertyKey> {
  const symbols                = Object.getOwnPropertySymbols(value)
  let keys: Array<PropertyKey> = Object.getOwnPropertyNames(value)
  if (symbols.length !== 0 && showHidden) {
    for (let i = 0; i < symbols.length; i++) {
      keys.push(symbols[i])
    }
  }
  if (!showHidden) {
    keys = keys.filter((k) => Object.prototype.propertyIsEnumerable.call(value, k))
  }
  return keys
}

export function getStringWidth(input: string, removeControlChars = true): number {
  let width = 0
  let str   = input
  if (removeControlChars) {
    str = str.replace(ansi, '')
  }
  str = str.normalize('NFC')
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (isFullWidthCodePoint(code)) {
      width += 2
    } else if (!isZeroWidthCodePoint(code)) {
      width++
    }
  }
  return width
}

/**
 * Returns true if the character represented by a given
 * Unicode code point is full-width. Otherwise returns false.
 */
export function isFullWidthCodePoint(code: number): boolean {
  // Code points are partially derived from:
  // https://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
  return (
    code >= 0x1100 &&
    (code <= 0x115f || // Hangul Jamo
      code === 0x2329 || // LEFT-POINTING ANGLE BRACKET
      code === 0x232a || // RIGHT-POINTING ANGLE BRACKET
      // CJK Radicals Supplement .. Enclosed CJK Letters and Months
      (code >= 0x2e80 && code <= 0x3247 && code !== 0x303f) ||
      // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
      (code >= 0x3250 && code <= 0x4dbf) ||
      // CJK Unified Ideographs .. Yi Radicals
      (code >= 0x4e00 && code <= 0xa4c6) ||
      // Hangul Jamo Extended-A
      (code >= 0xa960 && code <= 0xa97c) ||
      // Hangul Syllables
      (code >= 0xac00 && code <= 0xd7a3) ||
      // CJK Compatibility Ideographs
      (code >= 0xf900 && code <= 0xfaff) ||
      // Vertical Forms
      (code >= 0xfe10 && code <= 0xfe19) ||
      // CJK Compatibility Forms .. Small Form Variants
      (code >= 0xfe30 && code <= 0xfe6b) ||
      // Halfwidth and Fullwidth Forms
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      // Kana Supplement
      (code >= 0x1b000 && code <= 0x1b001) ||
      // Enclosed Ideographic Supplement
      (code >= 0x1f200 && code <= 0x1f251) ||
      // Miscellaneous Symbols and Pictographs 0x1f300 - 0x1f5ff
      // Emoticons 0x1f600 - 0x1f64f
      (code >= 0x1f300 && code <= 0x1f64f) ||
      // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
      (code >= 0x20000 && code <= 0x3fffd))
  )
}

export function isZeroWidthCodePoint(code: number): boolean {
  return (
    code <= 0x1f || // C0 control codes
    (code >= 0x7f && code <= 0x9f) || // C1 control codes
    (code >= 0x300 && code <= 0x36f) || // Combining Diacritical Marks
    (code >= 0x200b && code <= 0x200f) || // Modifying Invisible Characters
    // Combining Diacritical Marks for Symbols
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0xfe00 && code <= 0xfe0f) || // Variation Selectors
    (code >= 0xfe20 && code <= 0xfe2f) || // Combining Half Marks
    (code >= 0xe0100 && code <= 0xe01ef)
  ) // Variation Selectors
}

export function getConstructorName(value: object): [string | null, Chunk<PropertyKey>] {
  let obj        = value
  const tmp      = obj
  let firstProto
  let protoProps = C.empty<PropertyKey>()
  while (obj || isUndetectableObject(obj)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'constructor')
    if (
      descriptor !== undefined &&
      typeof descriptor.value === 'function' &&
      descriptor.value.name !== '' &&
      isInstanceof(tmp, descriptor.value)
    ) {
      if (firstProto !== obj || !builtInObjects.has(descriptor.value.name)) {
        protoProps = C.concat_(protoProps, getPrototypeProperties(tmp, firstProto || tmp))
      }
      return [descriptor.value.name, protoProps]
    }

    obj = Object.getPrototypeOf(obj)
    if (!firstProto) {
      firstProto = obj
    }
  }

  return [null, C.empty()]
}

export function getPrototypeProperties(main: object, obj: object): Chunk<PropertyKey> {
  let proto                 = obj
  let keySet                = new Set<PropertyKey>()
  let keys: PropertyKey[]   = []
  let depth                 = 0
  let output: PropertyKey[] = []

  while (depth <= 3) {
    if (depth !== 0 || main === proto) {
      proto = Object.getPrototypeOf(proto)
      if (proto === null) {
        return C.from(output)
      }
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'constructor')
      if (descriptor !== undefined && isFunction(descriptor.value) && builtInObjects.has(descriptor.value.name)) {
        return C.from(output)
      }
    }

    if (depth !== 0) {
      for (let i = 0; i < keys.length; i++) {
        keySet.add(keys[i])
      }
    }
    keys = Reflect.ownKeys(proto)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (
        key === 'constructor' ||
        Object.prototype.hasOwnProperty.call(main, key) ||
        (depth !== 0 && keySet.has(key))
      ) {
        continue
      }
      const desc = Object.getOwnPropertyDescriptor(proto, key)
      if (typeof desc?.value === 'function') {
        continue
      }
      output.push(key)
    }
    depth++
  }
  return C.from(output)
}

function isInstanceof(value: unknown, constructor: Function): boolean {
  try {
    return value instanceof constructor
  } catch {
    return false
  }
}

function isUndetectableObject(obj: unknown): boolean {
  return typeof obj !== 'undefined' && obj !== undefined
}

export function getPrefix(constructor: string | null, tag: string, fallback: string, size = '') {
  if (constructor === null) {
    if (tag !== '' && fallback !== tag) {
      return `[${fallback}${size}: null prototype] [${tag}] `
    }
    return `[${fallback}${size}: null prototype] `
  }

  if (tag !== '' && constructor !== tag) {
    return `${constructor}${size} [${tag}] `
  }
  return `${constructor}${size} `
}

export function getFunctionBase(value: Function, constructor: string | null, tag: string): string {
  const stringified = value.toString()
  if (stringified.startsWith('class') && stringified.endsWith('}')) {
    const slice        = stringified.slice(5, -1)
    const bracketIndex = slice.indexOf('{')
    if (
      (bracketIndex !== -1 && !slice.slice(0, bracketIndex).includes('(')) ||
      classRegExp.test(slice.replace(stripCommentsRegExp, ''))
    ) {
      return getClassBase(value, constructor, tag)
    }
  }
  const type = 'Function'
  let base   = `[${type}`
  if (constructor === null) {
    base += ' (null prototype)'
  }
  if (value.name === '') {
    base += ' (anonymous)'
  } else {
    base += `: ${value.name}`
  }
  base += ']'
  if (constructor !== type && constructor !== null) {
    base += ` ${constructor}`
  }
  if (tag !== '' && constructor !== tag) {
    base += ` [${tag}]`
  }
  return base
}

export function getClassBase(value: Function, constructor: string | null, tag: string): string {
  const hasName = Object.prototype.hasOwnProperty.call(value, 'name')
  const name    = (hasName && value.name) || '(anonymous)'
  let base      = `class ${name}`
  if (constructor !== 'Function' && constructor !== null) {
    base += ` [${constructor}]`
  }
  if (tag !== '' && constructor !== tag) {
    base += ` [${tag}]`
  }
  if (constructor !== null) {
    const superName = Object.getPrototypeOf(value).name
    if (superName) {
      base += ` extends ${superName}`
    }
  } else {
    base += ' extends [null prototype]'
  }
  return `[${base}]`
}

export function addQuotes(str: string, quotes: number): string {
  if (quotes === -1) {
    return `"${str}"`
  }
  if (quotes === -2) {
    return `\`${str}\``
  }
  return `'${str}'`
}

export function strEscape(str: string): string {
  let escapeTest    = strEscapeSequencesRegExp
  let escapeReplace = strEscapeSequencesReplacer
  let singleQuote   = 39

  // Check for double quotes. If not present, do not escape single quotes and
  // instead wrap the text in double quotes. If double quotes exist, check for
  // backticks. If they do not exist, use those as fallback instead of the
  // double quotes.
  if (str.includes("'")) {
    // This invalidates the charCode and therefore can not be matched for
    // anymore.
    if (!str.includes('"')) {
      singleQuote = -1
    } else if (!str.includes('`') && !str.includes('${')) {
      singleQuote = -2
    }
    if (singleQuote !== 39) {
      escapeTest    = strEscapeSequencesRegExpSingle
      escapeReplace = strEscapeSequencesReplacerSingle
    }
  }

  // Some magic numbers that worked out fine while benchmarking with v8 6.0
  if (str.length < 5000 && !escapeTest.test(str)) {
    return addQuotes(str, singleQuote)
  }
  if (str.length > 100) {
    // eslint-disable-next-line no-param-reassign
    str = str.replace(escapeReplace, escapeFn)
    return addQuotes(str, singleQuote)
  }

  let result      = ''
  let last        = 0
  const lastIndex = str.length
  for (let i = 0; i < lastIndex; i++) {
    const point = str.charCodeAt(i)
    if (point === singleQuote || point === 92 || point < 32 || (point > 126 && point < 160)) {
      if (last === i) {
        result += meta[point]
      } else {
        result += `${str.slice(last, i)}${meta[point]}`
      }
      last = i + 1
    }
  }

  if (last !== lastIndex) {
    result += str.slice(last)
  }
  return addQuotes(result, singleQuote)
}
