import type { IO, URIO } from '../../IO'
import type { Cause } from '../../IO/Cause'
import type * as Ca from '../../IO/Cause'
import type { Exit } from '../../IO/Exit'
import type { List, MutableList } from '../../List'
import type { ChannelState } from './ChannelState'

import * as F from '../../Fiber'
import { absurd, pipe } from '../../function'
import * as I from '../../IO'
import * as Ex from '../../IO/Exit'
import * as L from '../../List'
import * as M from '../../Maybe'
import * as C from '../core'
import * as State from './ChannelState'

type ErasedChannel<R> = C.Channel<R, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedExecutor<R> = ChannelExecutor<R, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedContinuation<R> = C.Continuation<R, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedFinalizer<R> = C.ContinuationFinalizer<R, unknown, unknown>

type Finalizer<R> = (exit: Exit<any, any>) => I.URIO<R, any>

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
  close(ex: Exit<unknown, unknown>): URIO<R, Exit<unknown, unknown>> | null {
    const fin = this.exec.close(ex)
    if (fin) return I.result(fin)
    else return null
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
  private input: ErasedExecutor<Env> | null = null
  private inProgressFinalizer: URIO<Env, Exit<unknown, unknown>> | null = null
  private subexecutorStack: SubexecutorStack<Env> | null = null
  private doneStack: List<ErasedContinuation<Env>> = L.empty()
  private done: Exit<unknown, unknown> | null = null
  private cancelled: Exit<OutErr, OutDone> | null = null
  private emitted: unknown | null
  private currentChannel: ErasedChannel<Env> | null
  private closeLastSubstream: I.URIO<Env, unknown> | null = null

  constructor(
    initialChannel: () => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    private providedEnv: unknown,
    private executeCloseLastSubstream: (_: I.URIO<Env, unknown>) => I.URIO<Env, unknown>
  ) {
    this.currentChannel = initialChannel() as ErasedChannel<Env>
    this.close          = this.close.bind(this)
  }

  private restorePipe(exit: Exit<unknown, unknown>, prev: ErasedExecutor<Env>): IO<Env, never, unknown> | null {
    const currInput = this.input
    this.input      = prev
    return currInput!.close(exit)
  }

  private popAllFinalizers(exit: Exit<unknown, unknown>): URIO<Env, Exit<unknown, unknown>> {
    const unwind = (acc: Exit<unknown, unknown>, conts: L.List<ErasedContinuation<Env>>): IO<Env, unknown, unknown> => {
      if (L.isEmpty(conts)) {
        return I.fromExit(acc)
      } else {
        const head = L.unsafeHead(conts)!
        C.concreteContinuation(head)
        if (head._tag === C.ChannelTag.ContinuationK) {
          return unwind(acc, L.tail(conts))
        } else {
          return pipe(
            head.finalizer(exit),
            I.result,
            I.chain((finExit) => unwind(Ex.crossSecond_(acc, finExit), L.tail(conts)))
          )
        }
      }
    }
    const effect   = I.result(unwind(Ex.unit(), this.doneStack))
    this.doneStack = L.empty()
    this.storeInProgressFinalizer(effect)
    return effect
  }

  private popNextFinalizers(): L.List<C.ContinuationFinalizer<Env, unknown, unknown>> {
    const builder = L.emptyPushable<C.ContinuationFinalizer<Env, unknown, unknown>>()
    const go      = (stack: L.List<ErasedContinuation<Env>>): L.List<ErasedContinuation<Env>> => {
      if (L.isEmpty(stack)) {
        return L.empty()
      } else {
        const head = L.unsafeHead(stack)!
        C.concreteContinuation(head)
        if (head._tag === C.ChannelTag.ContinuationK) {
          return stack
        } else {
          L.push(head, builder)
          return go(L.tail(stack))
        }
      }
    }
    this.doneStack = go(this.doneStack)
    return builder
  }

  private storeInProgressFinalizer(effect: URIO<Env, Exit<unknown, unknown>>): void {
    this.inProgressFinalizer = effect
  }

  private clearInProgressFinalizer(): void {
    this.inProgressFinalizer = null
  }

  private ifNotNull<R, E>(io: URIO<R, Exit<E, unknown>> | null): URIO<R, Exit<E, unknown>> {
    return io !== null ? io : I.succeed(Ex.unit())
  }

  close(exit: Exit<unknown, unknown>): IO<Env, never, unknown> | null {
    const runInProgressFinalizers =
      this.inProgressFinalizer !== null
        ? I.ensuring_(
            this.inProgressFinalizer,
            I.succeedLazy(() => this.clearInProgressFinalizer())
          )
        : null

    let closeSubexecutors: URIO<Env, Exit<unknown, unknown>> | null = null

    if (this.subexecutorStack !== null) {
      if (this.subexecutorStack._tag === SubexecutorStackTag.Inner) {
        closeSubexecutors = this.subexecutorStack.close(exit)
      } else {
        const fin1 = this.subexecutorStack.fromK.close(exit)
        const fin2 = this.subexecutorStack.rest.close(exit)

        if (fin1 === null && fin2 === null) {
          closeSubexecutors = null
        } else if (fin1 !== null && fin2 !== null) {
          closeSubexecutors = pipe(I.result(fin1), I.crossWith(I.result(fin2), Ex.crossSecond_))
        } else if (fin1 !== null) {
          closeSubexecutors = I.result(fin1)
        } else {
          closeSubexecutors = I.result(fin2!)
        }
      }
    }

    let closeSelf: URIO<Env, Exit<unknown, unknown>> | null = null

    const selfFinalizers = this.popAllFinalizers(exit)

    if (selfFinalizers !== null) {
      closeSelf = I.ensuring_(
        selfFinalizers,
        I.succeedLazy(() => this.clearInProgressFinalizer())
      )
    }

    if (closeSubexecutors === null && runInProgressFinalizers === null && closeSelf === null) {
      return null
    } else {
      return pipe(
        I.sequenceT(
          this.ifNotNull(closeSubexecutors),
          this.ifNotNull(runInProgressFinalizers),
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
    this.currentChannel = null
    this.done           = this.cancelled
    this.cancelled      = null
    return State._Done
  }

  private finishSubexecutorWithCloseEffect(
    subexecDone: Exit<unknown, unknown>,
    ...closeFns: ReadonlyArray<(exit: Ex.Exit<unknown, unknown>) => I.URIO<Env, unknown> | null>
  ): ChannelState<Env, unknown> | null {
    this.addFinalizer(() =>
      pipe(
        closeFns,
        I.foreachUnit((closeFn) =>
          pipe(
            I.succeedLazy(() => closeFn(subexecDone)),
            I.chain((closeEffect) => {
              if (closeEffect !== null) {
                return closeEffect
              } else {
                return I.unit()
              }
            })
          )
        )
      )
    )
    const state = pipe(
      subexecDone,
      Ex.match(
        (e) => this.doneHalt(e),
        (a) => this.doneSucceed(a)
      )
    )
    this.subexecutorStack = null
    return state
  }

  private finishWithExit(exit: Exit<unknown, unknown>): IO<Env, unknown, unknown> {
    const state: ChannelState<Env, unknown> | null = Ex.match_(
      exit,
      (cause) => this.doneHalt(cause),
      (out) => this.doneSucceed(out)
    )

    this.subexecutorStack = null

    if (state === null) {
      return I.unit()
    } else {
      return state.effect
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
          M.getOrElse(() => Ex.unit())
        )
      )
    )
  }

  private drainFromKAndSubexecutor(exec: ErasedExecutor<Env>, rest: Inner<Env>): ChannelState<Env, unknown> | null {
    const handleSubexecFailure = (cause: Ca.Cause<any>): ChannelState<Env, any> | null => {
      return this.finishSubexecutorWithCloseEffect(
        Ex.failCause(cause),
        (exit) => rest.exec.close(exit),
        (exit) => exec.close(exit)
      )
    }
    const state = exec.run()
    State.concrete(state)
    switch (state._tag) {
      case State.ChannelStateTag.Emit: {
        this.emitted = exec.getEmit()
        return State._Emit
      }
      case State.ChannelStateTag.Effect: {
        return new State.Effect(
          pipe(
            state.effect,
            I.catchAllCause((cause) => {
              const state = handleSubexecFailure(cause)
              if (state === null) {
                return I.unit()
              } else {
                return state.effect
              }
            })
          )
        )
      }
      case State.ChannelStateTag.Done: {
        const e = exec.getDone()
        return Ex.match_(
          e,
          (cause) => handleSubexecFailure(cause),
          (doneValue) => {
            const modifiedRest = new Inner(
              rest.exec,
              rest.subK,
              rest.lastDone !== null ? rest.combineSubK(rest.lastDone, doneValue) : doneValue,
              rest.combineSubK,
              rest.combineSubKAndInner
            )

            this.closeLastSubstream = exec.close(e)
            this.replaceSubexecutor(modifiedRest)
            return null
          }
        )
      }
    }
  }

  private drainInnerSubExecutor(inner: Inner<Env>): ChannelState<Env, unknown> | null {
    const state = inner.exec.run()
    State.concrete(state)

    switch (state._tag) {
      case State.ChannelStateTag.Emit: {
        if (this.closeLastSubstream !== null) {
          const closeLast         = this.closeLastSubstream
          this.closeLastSubstream = null
          return new State.Effect(
            pipe(
              this.executeCloseLastSubstream(closeLast),
              I.map(() => {
                const fromK: ErasedExecutor<Env> = new ChannelExecutor(
                  () => inner.subK(inner.exec.getEmit()),
                  this.providedEnv,
                  (_) => this.executeCloseLastSubstream(_)
                )
                fromK.input           = this.input
                this.subexecutorStack = new FromKAnd(fromK, inner)
              })
            )
          )
        } else {
          const fromK: ErasedExecutor<Env> = new ChannelExecutor(
            () => inner.subK(inner.exec.getEmit()),
            this.providedEnv,
            (_) => this.executeCloseLastSubstream(_)
          )
          fromK.input           = this.input
          this.subexecutorStack = new FromKAnd(fromK, inner)
          return null
        }
      }
      case State.ChannelStateTag.Done: {
        const lastClose = this.closeLastSubstream
        const e         = inner.exec.getDone()
        return Ex.match_(
          e,
          () =>
            this.finishSubexecutorWithCloseEffect(
              e,
              () => lastClose,
              (exit) => inner.exec.close(exit)
            ),
          (innerDoneValue) => {
            const doneValue = Ex.succeed(inner.combineSubKAndInner(inner.lastDone, innerDoneValue))
            return this.finishSubexecutorWithCloseEffect(
              doneValue,
              () => lastClose,
              (exit) => inner.exec.close(exit)
            )
          }
        )
      }
      case State.ChannelStateTag.Effect: {
        const closeLast         = this.closeLastSubstream === null ? I.unit() : this.closeLastSubstream
        this.closeLastSubstream = null
        return new State.Effect(
          pipe(
            this.executeCloseLastSubstream(closeLast),
            I.crossSecond(
              pipe(
                state.effect,
                I.catchAllCause((cause) => {
                  const state = this.finishSubexecutorWithCloseEffect(Ex.failCause(cause), inner.exec.close)
                  if (state === null) {
                    return I.unit()
                  } else {
                    return state.effect
                  }
                })
              )
            )
          )
        )
      }
    }
  }

  private drainSubexecutor(): ChannelState<Env, unknown> | null {
    const subexecutorStack = this.subexecutorStack!

    if (subexecutorStack._tag === SubexecutorStackTag.Inner) {
      return this.drainInnerSubExecutor(subexecutorStack)
    } else {
      return this.drainFromKAndSubexecutor(subexecutorStack.fromK, subexecutorStack.rest)
    }
  }

  private replaceSubexecutor(nextSubExec: Inner<Env>): void {
    this.currentChannel   = null
    this.subexecutorStack = nextSubExec
  }

  private doneSucceed(z: unknown): ChannelState<Env, unknown> | null {
    if (L.isEmpty(this.doneStack)) {
      this.done           = Ex.succeed(z)
      this.currentChannel = null
      return State._Done
    }
    const head = L.unsafeHead(this.doneStack)!
    C.concreteContinuation(head)

    if (head._tag === C.ChannelTag.ContinuationK) {
      this.doneStack      = L.tail(this.doneStack)
      this.currentChannel = head.onSuccess(z)
      return null
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack      = finalizers
        this.done           = Ex.succeed(z)
        this.currentChannel = null
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

  private doneHalt(cause: Cause<unknown>): ChannelState<Env, unknown> | null {
    if (L.isEmpty(this.doneStack)) {
      this.done           = Ex.failCause(cause)
      this.currentChannel = null
      return State._Done
    }
    const head = L.unsafeHead(this.doneStack)!
    C.concreteContinuation(head)

    if (head._tag === C.ChannelTag.ContinuationK) {
      this.doneStack      = L.tail(this.doneStack)
      this.currentChannel = head.onHalt(cause)
      return null
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack      = finalizers
        this.done           = Ex.failCause(cause)
        this.currentChannel = null
        return State._Done
      } else {
        const finalizerEffect = this.runFinalizers(
          L.map_(finalizers, (_) => _.finalizer),
          Ex.failCause(cause)
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

  private addFinalizer(f: Finalizer<Env>) {
    this.doneStack = L.prepend_(this.doneStack, new C.ContinuationFinalizer(f))
  }

  private runRead(
    read: C.Read<Env, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
  ): ChannelState<Env, unknown> | null {
    if (this.input === null) {
      this.currentChannel = read.more(undefined)
      return null
    } else {
      const go = (state: ChannelState<Env, any>): I.URIO<Env, void> => {
        State.concrete(state)
        switch (state._tag) {
          case State.ChannelStateTag.Emit: {
            return I.succeedLazy(() => {
              this.currentChannel = read.more(this.input!.getEmit())
            })
          }
          case State.ChannelStateTag.Done: {
            return I.succeedLazy(() => {
              this.currentChannel = read.done.onExit(this.input!.getDone())
            })
          }
          case State.ChannelStateTag.Effect: {
            return I.matchCauseIO_(
              state.effect,
              (cause) =>
                I.succeedLazy(() => {
                  this.currentChannel = read.done.onHalt(cause)
                }),
              () => go(this.input!.run())
            )
          }
        }
      }
      const state = this.input.run()
      State.concrete(state)
      switch (state._tag) {
        case State.ChannelStateTag.Emit: {
          this.currentChannel = read.more(this.input.getEmit())
          return null
        }
        case State.ChannelStateTag.Done: {
          this.currentChannel = read.done.onExit(this.input.getDone())
          return null
        }
        case State.ChannelStateTag.Effect: {
          return new State.Effect(
            pipe(
              state.effect,
              I.matchCauseIO(
                (cause) =>
                  I.succeedLazy(() => {
                    this.currentChannel = read.done.onHalt(cause)
                  }),
                () => go(this.input!.run())
              )
            )
          )
        }
      }
    }
  }

  private runBracketOut(bracketOut: C.BracketOut<Env, unknown, unknown, unknown>): ChannelState<Env, unknown> | null {
    return new State.Effect(
      I.uninterruptibleMask(({ restore }) =>
        I.matchCauseIO_(
          restore(bracketOut.acquire),
          (cause) =>
            I.succeedLazy(() => {
              this.currentChannel = C.failCause(cause)
            }),
          (out) =>
            I.succeedLazy(() => {
              this.addFinalizer((e) => bracketOut.finalizer(out, e))
              this.currentChannel = new C.Emit(() => out)
            })
        )
      )
    )
  }

  private runEnsuring(ensuring: C.Ensuring<Env, any, any, any, any, any, any>) {
    this.addFinalizer(ensuring.finalizer)
    this.currentChannel = ensuring.channel
  }

  run(): ChannelState<Env, OutErr> {
    let result: ChannelState<Env, unknown> | null = null

    while (result === null) {
      if (this.cancelled !== null) {
        result = this.processCancellation()
      } else if (this.subexecutorStack !== null) {
        result = this.drainSubexecutor()
      } else {
        if (this.currentChannel === null) {
          return State._Done
        } else {
          C.concrete(this.currentChannel)
          const currentChannel = this.currentChannel

          switch (currentChannel._tag) {
            case C.ChannelTag.Bridge: {
              if (this.input !== null) {
                const inputExecutor = this.input
                this.input          = null
                const drainer: URIO<Env, unknown> = pipe(
                  currentChannel.input.awaitRead,
                  I.crossSecond(
                    I.defer(() => {
                      const state = inputExecutor.run()

                      State.concrete(state)

                      switch (state._tag) {
                        case State.ChannelStateTag.Done: {
                          const done = inputExecutor.getDone()
                          return Ex.match_(
                            done,
                            (cause) => currentChannel.input.error(cause),
                            (value) => currentChannel.input.done(value)
                          )
                        }
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
                      }
                    })
                  )
                )
                result = new State.Effect(
                  pipe(
                    I.fork(drainer),
                    I.chain((fiber) =>
                      I.succeedLazy(() => {
                        this.addFinalizer((exit) =>
                          pipe(
                            F.interrupt(fiber),
                            I.chain(() =>
                              I.defer(() => {
                                const effect = this.restorePipe(exit, inputExecutor)
                                if (effect !== null) {
                                  return effect
                                } else {
                                  return I.unit()
                                }
                              })
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
              const leftExec      = new ChannelExecutor(
                currentChannel.left,
                this.providedEnv,
                this.executeCloseLastSubstream
              )
              leftExec.input = previousInput
              this.input     = leftExec
              this.addFinalizer((exit) => {
                const effect = this.restorePipe(exit, previousInput!)
                if (effect !== null) {
                  return effect
                } else {
                  return I.unit()
                }
              })
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
              result = this.doneHalt(currentChannel.cause())
              break
            }
            case C.ChannelTag.Effect: {
              const pio =
                this.providedEnv === null ? currentChannel.io : I.giveSome_(currentChannel.io, this.providedEnv as Env)
              result = new State.Effect(
                I.matchCauseIO_(
                  pio,
                  (cause) => {
                    const state = this.doneHalt(cause)
                    State.concrete(state!)
                    if (state !== null && state._tag === State.ChannelStateTag.Effect) {
                      return state.effect
                    } else {
                      return I.unit()
                    }
                  },
                  (z) => {
                    const state = this.doneSucceed(z)
                    State.concrete(state!)
                    if (state !== null && state._tag === State.ChannelStateTag.Effect) {
                      return state.effect
                    } else {
                      return I.unit()
                    }
                  }
                )
              )
              break
            }
            case C.ChannelTag.Defer: {
              this.currentChannel = currentChannel.effect()
              break
            }
            case C.ChannelTag.Emit: {
              this.emitted        = currentChannel.out()
              this.currentChannel = C.end(undefined)
              result              = State._Emit
              break
            }
            case C.ChannelTag.Ensuring: {
              this.runEnsuring(currentChannel)
              break
            }
            case C.ChannelTag.ConcatAll: {
              const innerExecuteLastClose = (f: I.URIO<Env, any>) =>
                I.succeedLazy(() => {
                  const prevLastClose     = this.closeLastSubstream === null ? I.unit() : this.closeLastSubstream
                  this.closeLastSubstream = I.chain_(prevLastClose, () => f)
                })
              const exec            = new ChannelExecutor(() => currentChannel.value, this.providedEnv, innerExecuteLastClose)
              exec.input            = this.input
              this.subexecutorStack = new Inner(
                exec,
                currentChannel.k,
                null,
                currentChannel.combineInners,
                currentChannel.combineAll
              )
              this.closeLastSubstream = null
              this.currentChannel     = null
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
              this.addFinalizer(() =>
                I.succeedLazy(() => {
                  this.providedEnv = previousEnv
                })
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
