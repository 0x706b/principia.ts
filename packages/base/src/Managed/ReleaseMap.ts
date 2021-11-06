import type { Exit } from '../IO/Exit'
import type { Maybe } from '../Maybe'
import type { URef } from '../Ref/core'

import { absurd, flow, identity, increment, pipe } from '../function'
import * as I from '../IO/core'
import * as Mp from '../Map'
import * as M from '../Maybe'
import { just, nothing } from '../Maybe'
import * as XR from '../Ref/core'

export type Finalizer = (exit: Exit<any, any>) => I.IO<unknown, never, any>

export class ReleaseMap {
  constructor(readonly ref: URef<State>) {}
}

export class Exited {
  readonly _tag = 'Exited'
  constructor(readonly nextKey: number, readonly exit: Exit<any, any>, readonly update: (_: Finalizer) => Finalizer) {}
}

export class Running {
  readonly _tag = 'Running'
  constructor(
    readonly nextKey: number,
    readonly _finalizers: ReadonlyMap<number, Finalizer>,
    readonly update: (_: Finalizer) => Finalizer
  ) {}

  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers
  }
}

export type State = Exited | Running

export function finalizers(state: Running): ReadonlyMap<number, Finalizer> {
  return state.finalizers()
}

export const noopFinalizer: Finalizer = () => I.unit()

export function addIfOpen(_: ReleaseMap, finalizer: Finalizer): I.UIO<Maybe<number>> {
  return pipe(
    _.ref,
    XR.modify<I.IO<unknown, never, Maybe<number>>, State>((s) => {
      switch (s._tag) {
        case 'Exited': {
          return [I.map_(finalizer(s.exit), () => nothing()), new Exited(increment(s.nextKey), s.exit, s.update)]
        }
        case 'Running': {
          return [
            I.pure(just(s.nextKey)),
            new Running(increment(s.nextKey), Mp.insert(s.nextKey, finalizer)(finalizers(s)), s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}

export function release(_: ReleaseMap, key: number, exit: Exit<any, any>): I.IO<unknown, never, any> {
  return pipe(
    _.ref,
    XR.modify((s) => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            M.match_(
              Mp.lookup_(s.finalizers(), key),
              () => I.unit(),
              (f) => s.update(f)(exit)
            ),
            new Running(s.nextKey, Mp.remove_(s.finalizers(), key), s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}

export function add(_: ReleaseMap, finalizer: Finalizer): I.UIO<Finalizer> {
  return I.map_(
    addIfOpen(_, finalizer),
    M.match(
      (): Finalizer => () => I.unit(),
      (k): Finalizer =>
        (e) =>
          release(_, k, e)
    )
  )
}

export function replace(_: ReleaseMap, key: number, finalizer: Finalizer): I.UIO<Maybe<Finalizer>> {
  return pipe(
    _.ref,
    XR.modify<I.IO<unknown, never, Maybe<Finalizer>>, State>((s) => {
      switch (s._tag) {
        case 'Exited':
          return [I.map_(finalizer(s.exit), () => nothing()), new Exited(s.nextKey, s.exit, s.update)]
        case 'Running':
          return [
            I.succeed(Mp.lookup_(finalizers(s), key)),
            new Running(s.nextKey, Mp.insert_(finalizers(s), key, finalizer), s.update)
          ]
        default:
          return absurd(s)
      }
    }),
    I.flatten
  )
}

export function updateAll(_: ReleaseMap, f: (_: Finalizer) => Finalizer): I.UIO<void> {
  return XR.update_(_.ref, (s) => {
    switch (s._tag) {
      case 'Exited':
        return new Exited(s.nextKey, s.exit, flow(s.update, f))
      case 'Running':
        return new Running(s.nextKey, s.finalizers(), flow(s.update, f))
    }
  })
}

export const make = I.map_(XR.make<State>(new Running(0, new Map(), identity)), (s) => new ReleaseMap(s))
