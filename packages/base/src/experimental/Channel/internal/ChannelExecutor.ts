/* eslint-disable functional/immutable-data */
import type { Cause } from '../../../Cause'
import type { Exit } from '../../../Exit'
import type { IO, URIO } from '../../../IO'
import type { List, MutableList } from '../../../List'
import type { ChannelState } from './ChannelState'

import * as Ca from '../../../Cause'
import * as Ex from '../../../Exit'
import * as F from '../../../Fiber'
import { identity, pipe } from '../../../function'
import * as I from '../../../IO'
import * as L from '../../../List'
import * as O from '../../../Option'
import * as C from '../core'
import * as State from './ChannelState'

type ErasedChannel<R> = C.Channel<R, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedExecutor<R> = ChannelExecutor<R, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedContinuation<R> = C.Continuation<R, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedFinalizer<R> = C.ContinuationFinalizer<R, unknown, unknown>

/*
 * -------------------------------------------------------------------------------------------------
 * SubexecutorStack
 * -------------------------------------------------------------------------------------------------
 */

type SubexecutorStack<R> = FromKAnd<R> | Inner<R>

const SubexecutorStackTag = {
  FromKAnd: 'FromKAnd',
  Inner: 'Inner'
} as const

class FromKAnd<R> {
  readonly _tag = SubexecutorStackTag.FromKAnd
  constructor(readonly fromK: ErasedExecutor<R>, readonly rest: Inner<R>) {}
}

