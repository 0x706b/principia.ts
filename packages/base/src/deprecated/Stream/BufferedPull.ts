import type { Chunk } from '../../Chunk'

import * as C from '../../Chunk'
import { pipe } from '../../function'
import * as I from '../../IO'
import * as M from '../../Maybe'
import * as R from '../../Ref'
import { tuple } from '../../tuple/core'
import * as Pull from './Pull'

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: I.IO<R, M.Maybe<E>, Chunk<A>>,
    readonly done: R.URef<boolean>,
    readonly cursor: R.URef<readonly [Chunk<A>, number]>
  ) {}
}

export function ifNotDone<R1, E1, A1>(
  fa: I.IO<R1, M.Maybe<E1>, A1>
): <R, E, A>(self: BufferedPull<R, E, A>) => I.IO<R1, M.Maybe<E1>, A1> {
  return (self) =>
    pipe(
      self.done.get,
      I.chain((b) => (b ? Pull.end : fa))
    )
}

export function update<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, M.Maybe<E>, void> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.upstream,
        I.matchIO(
          M.match(
            () =>
              pipe(
                self.done.set(true),
                I.chain(() => Pull.end)
              ),
            (e) => Pull.fail(e)
          ),
          (a) => self.cursor.set([a, 0])
        )
      )
    )
  )
}

export function pullElement<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, M.Maybe<E>, A> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([c, i]): [I.IO<R, M.Maybe<E>, A>, [Chunk<A>, number]] => {
          if (i >= c.length) {
            return [
              pipe(
                update(self),
                I.chain(() => pullElement(self))
              ),
              [C.empty(), 0]
            ]
          } else {
            return [I.pure(C.unsafeGet_(c, i)), [c, i + 1]]
          }
        }),
        I.flatten
      )
    )
  )
}

export function pullArray<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, M.Maybe<E>, Chunk<A>> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([chunk, idx]): [I.IO<R, M.Maybe<E>, Chunk<A>>, [Chunk<A>, number]] => {
          if (idx >= chunk.length) {
            return [I.chain_(update(self), () => pullArray(self)), [C.empty(), 0]]
          } else {
            return [I.pure(C.drop_(chunk, idx)), [C.empty(), 0]]
          }
        }),
        I.flatten
      )
    )
  )
}

export function make<R, E, A>(pull: I.IO<R, M.Maybe<E>, Chunk<A>>): I.IO<unknown, never, BufferedPull<R, E, A>> {
  return I.gen(function* (_) {
    const done   = yield* _(R.make(false))
    const cursor = yield* _(R.make<readonly [Chunk<A>, number]>(tuple(C.empty(), 0)))
    return new BufferedPull(pull, done, cursor)
  })
}
