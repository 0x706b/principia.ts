import type { Chunk } from '../../Chunk/core'
import type { Fiber } from '../core'

import * as C from '../../Cause'
import * as Ch from '../../Chunk/core'
import * as Ex from '../../Exit'
import { pipe } from '../../function'
import { none, some } from '../../Option'
import * as O from '../../Option'
import { syntheticFiber } from '../core'
import * as I from '../internal/io'
import { awaitAll } from './awaitAll'

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export function collectAll<E, A>(fibers: Iterable<Fiber<E, A>>): Fiber<E, Chunk<A>> {
  return syntheticFiber({
    _tag: 'SyntheticFiber',
    getRef: (ref) =>
      I.foldl_(fibers, ref.initial, (a, fiber) =>
        pipe(
          fiber.getRef(ref),
          I.map((a2) => ref.join(a, a2))
        )
      ),
    inheritRefs: I.foreachUnit_(fibers, (f) => f.inheritRefs),
    interruptAs: (fiberId) =>
      pipe(
        I.foreach_(fibers, (f) => f.interruptAs(fiberId)),
        I.map(
          Ch.foldr(Ex.succeed(Ch.empty<A>()) as Ex.Exit<E, Chunk<A>>, (a, b) =>
            Ex.crossWithCause_(a, b, (_a, _b) => Ch.prepend_(_b, _a), C.both)
          )
        )
      ),
    poll: pipe(
      I.foreach_(fibers, (f) => f.poll),
      I.map(
        Ch.foldr(some(Ex.succeed(Ch.empty()) as Ex.Exit<E, Chunk<A>>), (a, b) =>
          O.match_(
            a,
            () => none(),
            (ra) =>
              O.match_(
                b,
                () => none(),
                (rb) => some(Ex.crossWithCause_(ra, rb, (_a, _b) => Ch.prepend_(_b, _a), C.both))
              )
          )
        )
      )
    ),
    await: awaitAll(fibers)
  })
}