class Inner<R> {
  readonly _tag = SubexecutorStackTag.Inner
  constructor(
    readonly exec: ErasedExecutor<R>,
    readonly subK: (_: unknown) => ErasedChannel<R>,
    readonly lastDone: unknown,
    readonly combineSubK: (_: unknown, __: unknown) => unknown,
    readonly combineSubKAndInner: (_: unknown, __: unknown) => unknown
  ) {}
  close(ex: Exit<unknown, unknown>): URIO<R, Exit<unknown, unknown>> | undefined {
    const fin = this.exec.close(ex)
    if (fin) return I.result(fin)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * ChannelExecutor
 * -------------------------------------------------------------------------------------------------
 */

const endUnit = new C.Done(() => void 0)

function maybeCloseBoth<Env>(
  l: IO<Env, never, unknown> | undefined,
  r: IO<Env, never, unknown> | undefined
): URIO<Env, Exit<never, unknown>> | undefined {
  if (l && r) return pipe(I.result(l), I.crossWith(I.result(r), Ex.crossSecond_))
  else if (l) return I.result(l)
  else if (r) return I.result(r)
}

export class ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  private input?: ErasedExecutor<Env>
  private inProgressFinalizer?: URIO<Env, Exit<unknown, unknown>>
  private subexecutorStack?: SubexecutorStack<Env>
  private doneStack: List<ErasedContinuation<Env>> = L.empty()
  private done?: Exit<unknown, unknown>
  private cancelled?: Exit<OutErr, OutDone>
  private emitted?: unknown
  private currentChannel?: ErasedChannel<Env>

  constructor(
    initialChannel: () => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    private providedEnv: unknown
  ) {
    this.currentChannel = initialChannel() as ErasedChannel<Env>
  }

  private restorePipe(
    exit: Exit<unknown, unknown>,
    prev: ErasedExecutor<Env> | undefined
  ): IO<Env, never, unknown> | undefined {
    const currInput = this.input
    this.input      = prev
    return currInput?.close(exit)
  }

  private unwindAllFinalizers(
    acc: Exit<unknown, unknown>,
    conts: List<ErasedContinuation<Env>>,
    exit: Exit<unknown, unknown>
  ): IO<Env, unknown, unknown> {
    while (!L.isEmpty(conts)) {
      const head = L.unsafeHead(conts)!
      C.concreteContinuation(head)
      if (head._tag === C.ChannelTag.ContinuationK) {
        // eslint-disable-next-line no-param-reassign
        conts = L.tail(conts)
      } else {
        return pipe(
          I.result(head.finalizer(exit)),
          I.chain((finExit) => this.unwindAllFinalizers(Ex.crossSecond_(acc, finExit), L.tail(conts), exit))
        )
      }
    }
    return I.done(acc)
  }

  private popAllFinalizers(exit: Exit<unknown, unknown>): URIO<Env, Exit<unknown, unknown>> {
    const effect   = I.result(this.unwindAllFinalizers(Ex.unit(), this.doneStack, exit))
    this.doneStack = L.empty()
    this.storeInProgressFinalizer(effect)
    return effect
  }

  private popNextFinalizersGo(
    stack: List<ErasedContinuation<Env>>,
    builder: MutableList<C.ContinuationFinalizer<Env, unknown, unknown>>
  ) {
    while (!L.isEmpty(stack)) {
      const head = L.unsafeHead(stack)!
      C.concreteContinuation(head)
      if (head._tag === C.ChannelTag.ContinuationK) {
        return stack
      }
      L.push(head, builder)
      // eslint-disable-next-line no-param-reassign
      stack = L.tail(stack)
    }
    return L.empty()
  }

  private popNextFinalizers(): L.List<C.ContinuationFinalizer<Env, unknown, unknown>> {
    const builder  = L.emptyPushable<C.ContinuationFinalizer<Env, unknown, unknown>>()
    this.doneStack = this.popNextFinalizersGo(this.doneStack, builder)
    return builder
  }

  private storeInProgressFinalizer(effect: URIO<Env, Exit<unknown, unknown>>): void {
    this.inProgressFinalizer = effect
  }

  private clearInProgressFinalizer(): void {
    this.inProgressFinalizer = undefined
  }

  private ifNotNull<R, E>(io: URIO<R, Exit<E, unknown>> | undefined): URIO<R, Exit<E, unknown>> {
    return io ?? I.succeed(Ex.unit())
  }

  close(exit: Exit<unknown, unknown>): IO<Env, never, unknown> | undefined {
    const runInProgressFinalizer = this.inProgressFinalizer
      ? I.ensuring_(
          this.inProgressFinalizer,
          I.succeedLazy(() => this.clearInProgressFinalizer())
        )
      : undefined

    let closeSubexecutors: URIO<Env, Exit<unknown, unknown>> | undefined

    if (this.subexecutorStack) {
      if (this.subexecutorStack._tag === SubexecutorStackTag.Inner) {
        closeSubexecutors = this.subexecutorStack.close(exit)
      } else {
        const fin1 = this.subexecutorStack.fromK.close(exit)
        const fin2 = this.subexecutorStack.rest.close(exit)

        if (fin1 && fin2) {
          closeSubexecutors = pipe(I.result(fin1), I.crossWith(I.result(fin2), Ex.crossSecond_))
        } else if (fin1) {
          closeSubexecutors = I.result(fin1)
        } else if (fin2) {
          closeSubexecutors = I.result(fin2)
        }
      }
    }

    let closeSelf: URIO<Env, Exit<unknown, unknown>> | undefined

    const selfFinalizers = this.popAllFinalizers(exit)

    if (selfFinalizers) {
      closeSelf = I.ensuring_(
        selfFinalizers,
        I.succeedLazy(() => this.clearInProgressFinalizer())
      )
    }

    if (closeSubexecutors || runInProgressFinalizer || closeSelf) {
      return pipe(
        I.sequenceT(
          this.ifNotNull(closeSubexecutors),
          this.ifNotNull(runInProgressFinalizer),
          this.ifNotNull(closeSelf)
        ),
        I.map(([a, b, c]) => pipe(a, Ex.crossSecond(b), Ex.crossSecond(c))),
        I.uninterruptible
      )
    }
  }

  getDone() {
    return this.done as Exit<OutErr, OutDone>
  }

  getEmit() {
    return this.emitted as OutElem
  }

  cancelWith(exit: Exit<OutErr, OutDone>) {
    this.cancelled = exit
  }

  private processCancellation(): ChannelState<Env, unknown> {
    this.currentChannel = undefined
    this.done           = this.cancelled
    this.cancelled      = undefined
    return State._Done
  }

  private finishSubexecutorWithCloseEffect(
    subexecDone: Exit<unknown, unknown>,
    closeEffect: IO<Env, never, unknown> | undefined
  ) {
    if (closeEffect) {
      return new State.Effect(
        pipe(
          closeEffect,
          I.matchCauseIO(
            (cause) =>
              this.finishWithExit(
                Ex.halt(
                  Ca.then(
                    Ex.match_(subexecDone, identity, () => Ca.empty),
                    cause
                  )
                )
              ),
            () => this.finishWithExit(subexecDone)
          )
        )
      )
    } else {
      const state: ChannelState<Env, unknown> | undefined = Ex.match_(
        subexecDone,
        (cause) => this.doneHalt(cause),
        (a) => this.doneSucceed(a)
      )

      this.subexecutorStack = undefined

      return state
    }
  }

  private finishWithExit(exit: Exit<unknown, unknown>): IO<Env, unknown, unknown> {
    const state: ChannelState<Env, unknown> | undefined = Ex.match_(
      exit,
      (cause) => this.doneHalt(cause),
      (out) => this.doneSucceed(out)
    )

    this.subexecutorStack = undefined

    if (state) {
      return state.effect
    } else {
      return I.unit()
    }
  }

  private runFinalizers(
    finalizers: List<(e: Exit<unknown, unknown>) => URIO<Env, unknown>>,
    exit: Exit<unknown, unknown>
  ): URIO<Env, Exit<unknown, unknown>> {
    if (L.isEmpty(finalizers)) {
      return I.succeed(Ex.unit())
    }
    return pipe(
      finalizers,
      I.foreach((cont) => I.result(cont(exit))),
      I.map((results) =>
        pipe(
          Ex.collectAll(...results),
          O.getOrElse(() => Ex.unit())
        )
      )
    )
  }

  private handleSubexecFailure(
    exec: ErasedExecutor<Env>,
    rest: Inner<Env>,
    self: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    cause: Cause<unknown>
  ): ChannelState<Env, unknown> | undefined {
    const closeEffect = maybeCloseBoth(exec.close(Ex.halt(cause)), rest.exec.close(Ex.halt(cause)))
    return self.finishSubexecutorWithCloseEffect(
      Ex.halt(cause),
      closeEffect ? I.chain_(closeEffect, I.done) : undefined
    )
  }

  private drainFromKAndSubexecutor(
    exec: ErasedExecutor<Env>,
    rest: Inner<Env>
  ): ChannelState<Env, unknown> | undefined {
    const run = exec.run()
    State.concrete(run)
    switch (run._tag) {
      case State.ChannelStateTag.Effect: {
        return new State.Effect(
          pipe(
            run.effect,
            I.catchAllCause((cause) => this.handleSubexecFailure(exec, rest, this, cause)?.effect || I.unit())
          )
        )
      }
      case State.ChannelStateTag.Emit: {
        this.emitted = exec.getEmit()
        return State._Emit
      }
      case State.ChannelStateTag.Done: {
        const done = exec.getDone()
        return Ex.match_(
          done,
          (cause) => this.handleSubexecFailure(exec, rest, this, cause),
          (value) => {
            const closeEffect  = exec.close(done)
            const modifiedRest = new Inner(
              rest.exec,
              rest.subK,
              rest.lastDone ? rest.combineSubK(rest.lastDone, value) : value,
              rest.combineSubK,
              rest.combineSubKAndInner
            )

            if (closeEffect) {
              return new State.Effect(
                I.matchCauseIO_(
                  closeEffect,
                  (cause) => {
                    const restClose = rest.exec.close(Ex.halt(cause))

                    if (restClose) {
                      return I.matchCauseIO_(
                        restClose,
                        (restCause) => this.finishWithExit(Ex.halt(Ca.then(cause, restCause))),
                        () => this.finishWithExit(Ex.halt(cause))
                      )
                    } else {
                      return this.finishWithExit(Ex.halt(cause))
                    }
                  },
                  () => I.succeedLazy(() => this.replaceSubexecutor(modifiedRest))
                )
              )
            } else {
              this.replaceSubexecutor(modifiedRest)
              return undefined
            }
          }
        )
      }
    }
  }

  private drainInnerSubExecutor(inner: Inner<Env>): ChannelState<Env, unknown> | undefined {
    const run = inner.exec.run()
    State.concrete(run)

    switch (run._tag) {
      case State.ChannelStateTag.Emit: {
        const fromK: ErasedExecutor<Env> = new ChannelExecutor(() => inner.subK(inner.exec.getEmit()), this.providedEnv)
        fromK.input                      = this.input
        this.subexecutorStack            = new FromKAnd(fromK, inner)
        return undefined
      }
      case State.ChannelStateTag.Done: {
        const done = inner.exec.getDone()
        return Ex.match_(
          done,
          () => this.finishSubexecutorWithCloseEffect(done, inner.exec.close(done)),
          (value) => {
            const doneValue = Ex.succeed(inner.combineSubKAndInner(inner.lastDone, value))
            return this.finishSubexecutorWithCloseEffect(doneValue, inner.exec.close(doneValue))
          }
        )
      }
      // eslint-disable-next-line no-fallthrough
      case State.ChannelStateTag.Effect: {
        return new State.Effect(
          I.catchAllCause_(
            run.effect,
            (cause) =>
              this.finishSubexecutorWithCloseEffect(Ex.halt(cause), inner.exec.close(Ex.halt(cause)))?.effect ||
              I.unit()
          )
        )
      }
    }
  }

  private drainSubexecutor(): ChannelState<Env, unknown> | undefined {
    const subexecutorStack = this.subexecutorStack!

    if (subexecutorStack._tag === SubexecutorStackTag.Inner) {
      return this.drainInnerSubExecutor(subexecutorStack)
    } else {
      return this.drainFromKAndSubexecutor(subexecutorStack.fromK, subexecutorStack.rest)
    }
  }

  private replaceSubexecutor(nextSubExec: Inner<Env>) {
    this.currentChannel   = undefined
    this.subexecutorStack = nextSubExec
  }

  private doneSucceed(z: unknown): ChannelState<Env, unknown> | undefined {
    if (L.isEmpty(this.doneStack)) {
      this.done           = Ex.succeed(z)
      this.currentChannel = undefined
      return State._Done
    }
    const head = L.unsafeHead(this.doneStack)!
    C.concreteContinuation(head)

    if (head._tag === C.ChannelTag.ContinuationK) {
      this.doneStack      = L.tail(this.doneStack)
      this.currentChannel = head.onSuccess(z)
      return
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack      = finalizers
        this.done           = Ex.succeed(z)
        this.currentChannel = undefined
        return State._Done
      } else {
        const finalizerEffect = this.runFinalizers(
          L.map_(finalizers, (_) => _.finalizer),
          Ex.succeed(z)
        )
        this.storeInProgressFinalizer(finalizerEffect)
        return new State.Effect(
          pipe(
            finalizerEffect,
            I.ensuring(
              I.succeedLazy(() => {
                this.clearInProgressFinalizer()
              })
            ),
            I.uninterruptible,
            I.chain(() => I.succeedLazy(() => this.doneSucceed(z)))
          )
        )
      }
    }
  }

