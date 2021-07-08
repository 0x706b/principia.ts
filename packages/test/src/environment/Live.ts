import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { IOEnv } from '@principia/base/IOEnv'
import type { Layer } from '@principia/base/Layer'

import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
import * as P from '@principia/base/prelude'

export const LiveTag = tag<Live>()

export abstract class Live {
  abstract provide<E, A>(io: IO<IOEnv, E, A>): IO<unknown, E, A>

  static default: Layer<IOEnv, never, Has<Live>> = L.fromManaged(LiveTag)(
    M.asks((ioenv) => {
      return new (class extends Live {
        provide<E, A>(io: IO<IOEnv, E, A>): IO<unknown, E, A> {
          return I.giveAll_(io, ioenv)
        }
      })()
    })
  )

  static live<E, A>(io: IO<IOEnv, E, A>): IO<Has<Live>, E, A> {
    return I.asksServiceIO(LiveTag)((live) => live.provide(io))
  }
}

export function withLive_<R, E, A, E1, B>(
  io: IO<R, E, A>,
  f: (_: IO<unknown, E, A>) => IO<IOEnv, E1, B>
): IO<P.Erase<R, Has<Live>>, E | E1, B> {
  return P.pipe(
    I.ask<R & Has<Live>>(),
    I.chain((r) => Live.live(f(I.giveAll_(io, r))))
  ) as any
}

export function withLive<E, A, E1, B>(
  f: (_: IO<unknown, E, A>) => IO<IOEnv, E1, B>
): <R>(io: IO<R, E, A>) => IO<P.Erase<R, Has<Live>>, E | E1, B> {
  return (io) => withLive_(io, f)
}
