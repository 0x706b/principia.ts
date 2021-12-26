import { sequential } from '../../ExecutionStrategy'
import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from '../ReleaseMap'

export function reserve<R, E, A>(ma: Ma.Managed<R, E, A>): I.UIO<Ma.Reservation<R, E, A>> {
  return pipe(
    RM.make,
    I.map((releaseMap) =>
      Ma.makeReservation_(
        pipe(
          Ma.currentReleaseMap,
          FR.locally(
            releaseMap,
            pipe(
              ma.io,
              I.map(([_, a]) => a)
            )
          )
        ),
        (exit) => releaseAll_(releaseMap, exit, sequential)
      )
    )
  )
}