  private doneHalt(cause: Cause<unknown>): ChannelState<Env, unknown> | undefined {
    if (L.isEmpty(this.doneStack)) {
      this.done           = Ex.halt(cause)
      this.currentChannel = undefined
      return State._Done
    }
    const head = L.unsafeHead(this.doneStack)!
    C.concreteContinuation(head)

    if (head._tag === C.ChannelTag.ContinuationK) {
      this.doneStack      = L.tail(this.doneStack)
      this.currentChannel = head.onHalt(cause)
      return
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack      = finalizers
        this.done           = Ex.halt(cause)
        this.currentChannel = undefined
        return State._Done
      } else {
        const finalizerEffect = this.runFinalizers(
          L.map_(finalizers, (_) => _.finalizer),
          Ex.halt(cause)
        )
        this.storeInProgressFinalizer(finalizerEffect)
        return new State.Effect(
          pipe(
            finalizerEffect,
            I.ensuring(
              I.succeedLazy(() => {
                this.clearInProgressFinalizer()
              })
            ),
            I.uninterruptible,
            I.chain(() => I.succeedLazy(() => this.doneHalt(cause)))
          )
        )
      }
    }
  }

  private addFinalizer(f: ErasedFinalizer<Env>) {
    this.doneStack = L.prepend_(this.doneStack, f)
  }

  private runReadGo(
    state: ChannelState<Env, unknown>,
    read: C.Read<Env, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>,
    input: ErasedExecutor<Env>
  ): I.URIO<Env, void> {
    State.concrete(state)
    switch (state._tag) {
      case State.ChannelStateTag.Emit: {
        return I.succeedLazy(() => {
          this.currentChannel = read.more(input.getEmit())
        })
      }
      case State.ChannelStateTag.Done: {
        return I.succeedLazy(() => {
          this.currentChannel = read.done.onExit(input.getDone())
        })
      }
      case State.ChannelStateTag.Effect: {
        return I.matchCauseIO_(
          state.effect,
          (cause) =>
            I.succeedLazy(() => {
              this.currentChannel = read.done.onHalt(cause)
            }),
          () => this.runReadGo(input.run(), read, input)
        )
      }
    }
  }

  private runRead(
    read: C.Read<Env, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
  ): ChannelState<Env, unknown> | undefined {
    if (this.input) {
      const input = this.input
      const state = input.run()

      State.concrete(state)

      switch (state._tag) {
        case State.ChannelStateTag.Emit: {
          this.currentChannel = read.more(input.getEmit())
          return
        }
        case State.ChannelStateTag.Done: {
          this.currentChannel = read.done.onExit(input.getDone())
          return
        }
        case State.ChannelStateTag.Effect: {
          return new State.Effect(
            I.matchCauseIO_(
              state.effect,
              (cause) =>
                I.succeedLazy(() => {
                  this.currentChannel = read.done.onHalt(cause)
                }),
              () => this.runReadGo(input.run(), read, input)
            )
          )
        }
      }
    } else {
      this.currentChannel = read.more(void 0)
    }
  }

  private runBracketOut(
    bracketOut: C.BracketOut<Env, unknown, unknown, unknown>
  ): ChannelState<Env, unknown> | undefined {
    return new State.Effect(
      I.uninterruptibleMask(({ restore }) =>
        I.matchCauseIO_(
          restore(bracketOut.acquire),
          (cause) =>
            I.succeedLazy(() => {
              this.currentChannel = new C.Halt(() => cause)
            }),
          (out) =>
            I.succeedLazy(() => {
              this.addFinalizer(new C.ContinuationFinalizer((e) => bracketOut.finalizer(out, e)))
              this.currentChannel = new C.Emit(() => out)
            })
        )
      )
    )
  }

  run(): ChannelState<Env, OutErr> {
    let result: ChannelState<Env, unknown> | undefined = undefined

    while (!result) {
      if (this.cancelled) {
        result = this.processCancellation()
      } else if (this.subexecutorStack) {
        result = this.drainSubexecutor()
      } else {
        if (!this.currentChannel) {
          return State._Done
        } else {
          C.concrete(this.currentChannel)
          const currentChannel = this.currentChannel

          switch (currentChannel._tag) {
            case C.ChannelTag.Bridge: {
              if (this.input) {
                const inputExecutor               = this.input
                this.input                        = undefined
                const drainer: URIO<Env, unknown> = I.defer(() => {
                  const state = inputExecutor.run()

                  State.concrete(state)

                  switch (state._tag) {
                    case State.ChannelStateTag.Emit: {
                      return pipe(
                        currentChannel.input.emit(inputExecutor.getEmit()),
                        I.chain(() => drainer)
                      )
                    }
                    case State.ChannelStateTag.Effect: {
                      return pipe(
                        state.effect,
                        I.matchCauseIO(
                          (cause) => currentChannel.input.error(cause),
                          () => drainer
                        )
                      )
                    }
                    case State.ChannelStateTag.Done: {
                      const done = inputExecutor.getDone()
                      return Ex.match_(done, currentChannel.input.error, currentChannel.input.done)
                    }
                  }
                })
                result = new State.Effect(
                  pipe(
                    I.fork(drainer),
                    I.chain((fiber) =>
                      I.succeedLazy(() => {
                        this.addFinalizer(
                          new C.ContinuationFinalizer((exit) =>
                            pipe(
                              F.interrupt(fiber),
                              I.chain(() => I.defer(() => this.restorePipe(exit, inputExecutor) || I.unit()))
                            )
                          )
                        )
                      })
                    )
                  )
                )
              }
              break
            }
            case C.ChannelTag.PipeTo: {
              const previousInput = this.input
              const leftExec      = new ChannelExecutor(currentChannel.left, this.providedEnv)
              leftExec.input      = previousInput
              this.input          = leftExec
              this.addFinalizer(
                new C.ContinuationFinalizer((exit) => this.restorePipe(exit, previousInput) || I.unit())
              )
              this.currentChannel = currentChannel.right()
              break
            }
            case C.ChannelTag.Read: {
              result = this.runRead(currentChannel)
              break
            }
            case C.ChannelTag.Done: {
              result = this.doneSucceed(currentChannel.terminal())
              break
            }
            case C.ChannelTag.Halt: {
              result = this.doneHalt(currentChannel.error())
              break
            }
            case C.ChannelTag.Effect: {
              const pio = this.providedEnv ? I.give_(currentChannel.io, this.providedEnv as Env) : currentChannel.io
              result    = new State.Effect(
                I.matchCauseIO_(
                  pio,
                  (cause) => {
                    const res = this.doneHalt(cause)
                    State.concrete(res!)
                    if (res?._tag === State.ChannelStateTag.Effect) {
                      return res.effect
                    } else {
                      return I.unit()
                    }
                  },
                  (z) => {
                    const res = this.doneSucceed(z)
                    State.concrete(res!)
                    if (res?._tag === State.ChannelStateTag.Effect) {
                      return res.effect
                    } else {
                      return I.unit()
                    }
                  }
                )
              )
              break
            }
            case C.ChannelTag.EffectTotal: {
              result = this.doneSucceed(currentChannel.effect())
              break
            }
            case C.ChannelTag.EffectSuspendTotal: {
              this.currentChannel = currentChannel.effect()
              break
            }
            case C.ChannelTag.Emit: {
              this.emitted        = currentChannel.out()
              this.currentChannel = endUnit
              result              = State._Emit
              break
            }
            case C.ChannelTag.Ensuring: {
              this.addFinalizer(new C.ContinuationFinalizer((exit) => currentChannel.finalizer(exit)))
              this.currentChannel = currentChannel.channel
              break
            }
            case C.ChannelTag.ConcatAll: {
              const exec            = new ChannelExecutor(() => currentChannel.value, this.providedEnv)
              exec.input            = this.input
              this.subexecutorStack = new Inner(
                exec,
                currentChannel.k,
                undefined,
                currentChannel.combineInners,
                currentChannel.combineAll
              )
              this.currentChannel   = undefined
              break
            }
            case C.ChannelTag.Fold: {
              this.doneStack      = L.prepend_(this.doneStack, currentChannel.k)
              this.currentChannel = currentChannel.value
              break
            }
            case C.ChannelTag.BracketOut: {
              result = this.runBracketOut(currentChannel)
              break
            }
            case C.ChannelTag.Give: {
              const previousEnv   = this.providedEnv
              this.providedEnv    = currentChannel.environment
              this.currentChannel = currentChannel.inner
              this.addFinalizer(
                new C.ContinuationFinalizer((_) =>
                  I.succeedLazy(() => {
                    this.providedEnv = previousEnv
                  })
                )
              )
              break
            }
          }
        }
      }
    }
    return result as ChannelState<Env, OutErr>
  }
}
