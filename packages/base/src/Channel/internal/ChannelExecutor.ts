import type { Stack } from '../../internal/Stack'
import type { IO, URIO } from '../../IO'
import type { Cause } from '../../IO/Cause'
import type * as Ca from '../../IO/Cause'
import type { Exit } from '../../IO/Exit'
import type { List } from '../../List'
import type { ChannelState } from './ChannelState'
import type * as UPS from './UpstreamPullStrategy'

import * as F from '../../Fiber'
import { constVoid, identity, pipe } from '../../function'
import { ImmutableQueue } from '../../internal/ImmutableQueue'
import { makeStack } from '../../internal/Stack'
import * as I from '../../IO'
import * as Ex from '../../IO/Exit'
import * as L from '../../List'
import * as M from '../../Maybe'
import * as C from '../core'
import * as State from './ChannelState'
import * as CED from './ChildExecutorDecision'
import * as UPR from './UpstreamPullRequest'

type ErasedChannel<R> = C.Channel<R, unknown, unknown, unknown, unknown, unknown, unknown>
export type ErasedExecutor<R> = ChannelExecutor<R, unknown, unknown, unknown, unknown, unknown, unknown>
type ErasedContinuation<R> = C.Continuation<R, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>

type Finalizer<R> = (exit: Exit<any, any>) => I.URIO<R, any>

/*
 * -------------------------------------------------------------------------------------------------
 * SubexecutorStack
 * -------------------------------------------------------------------------------------------------
 */

type Subexecutor<R> = PullFromUpstream<R> | PullFromChild<R> | DrainChildExecutors<R> | Emit<R>

const SubexecutorStackTag = {
  PullFromUpstream: 'PullFromUpstream',
  PullFromChild: 'PullFromChild',
  DrainChildExecutors: 'DrainChildExecutors',
  Emit: 'Emit'
} as const

class PullFromUpstream<R> {
  readonly _tag = SubexecutorStackTag.PullFromUpstream
  constructor(
    readonly upstreamExecutor: ErasedExecutor<R>,
    readonly createChild: (_: any) => ErasedChannel<R>,
    readonly lastDone: any,
    readonly activeChildExecutors: ImmutableQueue<PullFromChild<R> | null>,
    readonly combineChildResults: (x: any, y: any) => any,
    readonly combineWithChildResult: (x: any, y: any) => any,
    readonly onPull: (_: UPR.UpstreamPullRequest<any>) => UPS.UpstreamPullStrategy<any>,
    readonly onEmit: (_: any) => CED.ChildExecutorDecision
  ) {}
  close(ex: Ex.Exit<any, any>): I.URIO<R, Ex.Exit<any, any>> | null {
    const fin1 = this.upstreamExecutor.close(ex)
    const fins = this.activeChildExecutors
      .map((child) => (child !== null ? child.childExecutor.close(ex) : null))
      .enqueue(fin1)
    return fins.foldl(null as I.URIO<R, Exit<any, any>> | null, (acc, next): I.URIO<R, Exit<any, any>> | null => {
      if (acc === null) {
        if (next === null) {
          return null
        } else {
          return I.result(next)
        }
      } else {
        if (next === null) {
          return acc
        } else {
          return I.crossWith_(acc, I.result(next), Ex.apSecond_)
        }
      }
    })
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
    return new PullFromUpstream(
      this.upstreamExecutor,
      this.createChild,
      this.lastDone,
      this.activeChildExecutors.enqueue(child),
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull,
      this.onEmit
    )
  }
}

class PullFromChild<R> {
  readonly _tag = SubexecutorStackTag.PullFromChild
  constructor(
    readonly childExecutor: ErasedExecutor<R>,
    readonly parentSubexecutor: Subexecutor<R>,
    readonly onEmit: (_: any) => CED.ChildExecutorDecision
  ) {}

