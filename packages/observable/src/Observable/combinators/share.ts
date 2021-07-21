import type { SubjectLike } from '../../Subject'
import type { Subscription } from '../../Subscription'
import type { Observable } from '../core'

import { operate_ } from '../../Operator'
import { Subject } from '../../Subject'
import { SafeSubscriber } from '../../Subscriber'
import { from, take_ } from '../core'

export interface ShareConfig<E, A, E1 = never, E2 = never, E3 = never> {
  readonly connector?: () => SubjectLike<E, A>
  readonly resetOnDefect?: boolean | ((err: unknown) => Observable<E1, any>)
  readonly resetOnComplete?: boolean | (() => Observable<E2, any>)
  readonly resetOnRefCountZero?: boolean | (() => Observable<E3, any>)
}

export function share_<E, A, E1 = never, E2 = never, E3 = never>(
  fa: Observable<E, A>,
  options: ShareConfig<E, A, E1, E2, E3> = {}
): Observable<E | E1 | E2 | E3, A> {
  const {
    connector = () => new Subject<E, A>(),
    resetOnDefect = true,
    resetOnComplete = true,
    resetOnRefCountZero = true
  } = options

  let connection: SafeSubscriber<E, A> | null = null
  let resetConnection: Subscription | null    = null
  let subject: SubjectLike<E, A> | null       = null
  let refCount     = 0
  let hasCompleted = false
  let hasErrored   = false

  const cancelReset = () => {
    resetConnection?.unsubscribe()
    resetConnection = null
  }

  const reset = () => {
    cancelReset()
    connection   = subject = null
    hasCompleted = hasErrored = false
  }

  const resetAndUnsubscribe = () => {
    const conn = connection
    reset()
    conn?.unsubscribe()
  }

  return operate_(fa, (source, subscriber) => {
    refCount++
    if (!hasErrored && !hasCompleted) {
      cancelReset()
    }

    const dest = (subject = subject ?? connector())

    subscriber.add(() => {
      refCount--
      if (refCount === 0 && !hasErrored && !hasCompleted) {
        resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero)
      }
    })

    dest.subscribe(subscriber)

    if (!connection) {
      connection = new SafeSubscriber({
        next: (value) => dest.next(value),
        fail: (err) => dest.fail(err),
        defect: (defect) => {
          hasErrored = true
          cancelReset()
          resetConnection = handleReset(reset, resetOnDefect, defect)
          dest.defect(defect)
        },
        complete: () => {
          hasCompleted = true
          cancelReset()
          resetConnection = handleReset(reset, resetOnComplete)
          dest.complete()
        }
      })
      from(source).subscribe(connection)
    }
  })
}

export function share<E, A, E1, E2, E3>(
  options: ShareConfig<E, A, E1, E2, E3> = {}
): (fa: Observable<E, A>) => Observable<E | E1 | E2 | E3, A> {
  return (fa) => share_(fa, options)
}

function handleReset<T extends unknown[] = never[]>(
  reset: () => void,
  on: boolean | ((...args: T) => Observable<any, any>),
  ...args: T
): Subscription | null {
  if (on === true) {
    reset()

    return null
  }

  if (on === false) {
    return null
  }

  return take_(on(...args), 1).subscribe({ next: () => reset() })
}
