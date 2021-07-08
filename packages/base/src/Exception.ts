import * as P from './prelude'

export abstract class Exception extends Error {
  abstract readonly _tag: string
  readonly stack!: string

  constructor(readonly message: string) {
    super(message)

    Object.defineProperty(this, 'name', {
      enumerable: true,
      value: this.constructor.name
    })
    Object.defineProperty(this, 'message', {
      enumerable: true,
      value: message
    })
  }
}

export const Show: P.Show<Exception> = P.Show(
  (ex) => `An exception occurred at ${ex.stack.split[0]}\n  [${ex.name}]: ${ex.message}`
)

export class InterruptedException extends Exception {
  readonly _tag = 'InterruptedException'
  constructor(message: string) {
    super(message)
  }
}

export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof Error && u['_tag'] === 'InterruptedException'
}

export class RuntimeException extends Exception {
  readonly _tag = 'RuntimeException'
  constructor(message: string) {
    super(message)
  }
}

export function isRuntimeException(u: unknown): u is RuntimeException {
  return u instanceof Error && u['_tag'] === 'RuntimeException'
}
