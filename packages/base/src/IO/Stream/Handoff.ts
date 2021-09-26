import type { Option } from '../../Option'

import { pipe } from '../../function'
import { none, some } from '../../Option'
import { matchTag } from '../../util/match'
import * as I from '..'
import * as F from '../Future'
import * as Ref from '../Ref'

type State<A> = Empty | Full<A>

class Empty {
  readonly _tag = 'Empty'
  constructor(readonly notifyConsumer: F.Future<never, void>) {}
}

class Full<A> {
  readonly _tag = 'Full'
  constructor(readonly a: A, readonly notifyProducer: F.Future<never, void>) {}
}

/**
 * A synchronous queue-like abstraction that allows a producer to offer
 * an element and wait for it to be taken, and allows a consumer to wait
 * for an element to be available.
 */
class Handoff<A> {
  readonly _tag = 'Handoff'
  constructor(readonly ref: Ref.URef<State<A>>) {}
}

export function make<A>(): I.UIO<Handoff<A>> {
  return pipe(
    F.make<never, void>(),
    I.chain((p) => Ref.make<State<A>>(new Empty(p))),
    I.map((ref) => new Handoff(ref))
  )
}

export function offer<A>(a: A) {
  return (h: Handoff<A>): I.UIO<void> =>
    pipe(
      F.make<never, void>(),
      I.chain((p) =>
        pipe(
          h.ref,
          Ref.modify<I.UIO<void>, State<A>>(
            matchTag({
              Empty: ({ notifyConsumer }) =>
                [pipe(F.succeed_(notifyConsumer, undefined), I.crossSecond(F.await(p))), new Full(a, p)] as const,
              Full: (s) =>
                [
                  pipe(
                    F.await(s.notifyProducer),
                    I.chain(() => offer(a)(h))
                  ),
                  s
                ] as const
            })
          ),
          I.flatten
        )
      )
    )
}

export function take<A>(h: Handoff<A>): I.UIO<A> {
  return pipe(
    F.make<never, void>(),
    I.chain((p) =>
      pipe(
        h.ref,
        Ref.modify<I.UIO<A>, State<A>>(
          matchTag({
            Empty: (s) =>
              [
                pipe(
                  F.await(s.notifyConsumer),
                  I.chain(() => take(h))
                ),
                s
              ] as const,
            Full: ({ a, notifyProducer }) =>
              [pipe(F.succeed_(notifyProducer, undefined), I.as(a)), new Empty(p)] as const
          })
        ),
        I.flatten
      )
    )
  )
}

export function poll<A>(h: Handoff<A>): I.UIO<Option<A>> {
  return pipe(
    F.make<never, void>(),
    I.chain((p) =>
      pipe(
        h.ref,
        Ref.modify<I.UIO<Option<A>>, State<A>>(
          matchTag({
            Empty: (s) => [I.succeed(none()), s] as const,
            Full: ({ a, notifyProducer }) =>
              [pipe(F.succeed_(notifyProducer, undefined), I.as(some(a))), new Empty(p)] as const
          })
        ),
        I.flatten
      )
    )
  )
}
