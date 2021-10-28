import { sequential } from '../../../ExecutionStrategy'
import { pipe } from '../../../function'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

export function reserve<R, E, A>(ma: Ma.Managed<R, E, A>): I.UIO<Ma.Reservation<R, E, A>> {
  return pipe(
    RM.make,
    I.map((releaseMap) =>
      Ma.makeReservation_(
        pipe(
          ma.io,
          I.gives((r: R) => [r, releaseMap] as const),
          I.map(([, a]) => a)
        ),
        (exit) => releaseAll_(releaseMap, exit, sequential)
      )
    )
  )
}
