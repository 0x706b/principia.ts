import { isDate, isFunction, isPlain } from '@principia/base/prelude'

import { timeoutProvider } from './Scheduler/timeoutProvider'

export function arrayRemove<T>(arr: T[] | undefined | null, item: T) {
  if (arr) {
    const index = arr.indexOf(item)
    0 <= index && arr.splice(index, 1)
  }
}

export function noop(): void {
  // noop
}

export function isAsyncIterable(u: any): u is AsyncIterable<any> {
  return Symbol.asyncIterator && isFunction(u?.[Symbol.asyncIterator])
}

export function isArrayLike(u: any): u is ArrayLike<any> {
  return u != null && typeof u.length === 'number' && typeof u !== 'function'
}

export function isPromiseLike(u: any): u is PromiseLike<any> {
  return isFunction(u?.then)
}

export function isValidDate(u: unknown): u is Date {
  return isDate(u) && !isNaN(u as any)
}

export function reportUnhandledError(err: unknown) {
  return timeoutProvider.setTimeout(() => {
    throw err
  })
}

export function arrayOrObject<T, O extends Record<string, T>>(
  args: ReadonlyArray<T> | [O] | [ReadonlyArray<T>]
): { args: ReadonlyArray<T>, keys: ReadonlyArray<string> | null } {
  if (args.length === 1) {
    const first = args[0]
    if (Array.isArray(first)) {
      return { args: first, keys: null }
    }
    if (isPlain(first)) {
      const keys = Object.keys(first)
      return {
        args: Object.values(first),
        keys
      }
    }
  }

  return { args: args as ReadonlyArray<T>, keys: null }
}

/*
 * -------------------------------------------------------------------------------------------------
 * ReadableStream
 * -------------------------------------------------------------------------------------------------
 */

interface ReadableStreamDefaultReaderLike<T> {
  read(): PromiseLike<
    | {
        done: false
        value: T
      }
    | { done: true, value?: undefined }
  >
  releaseLock(): void
}

export interface ReadableStreamLike<T> {
  getReader(): ReadableStreamDefaultReaderLike<T>
}

export async function* readableStreamToAsyncGenerator<A>(readableStream: ReadableStreamLike<A>): AsyncGenerator<A> {
  const reader = readableStream.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        return
      }
      yield value!
    }
  } finally {
    reader.releaseLock()
  }
}

export function isReadableStream<A>(u: any): u is ReadableStreamLike<A> {
  return isFunction(u?.getReader)
}

export type Init<A extends ReadonlyArray<unknown>> = A extends [...infer Init, infer Last] ? Init : never
