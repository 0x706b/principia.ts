import type { Observer } from './Observer'

export const NextTypeId = Symbol('@principia/observable/Notification/Next')
export type NextTypeId = typeof NextTypeId

export class Next<A> {
  readonly _tag                     = 'Next';
  readonly [NextTypeId]: NextTypeId = NextTypeId
  constructor(readonly value: A) {}
}

export const FailTypeId = Symbol('@principia/observable/Notification/Fail')
export type FailTypeId = typeof FailTypeId

export class Fail<E> {
  readonly _tag                     = 'Fail';
  readonly [FailTypeId]: FailTypeId = FailTypeId
  constructor(readonly error: E) {}
}

export const DefectTypeId = Symbol('@principia/observable/Notification/Defect')
export type DefectTypeId = typeof DefectTypeId

export class Defect {
  readonly _tag = 'Defect';
  readonly [DefectTypeId]: DefectTypeId = DefectTypeId
  constructor(readonly defect: unknown) {}
}

export const CompleteTypeId = Symbol('@principia/observable/Notification/Complete')
export type CompleteTypeId = typeof CompleteTypeId

export class Complete {
  readonly _tag = 'Complete';
  readonly [CompleteTypeId]: CompleteTypeId = CompleteTypeId
}

const COMPLETE = new Complete()

export type Notification<E, A> = Next<A> | Fail<E> | Complete | Defect

export function next<E = never, A = never>(value: A): Notification<E, A> {
  return new Next(value)
}

export function error<E = never, A = never>(error: E): Notification<E, A> {
  return new Fail(error)
}

export function defect<E = never, A = never>(defect: unknown): Notification<E, A> {
  return new Defect(defect)
}

export function complete<E = never, A = never>(): Notification<E, A> {
  return COMPLETE
}

export function match_<E, A, B, C, D, F>(
  fa: Notification<E, A>,
  onNext: (a: A) => B,
  onFail: (e: E) => C,
  onDefect: (err: unknown) => D,
  onComplete: () => F
): B | C | D | F {
  switch (fa._tag) {
    case 'Next':
      return onNext(fa.value)
    case 'Fail':
      return onFail(fa.error)
    case 'Defect':
      return onDefect(fa.defect)
    case 'Complete':
      return onComplete()
  }
}

export function match<E, A, B, C, D, F>(
  onNext: (a: A) => B,
  onFail: (e: E) => C,
  onDefect: (err: unknown) => D,
  onComplete: () => F
): (fa: Notification<E, A>) => B | C | D | F {
  return (fa) => match_(fa, onNext, onFail, onDefect, onComplete)
}

export function observe_<E, A>(notification: Notification<E, A>, observer: Partial<Observer<E, A>>): void {
  return match_(
    notification,
    (a) => observer.next?.(a),
    (e) => observer.fail?.(e),
    (err) => observer.defect?.(err),
    () => observer.complete?.()
  )
}
