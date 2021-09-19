import type { Action } from './Action'

import { AsyncAction } from './AsyncAction'
import { Scheduler } from './Scheduler'

export class AsyncScheduler extends Scheduler {
  public actions: Array<AsyncAction<any>> = []

  /** @internal */
  _active = false
  /** @internal */
  _scheduled: any = undefined

  constructor(actionConstructor: typeof Action, now: () => number = Scheduler.now) {
    super(actionConstructor, now)
  }

  flush(action: AsyncAction<any>) {
    const { actions } = this

    if (this._active) {
      actions.push(action)
      return
    }

    let error: unknown
    this._active = true

    do {
      if ((error = action.execute(action.state, action.delay))) {
        break
      }
      // eslint-disable-next-line no-param-reassign
    } while ((action = actions.shift()!))

    this._active = false

    if (error) {
      // eslint-disable-next-line no-param-reassign
      while ((action = actions.shift()!)) {
        action.unsubscribe()
      }
      throw error
    }
  }
}

export const asyncScheduler = new AsyncScheduler(AsyncAction)
