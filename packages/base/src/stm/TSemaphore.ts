import { pipe } from '../function'
import * as NT from '../Newtype'
import { assert } from '../util/assert'
import * as I from './internal/io'
import * as M from './internal/managed'
import * as STM from './STM'
import * as TR from './TRef'

export interface TSemaphore extends NT.Newtype<'@principia/base/stm/TSemaphore', TR.UTRef<number>> {}
export const TSemaphore = NT.newtype<TSemaphore>()

export function make(permits: number): STM.USTM<TSemaphore> {
  return pipe(TR.make(permits), STM.map(TSemaphore.get))
}

export function unsafeMake(permits: number): TSemaphore {
  return TSemaphore.get(TR.unsafeMake(permits))
}

export function acquireN_(ts: TSemaphore, n: number): STM.USTM<void> {
  return new STM.Effect((journal) => {
    assert(n >= 0, 'Negative permits given to TSemaphore#acquire')

    const value = TR.unsafeGet_(TSemaphore.reverseGet(ts), journal)

    if (value < n) throw new STM.RetryException()
    else return TR.unsafeSet_(TSemaphore.reverseGet(ts), journal, value - n)
  })
}

/**
 * @dataFirst acquireN_
 */
export function acquireN(n: number): (ts: TSemaphore) => STM.USTM<void> {
  return (ts) => acquireN_(ts, n)
}

export function available(ts: TSemaphore): STM.USTM<number> {
  return TR.get(TSemaphore.reverseGet(ts))
}

export function releaseN_(ts: TSemaphore, n: number): STM.USTM<void> {
  return new STM.Effect((journal) => {
    assert(n >= 0, 'Negative permits given to TSemaphore#releaseN')

    const current = TR.unsafeGet_(TSemaphore.reverseGet(ts), journal)
    TR.unsafeSet_(TSemaphore.reverseGet(ts), journal, current + n)
  })
}

/**
 * @dataFirst releaseN_
 */
export function releaseN(n: number): (ts: TSemaphore) => STM.USTM<void> {
  return (ts) => releaseN_(ts, n)
}

export function _withPermits<R, E, A>(ts: TSemaphore, n: number, io: I.IO<R, E, A>): I.IO<R, E, A> {
  return I.uninterruptibleMask(({ restore }) =>
    pipe(
      restore(pipe(acquireN_(ts, n), STM.commit)),
      I.apSecond(pipe(restore(io), I.ensuring(pipe(releaseN_(ts, n), STM.commit))))
    )
  )
}

export function withPermits_<R, E, A>(io: I.IO<R, E, A>, ts: TSemaphore, n: number): I.IO<R, E, A> {
  return _withPermits(ts, n, io)
}

/**
 * @dataFirst withPermits_
 */
export function withPermits(ts: TSemaphore, n: number): <R, E, A>(io: I.IO<R, E, A>) => I.IO<R, E, A> {
  return (io) => _withPermits(ts, n, io)
}

export function _withPermit<R, E, A>(ts: TSemaphore, io: I.IO<R, E, A>): I.IO<R, E, A> {
  return _withPermits(ts, 1, io)
}

export function withPermit_<R, E, A>(io: I.IO<R, E, A>, ts: TSemaphore): I.IO<R, E, A> {
  return _withPermit(ts, io)
}

/**
 * @dataFirst withPermit_
 */
export function withPermit(ts: TSemaphore): <R, E, A>(io: I.IO<R, E, A>) => I.IO<R, E, A> {
  return (io) => _withPermit(ts, io)
}

export function withPermitsManaged(ts: TSemaphore, n: number): M.UManaged<void> {
  return M.bracketExitInterruptible_(STM.commit(acquireN_(ts, n)), () => STM.commit(releaseN_(ts, n)))
}

export function withPermitManaged(ts: TSemaphore): M.UManaged<void> {
  return withPermitsManaged(ts, 1)
}
