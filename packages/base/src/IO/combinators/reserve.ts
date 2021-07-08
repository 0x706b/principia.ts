// tracing: off

import type { Reservation } from '../../Managed'
import type { IO } from '../core'

import { makeReserve, use_ } from '../../Managed'

/**
 * @trace 1
 */
export function reserve_<R, E, R1, E1, A, R2, E2, B>(
  reservation: IO<R, E, Reservation<R1, E1, A>>,
  use: (a: A) => IO<R2, E2, B>
): IO<R & R1 & R2, E | E1 | E2, B> {
  return use_(makeReserve(reservation), use)
}

/**
 * @trace 0
 */
export function reserve<A, R2, E2, B>(
  use: (a: A) => IO<R2, E2, B>
): <R, E, R1, E1>(reservation: IO<R, E, Reservation<R1, E1, A>>) => IO<R & R1 & R2, E | E1 | E2, B> {
  return (reservation) => reserve_(reservation, use)
}
