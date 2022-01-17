import type { Has } from '../../Has'

import { Console } from '../../Console'
import { show } from '../../Structural'
import * as I from '../core'

export function debug<R, E, A>(io: I.IO<R, E, A>): I.IO<R & Has<Console>, E, A> {
  return I.bitap_(
    io,
    (e) => Console.putStrLn(`[FAIL]: ${show(e)}`),
    (a) => Console.putStrLn(show(a))
  )
}
