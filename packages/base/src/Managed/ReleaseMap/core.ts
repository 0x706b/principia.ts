import type { Exit } from '../../IO/Exit'
import type { Maybe } from '../../Maybe'
import type { URef } from '../../Ref/core'

import { absurd, flow, identity, increment, pipe } from '../../function'
import * as HM from '../../collection/immutable/HashMap'
import * as I from '../../IO/core'
import * as M from '../../Maybe'
import * as NT from '../../Newtype'
import * as Ref from '../../Ref/core'

export type Finalizer = (exit: Exit<any, any>) => I.IO<unknown, never, any>

export interface ReleaseMap extends NT.Newtype<'ReleaseMap', URef<State>> {}
export const ReleaseMap = NT.newtype<ReleaseMap>()

export class Exited {
  readonly _tag = 'Exited'
  constructor(readonly nextKey: number, readonly exit: Exit<any, any>, readonly update: (_: Finalizer) => Finalizer) {}
}

export class Running {
  readonly _tag = 'Running'
  constructor(
    readonly nextKey: number,
    readonly _finalizers: HM.HashMap<number, Finalizer>,
    readonly update: (_: Finalizer) => Finalizer
  ) {}

  get finalizers(): HM.HashMap<number, Finalizer> {
    return this._finalizers
  }
}

export type State = Exited | Running

export const noopFinalizer: Finalizer = () => I.unit()

export function unsafeMake(): ReleaseMap {
  return ReleaseMap.get(Ref.unsafeMake<State>(new Running(0, HM.makeDefault(), identity)))
}

export const make: I.UIO<ReleaseMap> = I.succeedLazy(() => unsafeMake())

export function addIfOpen_(releaseMap: ReleaseMap, finalizer: Finalizer): I.UIO<Maybe<number>> {
  return pipe(
    ReleaseMap.reverseGet(releaseMap),
    Ref.modify<I.IO<unknown, never, Maybe<number>>, State>((s) => {
      switch (s._tag) {
        case 'Exited': {
          return [I.map_(finalizer(s.exit), () => M.nothing()), new Exited(increment(s.nextKey), s.exit, s.update)]
        }
        case 'Running': {
          return [
            I.pure(M.just(s.nextKey)),
            new Running(increment(s.nextKey), HM.set_(s.finalizers, s.nextKey, finalizer), s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}

/**
 * @dataFirst addIfOpen_
 */
export function addIfOpen(finalizer: Finalizer): (releaseMap: ReleaseMap) => I.UIO<Maybe<number>> {
  return (releaseMap) => addIfOpen_(releaseMap, finalizer)
}

export function release_(releaseMap: ReleaseMap, key: number, exit: Exit<any, any>): I.IO<unknown, never, any> {
  return pipe(
    ReleaseMap.reverseGet(releaseMap),
    Ref.modify((s) => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            M.match_(
              HM.get_(s.finalizers, key),
              () => I.unit(),
              (f) => s.update(f)(exit)
            ),
            new Running(s.nextKey, HM.remove_(s.finalizers, key), s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}

/**
 * @dataFirst release_
 */
export function release(key: number, exit: Exit<any, any>): (releaseMap: ReleaseMap) => I.IO<unknown, never, any> {
  return (releaseMap) => release_(releaseMap, key, exit)
}

export function add_(releaseMap: ReleaseMap, finalizer: Finalizer): I.UIO<Finalizer> {
  return I.map_(
    addIfOpen_(releaseMap, finalizer),
    M.match(
      (): Finalizer => () => I.unit(),
      (k): Finalizer =>
        (e) =>
          release_(releaseMap, k, e)
    )
  )
}

/**
 * @dataFirst add_
 */
export function add(finalizer: Finalizer): (releaseMap: ReleaseMap) => I.UIO<Finalizer> {
  return (releaseMap) => add_(releaseMap, finalizer)
}

export function replace_(releaseMap: ReleaseMap, key: number, finalizer: Finalizer): I.UIO<Maybe<Finalizer>> {
  return pipe(
    ReleaseMap.reverseGet(releaseMap),
    Ref.modify<I.IO<unknown, never, Maybe<Finalizer>>, State>((s) => {
      switch (s._tag) {
        case 'Exited':
          return [I.map_(finalizer(s.exit), () => M.nothing()), new Exited(s.nextKey, s.exit, s.update)]
        case 'Running':
          return [
            I.succeed(HM.get_(s.finalizers, key)),
            new Running(s.nextKey, HM.set_(s.finalizers, key, finalizer), s.update)
          ]
        default:
          return absurd(s)
      }
    }),
    I.flatten
  )
}

/**
 * @dataFirst replace_
 */
export function replace(key: number, finalizer: Finalizer): (releaseMap: ReleaseMap) => I.UIO<Maybe<Finalizer>> {
  return (releaseMap) => replace_(releaseMap, key, finalizer)
}

export function updateAll_(releaseMap: ReleaseMap, f: (_: Finalizer) => Finalizer): I.UIO<void> {
  return Ref.update_(ReleaseMap.reverseGet(releaseMap), (s) => {
    switch (s._tag) {
      case 'Exited':
        return new Exited(s.nextKey, s.exit, flow(s.update, f))
      case 'Running':
        return new Running(s.nextKey, s.finalizers, flow(s.update, f))
    }
  })
}

/**
 * @dataFirst updateAll_
 */
export function updateAll(f: (finalizer: Finalizer) => Finalizer): (releaseMap: ReleaseMap) => I.UIO<void> {
  return (releaseMap) => updateAll_(releaseMap, f)
}
