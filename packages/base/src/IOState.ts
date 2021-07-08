import type { Has, Tag } from './Has'
import type { UIO } from './IO/primitives'
import type { Layer } from './Layer'

import * as FR from './FiberRef'
import { toLayer } from './IO/combinators/toLayer'

export const IOStateTypeId = Symbol('@principia/base/IOState')
export type IOStateTypeId = typeof IOStateTypeId

export interface IOState<S> {
  readonly [IOStateTypeId]: IOStateTypeId
  readonly get: UIO<S>
  readonly set: (s: S) => UIO<void>
  readonly update: (f: (s: S) => S) => UIO<void>
}

export class IOStateFiberRef<S> implements IOState<S> {
  readonly [IOStateTypeId]: IOStateTypeId = IOStateTypeId
  constructor(readonly fiberRef: FR.FiberRef<S>) {}
  readonly get    = FR.get(this.fiberRef)
  readonly set    = (s: S) => FR.set_(this.fiberRef, s)
  readonly update = (f: (s: S) => S) => FR.update_(this.fiberRef, f)
}

export function make<S>(initial: S): UIO<IOState<S>> {
  return FR.make(initial)['<$>']((fiberRef) => new IOStateFiberRef(fiberRef))
}

export function makeLayer<S>(initial: S, tag: Tag<IOState<S>>): Layer<unknown, never, Has<IOState<S>>> {
  return toLayer(tag)(make(initial))
}
