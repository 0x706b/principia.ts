import type { Constructor, Primitive } from './types'

export function isDefined<A>(value: A | undefined): value is A {
  return value !== undefined
}

export function isUndefined<A>(value: A | undefined): value is undefined {
  return value === undefined
}

export function isNonNull<A>(value: A | null): value is A {
  return value !== null
}

export function isNull<A>(value: A | null): value is null {
  return value === null
}

export function isNonNullable<A>(value: A | null | undefined): value is A {
  return value != null
}

export function isNullable<A>(value: A | null | undefined): value is null | undefined {
  return value == null
}

export function isIterable<A>(value: unknown): value is Iterable<A> {
  return isObject(value) && Symbol.iterator in value
}

export function isArray<A>(value: A | Array<A> | ReadonlyArray<A>): value is Array<A>
export function isArray<A>(value: unknown): value is Array<A>
export function isArray(value: unknown): boolean {
  return Array.isArray(value)
}

export function isObject<A extends Function>(value: A): false
export function isObject(value: unknown): value is object
export function isObject<A>(value: A | Primitive): value is A
export function isObject<A>(value: A | Primitive): boolean {
  return typeof value === 'object' && value !== null
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isByte(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 255
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol'
}

export function isPlain(value: unknown): value is object {
  return isObject(value) && value.constructor === Object
}

export function isInstanceOf<C extends Constructor<A>, A>(type: C): (value: unknown) => value is A {
  return (value): value is A => value instanceof type
}

export function isMap(u: unknown): u is Map<unknown, unknown> {
  return u instanceof Map
}

export function isWeakMap(u: unknown): u is WeakMap<object, unknown> {
  return u instanceof WeakMap
}

export function isPromise(u: unknown): u is Promise<unknown> {
  return u instanceof Promise
}

export function isSet(u: unknown): u is Set<unknown> {
  return u instanceof Set
}

export function isWeakSet(u: unknown): u is WeakSet<object> {
  return u instanceof WeakSet
}

export function isDate(u: unknown): u is Date {
  return u instanceof Date
}

export type TypedArray =
  | BigInt64Array
  | BigUint64Array
  | Float64Array
  | Float32Array
  | Int32Array
  | Int16Array
  | Int8Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Uint8ClampedArray

const TypedArrayConstructor = Object.getPrototypeOf(Uint8Array)

export function isTypedArray(u: unknown): u is TypedArray {
  return u instanceof TypedArrayConstructor
}

export function isRegExp(u: unknown): u is RegExp {
  return isObject(u) && (getTag(u) === '[object RegExp]' || u instanceof RegExp)
}

export function isAnyArrayBuffer(u: unknown): u is ArrayBuffer | SharedArrayBuffer {
  return u instanceof ArrayBuffer || u instanceof SharedArrayBuffer
}

export function isArrayBuffer(u: unknown): u is ArrayBuffer {
  return u instanceof ArrayBuffer
}

export function isDataView(u: unknown): u is DataView {
  return u instanceof DataView
}

function getTag(value: object) {
  return Object.prototype.toString.call(value)
}
