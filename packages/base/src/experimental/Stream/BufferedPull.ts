import * as C from '../../Chunk'
import { pipe } from '../../function'
import * as I from '../../IO'
import * as O from '../../Option'
import { tuple } from '../../prelude'
import * as Ref from '../../Ref'
import * as Pull from './Pull'

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: I.IO<R, O.Option<E>, C.Chunk<A>>,
    readonly done: Ref.URef<boolean>,
    readonly cursor: Ref.URef<readonly [C.Chunk<A>, number]>
  ) {}
}

export function make<R, E, A>(upstream: I.IO<R, O.Option<E>, C.Chunk<A>>) {
  return pipe(
    I.do,
    I.chainS('done', () => Ref.make(false)),
    I.chainS('cursor', () => Ref.make(tuple(C.empty<A>(), 0))),
    I.map(({ cursor, done }) => new BufferedPull<R, E, A>(upstream, done, cursor))
  )
}

export function ifNotDone_<R, R1, E, E1, A, A1>(
  self: BufferedPull<R, E, A>,
  fa: I.IO<R1, O.Option<E1>, A1>
): I.IO<R1, O.Option<E1>, A1> {
  return I.chain_(Ref.get(self.done), (_) => {
    if (_) {
      return Pull.end
    } else {
      return fa
    }
  })
}

export function ifNotDone<R1, E1, A1>(fa: I.IO<R1, O.Option<E1>, A1>) {
  return <R, E, A>(self: BufferedPull<R, E, A>) => ifNotDone_(self, fa)
}

export function update<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, void> {
  return ifNotDone_(
    self,
    I.matchIO_(
      self.upstream,
      O.match(
        () => I.crossSecond_(Ref.set_(self.done, true), Pull.end),
        (e) => Pull.fail(e)
      ),
      (chunk) => Ref.set_(self.cursor, tuple(chunk, 0))
    )
  )
}

export function pullElement<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, A> {
  return ifNotDone_(
    self,
    pipe(
      self.cursor,
      Ref.modify(([chunk, idx]) => {
        if (idx >= chunk.length) {
          return tuple(I.crossSecond_(update(self), pullElement(self)), tuple(C.empty<A>(), 0))
        } else {
          return tuple(I.succeed(C.unsafeGet_(chunk, idx)), tuple(C.empty<A>(), idx + 1))
        }
      }),
      I.flatten
    )
  )
}

export function pullChunk<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, C.Chunk<A>> {
  return ifNotDone_(
    self,
    pipe(
      self.cursor,
      Ref.modify(([chunk, idx]) => {
        if (idx >= chunk.length) {
          return tuple(I.crossSecond_(update(self), pullChunk(self)), tuple(C.empty<A>(), 0))
        } else {
          return tuple(I.succeed(C.drop_(chunk, idx)), tuple(C.empty<A>(), 0))
        }
      }),
      I.flatten
    )
  )
}
