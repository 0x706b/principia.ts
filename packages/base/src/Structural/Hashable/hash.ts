import * as H from '../../Hash'
import { PCGRandom } from '../../internal/PCGRandom'
import { isArray, isDefined, isIterable, isPlain } from '../../util/predicates'
import { $hash, isHashable } from './core'

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const DefaultHash: H.Hash<unknown> = H.Hash(hash)

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

const CACHE  = new WeakMap<any, number>()
const RANDOM = new PCGRandom((Math.random() * 4294967296) >>> 0)

export function randomInt(): number {
  return RANDOM.integer(0x7fffffff)
}

let _current = 0

export function hashString(str: string) {
  return opt(_hashString(str))
}

function _hashString(str: string) {
  let h = 5381
  let i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h
}

export function hashNumber(n: number): number {
  return opt(_hashNumber(n))
}

function _hashNumber(n: number): number {
  if (n !== n || n === Infinity) return 0
  let h = n | 0
  if (h !== n) h ^= n * 0xffffffff
  // eslint-disable-next-line no-param-reassign
  while (n > 0xffffffff) h ^= n /= 0xffffffff
  return n
}

export function hashObject(value: object): number {
  return opt(_hashObject(value))
}

function _hashObject(value: object): number {
  let h = CACHE.get(value)
  if (isDefined(h)) return h
  if (isHashable(value)) {
    h = value[$hash]
  } else if (isArray(value)) {
    h = _hashArray(value)
  } else if (isIterable(value)) {
    h = _hashIterator(value[Symbol.iterator]())
  } else if (isPlain(value)) {
    h = _hashPlainObject(value)
  } else {
    h = _current++
  }
  CACHE.set(value, h)
  return h
}

export function hashPlainObject(o: any) {
  return opt(_hashPlainObject(o))
}

function _hashPlainObject(o: any): number {
  CACHE.set(o, randomInt())
  const keys = Object.keys(o)
  let h      = 12289
  for (let i = 0; i < keys.length; i++) {
    h       = _combineHash(h, _hashString(keys[i]))
    const c = CACHE.get(o[keys[i]])
    h       = c ? _combineHash(h, c) : _combineHash(h, _hash((o as any)[keys[i]]))
  }
  return h
}

export function hashMiscRef(o: any) {
  return opt(_hashMiscRef(o))
}

function _hashMiscRef(o: any): number {
  let h = CACHE.get(o)
  if (isDefined(h)) return h
  h = randomInt()
  CACHE.set(o, h)
  return h
}

export function hashArray(arr: Array<any> | ReadonlyArray<any>): number {
  return opt(_hashArray(arr))
}

function _hashArray(arr: Array<any> | ReadonlyArray<any>): number {
  let h = 6151
  for (let i = 0; i < arr.length; i++) {
    h = _combineHash(_hashNumber(i), _hash(arr[i]))
  }
  return h
}

export function hashIterator(it: Iterator<any>): number {
  return opt(_hashIterator(it))
}

function _hashIterator(it: Iterator<any>): number {
  let res: IteratorResult<any>
  let h = 6151
  while (!(res = it.next()).done) {
    h = _combineHash(h, hash(res.value))
  }
  return h
}

export function hash(value: unknown): number {
  return opt(_hash(value))
}

function isZero(value: unknown): boolean {
  return value === null || value === void 0 || value === false
}

function _hash(arg: any): number {
  let x = arg
  if (isZero(x)) return 0
  if (typeof x.valueOf === 'function' && x.valueOf !== Object.prototype.valueOf) {
    x = x.valueOf()
    if (isZero(x)) return 0
  }
  switch (typeof x) {
    case 'number':
      return _hashNumber(x)
    case 'string':
      return _hashString(x)
    case 'function':
      return _hashMiscRef(x)
    case 'object':
      return _hashObject(x)
    case 'boolean':
      return x === true ? 1 : 0
    case 'symbol':
      return _hashString(String(x))
    case 'bigint':
      return _hashString(x.toString(10))
    case 'undefined': {
      return 0
    }
  }
}

export function combineHash(x: number, y: number): number {
  return opt(_combineHash(x, y))
}

export function _combineHash(x: number, y: number): number {
  return (x * 53) ^ y
}

export function opt(n: number): number {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}
