import * as I from '../core'

export function fromCallback<L, R>(f: (cb: (e: L | null | undefined, r?: R) => void) => void): () => I.FIO<L, R>
export function fromCallback<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => I.FIO<L, R>
export function fromCallback<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => I.FIO<L, R>
export function fromCallback<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => I.FIO<L, R>
export function fromCallback<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => I.FIO<L, R>
export function fromCallback<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => I.FIO<L, R>
export function fromCallback<L, R>(f: Function): () => I.FIO<L, R> {
  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments)

    return I.async((resolve) => {
      const cb = (e: L, r: R) => (e != null ? resolve(I.fail(e)) : resolve(I.succeed(r)))
      // eslint-disable-next-line prefer-spread
      f.apply(null, args.concat(cb))
    })
  }
}