  close(ex: Ex.Exit<any, any>): I.URIO<R, Ex.Exit<any, any>> | null {
    const fin1 = this.childExecutor.close(ex)
    const fin2 = this.parentSubexecutor.close(ex)
    if (fin1 === null) {
      if (fin2 === null) {
        return null
      } else {
        return fin2
      }
    } else {
      if (fin2 === null) {
        return I.result(fin1)
      } else {
        return I.crossWith_(I.result(fin1), fin2, Ex.apSecond_)
      }
    }
  }

  enqueuePullFromChild(_child: PullFromChild<R>): Subexecutor<R> {
    return this
  }
}

class DrainChildExecutors<R> {
  readonly _tag = SubexecutorStackTag.DrainChildExecutors
  constructor(
    readonly upstreamExecutor: ErasedExecutor<R>,
    readonly lastDone: any,
    readonly activeChildExecutors: ImmutableQueue<PullFromChild<R> | null>,
    readonly upstreamDone: Ex.Exit<any, any>,
    readonly combineChildResults: (x: any, y: any) => any,
    readonly combineWithChildResult: (x: any, y: any) => any,
    readonly onPull: (_: UPR.UpstreamPullRequest<any>) => UPS.UpstreamPullStrategy<any>
  ) {}

  close(ex: Ex.Exit<any, any>): I.URIO<R, Ex.Exit<any, any>> | null {
    const fin1 = this.upstreamExecutor.close(ex)
    const fins = this.activeChildExecutors
      .map((child) => (child !== null ? child.childExecutor.close(ex) : null))
      .enqueue(fin1)
    return fins.foldl(null as I.URIO<R, Exit<any, any>> | null, (acc, next): I.URIO<R, Exit<any, any>> | null => {
      if (acc === null) {
        if (next === null) {
          return null
        } else {
          return I.result(next)
        }
      } else {
        if (next === null) {
          return acc
        } else {
          return I.crossWith_(acc, I.result(next), Ex.apSecond_)
        }
      }
    })
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
    return new DrainChildExecutors(
      this.upstreamExecutor,
      this.lastDone,
      this.activeChildExecutors.enqueue(child),
      this.upstreamDone,
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull
    )
  }
}

class Emit<R> {
  readonly _tag = SubexecutorStackTag.Emit
  constructor(readonly value: any, readonly next: Subexecutor<R> | null) {}
  close(ex: Ex.Exit<any, any>): I.URIO<R, Exit<any, any>> | null {
    return this.next !== null ? this.next.close(ex) : null
  }

