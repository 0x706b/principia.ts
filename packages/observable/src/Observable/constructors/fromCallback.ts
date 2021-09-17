import { AsyncSubject } from '../../Subject'
import { Observable } from '../core'

export function fromCallback<A extends ReadonlyArray<unknown>, R extends ReadonlyArray<unknown>>(
  callbackFunc: (...args: [...A, (...res: R) => void]) => void
): (...args: A) => Observable<unknown, R> {
  // @ts-expect-error
  return fromCallbackInternal(false, callbackFunc)
}

export function fromNodeCallback<E, A extends ReadonlyArray<unknown>, R extends ReadonlyArray<unknown>>(
  callbackFunc: (...args: [...A, (err: E, ...res: R) => void]) => void
): (...args: A) => Observable<Exclude<E, null | undefined>, R extends [] ? void : R extends [any] ? R[0] : R> {
  // @ts-expect-error
  return fromCallbackInternal(true, callbackFunc)
}

function fromCallbackInternal(isNodeStyle: boolean, callbackFunc: any): (...args: any[]) => Observable<unknown, any> {
  return function (this: any, ...args: any[]): Observable<unknown, any> {
    const subject     = new AsyncSubject<any, any>()
    let uninitialized = true
    return new Observable((subscriber) => {
      const subs = subject.subscribe(subscriber)
      if (uninitialized) {
        uninitialized  = false
        let isAsync    = false
        let isComplete = false
        callbackFunc.apply(this, [
          ...args,
          (...results: any[]) => {
            if (isNodeStyle) {
              const err = results.shift()
              if (err != null) {
                subject.error(err)
                return
              }
            }
            subject.next(1 < results.length ? results : results[0])
            isComplete = true
            if (isAsync) {
              subject.complete()
            }
          }
        ])
        if (isComplete) {
          subject.complete()
        }

        isAsync = true
      }
      return subs
    })
  }
}
