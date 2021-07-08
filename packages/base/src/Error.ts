export class IllegalArgumentError extends Error {
  readonly _tag = 'IllegalArgumentError'
  constructor(message: string, readonly fn: string) {
    super(message)
    this.name = this._tag
  }
}

export function isIllegalArgumentError(u: unknown): u is IllegalArgumentError {
  return u instanceof Error && u['_tag'] === 'IllegalArgumentError'
}

export class IllegalStateError extends Error {
  readonly _tag = 'IllegalStateError'
  constructor(message: string) {
    super(message)
  }
}

export function isIllegalStateError(u: unknown): u is IllegalStateError {
  return u instanceof Error && u['_tag'] === 'IllegalStateError'
}

export class NoSuchElementError extends Error {
  readonly _tag = 'NoSuchElementError'
  constructor(method: string) {
    super(`${method}: No such element`)
    this.name = this._tag
  }
}

export class PrematureGeneratorExitError extends Error {
  readonly _tag = 'PrematureGeneratorExitError'
  constructor(method: string) {
    super(
      `Error: ${method}. Replaying values resulted in a premature end of the generator execution. Ensure that the generator is pure and that effects are performed only by yielding.`
    )
    this.name = this._tag
  }
}