  enqueuePullFromChild(_child: PullFromChild<R>): Subexecutor<R> {
    return this
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * ChannelExecutor
 * -------------------------------------------------------------------------------------------------
 */
export function readUpstream<R, E, A>(r: State.Read<R, E>, cont: () => IO<R, E, A>): IO<R, E, A> {
  let readStack: Stack<State.Read<any, any>> | undefined = makeStack(r)
  const read = (): I.IO<R, E, A> => {
    const current = readStack!.value
    readStack     = readStack!.previous
    if (current.upstream === null) {
      return I.defer(cont)
    }
    const state = current.upstream.run()
    switch (state._tag) {
      case State.ChannelStateTag.Emit: {
        const emitEffect = current.onEmit(current.upstream.getEmit())
        if (readStack === undefined) {
          if (emitEffect === null) {
            return I.defer(cont)
          } else {
            return pipe(
              emitEffect,
              I.chain(() => cont())
            )
          }
        } else {
          if (emitEffect === null) {
            return I.defer(read)
          } else {
            return pipe(
              emitEffect,
              I.chain(() => read())
            )
          }
        }
      }
      case State.ChannelStateTag.Done: {
        const doneEffect = current.onDone(current.upstream.getDone())
        if (readStack === undefined) {
          if (doneEffect === null) {
            return I.defer(cont)
          } else {
            return pipe(
              doneEffect,
              I.chain(() => cont())
            )
          }
        } else {
          if (doneEffect === null) {
            return I.defer(read)
          } else {
            return pipe(
              doneEffect,
              I.chain(() => read())
            )
          }
        }
      }
      case State.ChannelStateTag.Effect: {
        readStack = makeStack(current, readStack)
        return pipe(
          current.onEffect(state.io as I.IO<unknown, never, void>),
          I.catchAllCause((cause) =>
            I.defer(() => {
              const doneEffect = current.onDone(Ex.failCause(cause))
              return doneEffect === null ? I.unit() : doneEffect
            })
          ),
          I.chain(() => read())
        )
      }
      case State.ChannelStateTag.Read: {
        readStack = makeStack(current, readStack)
        readStack = makeStack(state, readStack)
        return I.defer(read)
      }
    }
  }
  return read()
}

export class ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  private input: ErasedExecutor<Env> | null = null
  private inProgressFinalizer: URIO<Env, Exit<unknown, unknown>> | null = null
  private activeSubexecutor: Subexecutor<Env> | null = null
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

  run(): ChannelState<Env, OutErr> {
    let result: ChannelState<Env, unknown> | null = null

    while (result === null) {
      if (this.cancelled !== null) {
        result = this.processCancellation()
      } else if (this.activeSubexecutor !== null) {
        result = this.runSubexecutor()
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
                  I.chain(() => {
                    const state = inputExecutor.run()

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
                      case State.ChannelStateTag.Read: {
                        return pipe(
                          readUpstream(state, () => drainer),
                          I.catchAllCause((cause) => currentChannel.input.error(cause))
                        )
                      }
                    }
                  })
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
                const effect = this.restorePipe(exit, previousInput)
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
              result = new State.Read(
                this.input,
                identity,
                (out) => {
                  this.currentChannel = currentChannel.more(out)
                  return null
                },
                (exit) => {
                  this.currentChannel = currentChannel.done.onExit(exit)
                  return null
                }
              )
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
            case C.ChannelTag.FromIO: {
              const pio =
                this.providedEnv === null ? currentChannel.io : I.giveSome_(currentChannel.io, this.providedEnv as Env)
              result = new State.Effect(
                I.matchCauseIO_(
                  pio,
                  (cause) => {
                    const state = this.doneHalt(cause)
                    if (state !== null && state._tag === State.ChannelStateTag.Effect) {
                      return state.effect
                    } else {
                      return I.unit()
                    }
                  },
                  (z) => {
                    const state = this.doneSucceed(z)
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
              this.currentChannel = this.activeSubexecutor !== null ? null : C.end(undefined)
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
              const exec             = new ChannelExecutor(() => currentChannel.value, this.providedEnv, innerExecuteLastClose)
              exec.input             = this.input
              this.activeSubexecutor = new PullFromUpstream(
                exec,
                currentChannel.k,
                null,
                ImmutableQueue.empty(),
                currentChannel.combineInners,
                currentChannel.combineAll,
                currentChannel.onPull,
                currentChannel.onEmit
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

  private restorePipe(exit: Exit<unknown, unknown>, prev: ErasedExecutor<Env> | null): IO<Env, never, unknown> | null {
    const currInput = this.input
    this.input      = prev
    return currInput !== null ? currInput.close(exit) : null
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
            I.chain((finExit) => unwind(Ex.apSecond_(acc, finExit), L.tail(conts)))
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

    let closeSubexecutors: URIO<Env, Exit<unknown, unknown>> | null =
      this.activeSubexecutor === null ? null : this.activeSubexecutor.close(exit)

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
        I.map(([a, b, c]) => pipe(a, Ex.apSecond(b), Ex.apSecond(c))),
        I.uninterruptible
      )
    }
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
    this.activeSubexecutor = null
    return state
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
          Ex.collectAll(results),
          M.getOrElse(() => Ex.unit())
        )
      )
    )
  }

  private runSubexecutor(): ChannelState<Env, unknown> | null {
    switch (this.activeSubexecutor!._tag) {
      case SubexecutorStackTag.PullFromUpstream: {
        return this.pullFromUpstream(this.activeSubexecutor as PullFromUpstream<Env>)
      }
      case SubexecutorStackTag.DrainChildExecutors: {
        return this.drainChildExecutors(this.activeSubexecutor as DrainChildExecutors<Env>)
      }
      case SubexecutorStackTag.PullFromChild: {
        return this.pullFromChild(
          (this.activeSubexecutor as PullFromChild<Env>).childExecutor,
          (this.activeSubexecutor as PullFromChild<Env>).parentSubexecutor,
          (this.activeSubexecutor as PullFromChild<Env>).onEmit,
          this.activeSubexecutor as PullFromChild<Env>
        )
      }
      case SubexecutorStackTag.Emit: {
        this.emitted           = (this.activeSubexecutor as Emit<Env>).value
        this.activeSubexecutor = (this.activeSubexecutor as Emit<Env>).next
        return new State.Emit()
      }
    }
  }

  private replaceSubexecutor(nextSubExec: Subexecutor<Env>): void {
    this.currentChannel    = null
    this.activeSubexecutor = nextSubExec
  }

  private applyUpstreamPullStrategy(
    upstreamFinished: boolean,
    queue: ImmutableQueue<PullFromChild<Env> | null>,
    strategy: UPS.UpstreamPullStrategy<any>
  ): readonly [M.Maybe<any>, ImmutableQueue<PullFromChild<Env> | null>] {
    switch (strategy._tag) {
      case 'PullAfterNext': {
        return [
          strategy.emitSeparator,
          !upstreamFinished || queue.exists((_) => _ !== null) ? queue.prepend(null) : queue
        ]
      }
      case 'PullAfterAllEnqueued': {
        return [
          strategy.emitSeparator,
          !upstreamFinished || queue.exists((_) => _ !== null) ? queue.enqueue(null) : queue
        ]
      }
    }
  }

  private pullFromUpstream(subexec: PullFromUpstream<Env>): ChannelState<Env, any> | null {
    return pipe(
      subexec.activeChildExecutors.dequeue(),
      M.match(
        () => this.performPullFromUpstream(subexec),
        ([activeChild, rest]) => {
          if (activeChild === null) {
            return this.performPullFromUpstream(
              new PullFromUpstream(
                subexec.upstreamExecutor,
                subexec.createChild,
                subexec.lastDone,
                rest,
                subexec.combineChildResults,
                subexec.combineWithChildResult,
                subexec.onPull,
                subexec.onEmit
              )
            )
          } else {
            this.replaceSubexecutor(
              new PullFromChild(
                activeChild.childExecutor,
                new PullFromUpstream(
                  subexec.upstreamExecutor,
                  subexec.createChild,
                  subexec.lastDone,
                  rest,
                  subexec.combineChildResults,
                  subexec.combineWithChildResult,
                  subexec.onPull,
                  subexec.onEmit
                ),
                activeChild.onEmit
              )
            )
            return null
          }
        }
      )
    )
  }

  private performPullFromUpstream(subexec: PullFromUpstream<Env>): ChannelState<Env, any> {
    return new State.Read(
      subexec.upstreamExecutor,
      (effect) => {
        const closeLast         = this.closeLastSubstream === null ? I.unit() : this.closeLastSubstream
        this.closeLastSubstream = null
        return I.apSecond_(this.executeCloseLastSubstream(closeLast), effect)
      },
      (emitted) => {
        if (this.closeLastSubstream !== null) {
          const closeLast         = this.closeLastSubstream
          this.closeLastSubstream = null
          return pipe(
            this.executeCloseLastSubstream(closeLast),
            I.map(() => {
              const childExecutor = new ChannelExecutor(
                () => subexec.createChild(emitted),
                this.providedEnv,
                (_) => this.executeCloseLastSubstream(_)
              )
              childExecutor.input = this.input
              const [emitSeparator, updatedChildExecutors] = this.applyUpstreamPullStrategy(
                false,
                subexec.activeChildExecutors,
                subexec.onPull(new UPR.Pulled(emitted))
              )
              this.activeSubexecutor = new PullFromChild(
                childExecutor,
                new PullFromUpstream(
                  subexec.upstreamExecutor,
                  subexec.createChild,
                  subexec.lastDone,
                  updatedChildExecutors,
                  subexec.combineChildResults,
                  subexec.combineWithChildResult,
                  subexec.onPull,
                  subexec.onEmit
                ),
                subexec.onEmit
              )
              if (M.isJust(emitSeparator)) {
                this.activeSubexecutor = new Emit(emitSeparator.value, this.activeSubexecutor)
              }
            })
          )
        } else {
          const childExecutor = new ChannelExecutor(
            () => subexec.createChild(emitted),
            this.providedEnv,
            (_) => this.executeCloseLastSubstream(_)
          )
          childExecutor.input = this.input

          const [emitSeparator, updatedChildExecutors] = this.applyUpstreamPullStrategy(
            false,
            subexec.activeChildExecutors,
            subexec.onPull(new UPR.Pulled(emitted))
          )

          this.activeSubexecutor = new PullFromChild(
            childExecutor,
            new PullFromUpstream(
              subexec.upstreamExecutor,
              subexec.createChild,
              subexec.lastDone,
              updatedChildExecutors,
              subexec.combineChildResults,
              subexec.combineWithChildResult,
              subexec.onPull,
              subexec.onEmit
            ),
            subexec.onEmit
          )

          if (M.isJust(emitSeparator)) {
            this.activeSubexecutor = new Emit(emitSeparator.value, this.activeSubexecutor)
          }
          return null
        }
      },
      (exit) => {
        if (subexec.activeChildExecutors.exists((_) => _ !== null)) {
          const drain = new DrainChildExecutors(
            subexec.upstreamExecutor,
            subexec.lastDone,
            subexec.activeChildExecutors.enqueue(null),
            subexec.upstreamExecutor.getDone(),
            subexec.combineChildResults,
            subexec.combineWithChildResult,
            subexec.onPull
          )

          if (this.closeLastSubstream !== null) {
            const closeLast         = this.closeLastSubstream
            this.closeLastSubstream = null
            return pipe(
              this.executeCloseLastSubstream(closeLast),
              I.map(() => {
                this.replaceSubexecutor(drain)
              })
            )
          } else {
            this.replaceSubexecutor(drain)
            return null
          }
        } else {
          const lastClose = this.closeLastSubstream
          return pipe(
            this.finishSubexecutorWithCloseEffect(
              pipe(
                exit,
                Ex.map((_) => subexec.combineWithChildResult(subexec.lastDone, _))
              ),
              () => lastClose,
              (exit) => subexec.upstreamExecutor.close(exit)
            ),
            State.effectOrNullIgnored
          )
        }
      }
    )
  }

  private drainChildExecutors(subexec: DrainChildExecutors<Env>): ChannelState<Env, any> | null {
    return pipe(
      subexec.activeChildExecutors.dequeue(),
      M.match(
        () => {
          const lastClose = this.closeLastSubstream
          if (lastClose !== null) {
            this.addFinalizer((_) => lastClose)
          }
          return this.finishSubexecutorWithCloseEffect(
            subexec.upstreamDone,
            () => lastClose,
            (_) => subexec.upstreamExecutor.close(_)
          )
        },
        ([activeChild, rest]) => {
          if (activeChild === null) {
            const [emitSeparator, remainingExecutors] = this.applyUpstreamPullStrategy(
              true,
              rest,
              subexec.onPull(new UPR.NoUpstream(rest.count((_) => _ !== null)))
            )
            this.replaceSubexecutor(
              new DrainChildExecutors(
                subexec.upstreamExecutor,
                subexec.lastDone,
                remainingExecutors,
                subexec.upstreamExecutor.getDone(),
                subexec.combineChildResults,
                subexec.combineWithChildResult,
                subexec.onPull
              )
            )
            return pipe(
              emitSeparator,
              M.match(
                () => null,
                (value) => {
                  this.emitted = value
                  return new State.Emit()
                }
              )
            )
          } else {
            this.replaceSubexecutor(
              new PullFromChild(
                activeChild.childExecutor,
                new DrainChildExecutors(
                  subexec.upstreamExecutor,
                  subexec.lastDone,
                  rest,
                  subexec.upstreamExecutor.getDone(),
                  subexec.combineChildResults,
                  subexec.combineWithChildResult,
                  subexec.onPull
                ),
                activeChild.onEmit
              )
            )
            return null
          }
        }
      )
    )
  }

  private pullFromChild(
    childExecutor: ErasedExecutor<Env>,
    parentSubexecutor: Subexecutor<Env>,
    onEmitted: (_: any) => CED.ChildExecutorDecision,
    subexec: PullFromChild<Env>
  ): ChannelState<Env, any> | null {
    const handleSubexecFailure = (cause: Ca.Cause<any>): ChannelState<Env, any> | null => {
      return this.finishSubexecutorWithCloseEffect(
        Ex.failCause(cause),
        (_) => parentSubexecutor.close(_),
        (_) => childExecutor.close(_)
      )
    }

    const finishWithDoneValue = (doneValue: any): void => {
      switch (parentSubexecutor._tag) {
        case SubexecutorStackTag.PullFromUpstream: {
          const modifiedParent = new PullFromUpstream(
            parentSubexecutor.upstreamExecutor,
            parentSubexecutor.createChild,
            parentSubexecutor.lastDone !== null
              ? parentSubexecutor.combineChildResults(parentSubexecutor.lastDone, doneValue)
              : doneValue,
            parentSubexecutor.activeChildExecutors,
            parentSubexecutor.combineChildResults,
            parentSubexecutor.combineWithChildResult,
            parentSubexecutor.onPull,
            parentSubexecutor.onEmit
          )
          this.closeLastSubstream = childExecutor.close(Ex.succeed(doneValue))
          this.replaceSubexecutor(modifiedParent)
          break
        }
        case SubexecutorStackTag.DrainChildExecutors: {
          const modifiedParent = new DrainChildExecutors(
            parentSubexecutor.upstreamExecutor,
            parentSubexecutor.lastDone !== null
              ? parentSubexecutor.combineChildResults(parentSubexecutor.lastDone, doneValue)
              : doneValue,
            parentSubexecutor.activeChildExecutors,
            parentSubexecutor.upstreamDone,
            parentSubexecutor.combineChildResults,
            parentSubexecutor.combineWithChildResult,
            parentSubexecutor.onPull
          )
          this.closeLastSubstream = childExecutor.close(Ex.succeed(doneValue))
          this.replaceSubexecutor(modifiedParent)
          break
        }
        default: {
          throw new Error('Bug: this should not get here')
        }
      }
    }

    return new State.Read(
      childExecutor,
      identity,
      (emitted) => {
        pipe(
          onEmitted(emitted),
          CED.match(
            constVoid,
            (doneValue) => finishWithDoneValue(doneValue),
            () => {
              const modifiedParent = parentSubexecutor.enqueuePullFromChild(subexec)
              this.replaceSubexecutor(modifiedParent)
            }
          )
        )
        this.activeSubexecutor = new Emit(emitted, this.activeSubexecutor)
        return null
      },
      Ex.match(
        (cause) => pipe(handleSubexecFailure(cause), State.effectOrNullIgnored),
        (doneValue) => {
          finishWithDoneValue(doneValue)
          return null
        }
      )
    )
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
}
