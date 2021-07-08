/* eslint-disable functional/immutable-data */
import type { FiberId } from '../../Fiber/FiberId'
import type { Stack } from '../../util/support/Stack'
import type { Journal } from '../Journal'
import type { OnFailure, OnRetry, OnSuccess } from './primitives'

import { makeStack } from '../../util/support/Stack'
import * as TEx from '../TExit'
import * as STM from './primitives'

type Erased = STM.STM<unknown, unknown, unknown>
type Cont =
  | OnFailure<unknown, unknown, unknown, unknown>
  | OnRetry<unknown, unknown, unknown>
  | OnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<unknown>

  constructor(readonly self: STM.STM<R, E, A>, readonly journal: Journal, readonly fiberId: FiberId, r0: R) {
    this.envStack = makeStack(r0)
  }

  private unwindStack(error: unknown, isRetry: boolean): Erased | undefined {
    let result: Erased | undefined = undefined
    while (this.contStack && !result) {
      const cont     = this.contStack.value
      this.contStack = this.contStack.previous
      if (cont._tag === STM.STMTag.OnFailure) {
        if (!isRetry) {
          result = cont.onFailure(error)
        }
      }
      if (cont._tag === STM.STMTag.OnRetry) {
        if (isRetry) {
          result = cont.onRetry
        }
      }
    }
    return result
  }

  run(): TEx.TExit<E, A> {
    let curr                                          = this.self as Erased | undefined
    let exit: TEx.TExit<unknown, unknown> | undefined = undefined

    while (!exit && curr) {
      const k = curr
      STM.concrete(k)
      switch (k._tag) {
        case STM.STMTag.Succeed: {
          const a = k.a()
          if (!this.contStack) {
            exit = TEx.succeed(a)
          } else {
            const cont     = this.contStack.value
            this.contStack = this.contStack.previous
            curr           = cont.apply(a)
          }
          break
        }
        case STM.STMTag.SucceedNow: {
          const a = k.a
          if (!this.contStack) {
            exit = TEx.succeed(a)
          } else {
            const cont     = this.contStack.value
            this.contStack = this.contStack.previous
            curr           = cont.apply(a)
          }
          break
        }
        case STM.STMTag.Gives: {
          this.envStack = makeStack(k.f(this.envStack.value), this.envStack)
          curr          = STM.ensuring_(
            k.stm,
            STM.succeedLazy(() => {
              this.envStack = this.envStack.previous!
            })
          )
          break
        }
        case STM.STMTag.OnRetry: {
          this.contStack = makeStack(k, this.contStack)
          curr           = k.stm
          break
        }
        case STM.STMTag.OnFailure: {
          this.contStack = makeStack(k, this.contStack)
          curr           = k.stm
          break
        }
        case STM.STMTag.OnSuccess: {
          this.contStack = makeStack(k, this.contStack)
          curr           = k.stm
          break
        }
        case STM.STMTag.Effect: {
          try {
            const a = k.f(this.journal, this.fiberId, this.envStack.value)
            if (!this.contStack) {
              exit = TEx.succeed(a)
            } else {
              const cont     = this.contStack.value
              this.contStack = this.contStack.previous
              curr           = cont.apply(a)
            }
          } catch (e) {
            if (STM.isFailException(e)) {
              curr = this.unwindStack(e.e, false)
              if (!curr) {
                exit = TEx.fail(e.e)
              }
            } else if (STM.isRetryException(e)) {
              curr = this.unwindStack(undefined, true)
              if (!curr) {
                exit = TEx.retry()
              }
            } else if (STM.isDieException(e)) {
              curr = this.unwindStack(e.e, false)
              if (!curr) {
                exit = TEx.die(e.e)
              }
            } else {
              throw e
            }
          }
        }
      }
    }

    return exit as TEx.TExit<E, A>
  }
}
