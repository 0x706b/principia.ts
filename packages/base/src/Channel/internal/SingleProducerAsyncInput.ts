import type { Either } from '../../Either'
import type { UIO } from '../../IO'
import type { Cause } from '../../IO/Cause'
import type { Exit } from '../../IO/Exit'
import type { AsyncInputConsumer, AsyncInputProducer } from './producer'

import * as E from '../../Either'
import { pipe } from '../../function'
import * as F from '../../Future'
import * as T from '../../IO'
import * as Ca from '../../IO/Cause'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import * as Ref from '../../Ref'
import { tuple } from '../../tuple/core'
import { ImmutableQueue } from '../../util/support/ImmutableQueue'

export const StateDoneTag = Symbol()
export type StateDoneTag = typeof StateDoneTag
export const StateErrorTag = Symbol()
export type StateErrorTag = typeof StateErrorTag
export const StateEmptyTag = Symbol()
export type StateEmptyTag = typeof StateEmptyTag
export const StateEmitTag = Symbol()
export type StateEmitTag = typeof StateEmitTag

export const StateTag = {
  Done: StateDoneTag,
  Error: StateErrorTag,
  Empty: StateEmptyTag,
  Emit: StateEmitTag
} as const

export class StateDone<Done> {
  readonly _stateTag: StateDoneTag = StateTag.Done
  constructor(readonly a: Done) {}
}

export class StateError<E> {
  readonly _stateTag: StateErrorTag = StateTag.Error
  constructor(readonly cause: Cause<E>) {}
}

export class StateEmpty {
  readonly _stateTag: StateEmptyTag = StateTag.Empty
  constructor(readonly notifyProducer: F.Future<never, void>) {}
}

export class StateEmit<Err, Elem, Done> {
  readonly _stateTag: StateEmitTag = StateTag.Emit
  constructor(readonly notifyConsumers: ImmutableQueue<F.Future<Err, E.Either<Done, Elem>>>) {}
}

export type State<Err, Elem, Done> = StateEmpty | StateEmit<Err, Elem, Done> | StateError<Err> | StateDone<Done>

/**
 * An MVar-like abstraction for sending data to channels asynchronously. Designed
 * for one producer and multiple consumers.
 *
 * Features the following semantics:
 * - Buffer of size 1
 * - When emitting, the producer waits for a consumer to pick up the value
 *   to prevent "reading ahead" too much.
 * - Once an emitted element is read by a consumer, it is cleared from the buffer, so that
 *   at most one consumer sees every emitted element.
 * - When sending a done or error signal, the producer does not wait for a consumer
 *   to pick up the signal. The signal stays in the buffer after being read by a consumer,
 *   so it can be propagated to multiple consumers.
 * - Trying to publish another emit/error/done after an error/done have already been published
 *   results in an interruption.
 */
export class SingleProducerAsyncInput<Err, Elem, Done>
  implements AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done> {
  constructor(readonly ref: Ref.URef<State<Err, Elem, Done>>) {}

  emit(el: Elem): UIO<unknown> {
    return T.chain_(F.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._stateTag) {
            case StateTag.Emit: {
              const x = state.notifyConsumers.dequeue()
              if (M.isNothing(x)) {
                return tuple(T.unit(), new StateEmpty(p))
              } else {
                const [notifyConsumer, notifyConsumers] = x.value
                return tuple(
                  F.succeed_(notifyConsumer, E.right(el)),
                  notifyConsumers.size === 0 ? new StateEmpty(p) : new StateEmit(notifyConsumers)
                )
              }
            }
            case StateTag.Error: {
              return tuple(T.interrupt, state)
            }
            case StateTag.Done: {
              return tuple(T.interrupt, state)
            }
            case StateTag.Empty: {
              return tuple(F.await(state.notifyProducer), state)
            }
          }
        })
      )
    )
  }

  done(a: Done): UIO<unknown> {
    return T.flatten(
      Ref.modify_(this.ref, (state) => {
        switch (state._stateTag) {
          case StateTag.Emit: {
            return tuple(T.foreachUnit_(state.notifyConsumers, F.succeed(E.left(a))), new StateDone(a))
          }
          case StateTag.Error: {
            return tuple(T.interrupt, state)
          }
          case StateTag.Done: {
            return tuple(T.interrupt, state)
          }
          case StateTag.Empty: {
            return tuple(F.await(state.notifyProducer), state)
          }
        }
      })
    )
  }

  error(cause: Cause<Err>): UIO<unknown> {
    return T.flatten(
      Ref.modify_(this.ref, (state) => {
        switch (state._stateTag) {
          case StateTag.Emit: {
            return tuple(T.foreachUnit_(state.notifyConsumers, F.failCause(cause)), new StateError(cause))
          }
          case StateTag.Error: {
            return tuple(T.interrupt, state)
          }
          case StateTag.Done: {
            return tuple(T.interrupt, state)
          }
          case StateTag.Empty: {
            return tuple(F.await(state.notifyProducer), state)
          }
        }
      })
    )
  }

  takeWith<X>(onError: (cause: Cause<Err>) => X, onElement: (element: Elem) => X, onDone: (done: Done) => X): UIO<X> {
    return T.chain_(F.make<Err, E.Either<Done, Elem>>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._stateTag) {
            case StateTag.Emit: {
              return tuple(
                pipe(F.await(p), T.matchCause(onError, E.match(onDone, onElement))),
                new StateEmit(state.notifyConsumers.push(p))
              )
            }
            case StateTag.Error: {
              return tuple(T.succeed(onError(state.cause)), state)
            }
            case StateTag.Done: {
              return tuple(T.succeed(onDone(state.a)), state)
            }
            case StateTag.Empty: {
              return tuple(
                pipe(
                  state.notifyProducer,
                  F.succeed<void>(undefined),
                  T.apSecond(pipe(F.await(p), T.matchCause(onError, E.match(onDone, onElement))))
                ),
                new StateEmit(ImmutableQueue.single(p))
              )
            }
          }
        })
      )
    )
  }

  take = this.takeWith<Exit<Either<Err, Done>, Elem>>(
    (c) => Ex.failCause(Ca.map_(c, E.left)),
    (el) => Ex.succeed(el),
    (d) => Ex.fail(E.right(d))
  )

  close = T.chain_(T.fiberId(), (id) => this.error(Ca.interrupt(id)))

  awaitRead: T.UIO<void> = pipe(
    this.ref,
    Ref.modify((s) => (s._stateTag === StateTag.Empty ? [F.await(s.notifyProducer), s] : [T.unit(), s])),
    T.flatten
  )
}

/**
 * Creates a SingleProducerAsyncInput
 */
export function makeSingleProducerAsyncInput<Err, Elem, Done>(): UIO<SingleProducerAsyncInput<Err, Elem, Done>> {
  return T.map_(
    T.chain_(F.make<never, void>(), (p) => Ref.make<State<Err, Elem, Done>>(new StateEmpty(p))),
    (ref) => new SingleProducerAsyncInput(ref)
  )
}
