export class AssertionError extends Error {
  constructor(readonly message: string) {
    super(`Assertion Failed: ${message}`)
  }
}
export function assert(assertion: boolean, message: string) {
  if (!assertion) {
    throw new AssertionError(message)
  }
}
