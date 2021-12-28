import type { RuntimeFiber } from './Fiber'
import type { IO, UIO } from './IO'
import type { Exit } from './IO/Exit'
import type * as M from './Maybe'
import type { AtomicReference } from './util/support/AtomicReference'

import { pipe } from './function'
import * as HS from './HashSet'
import * as I from './IO/core'

export abstract class Supervisor<A> {
  abstract readonly value: UIO<A>
  abstract unsafeOnStart<R, E, A>(
    environment: R,
    effect: IO<R, E, A>,
    parent: M.Maybe<RuntimeFiber<E, A>>,
    fiber: RuntimeFiber<E, A>
  ): void
  abstract unsafeOnEnd<E, A>(value: Exit<E, A>, fiber: RuntimeFiber<E, A>): void
  unsafeOnEffect<E, A>(_fiber: RuntimeFiber<E, A>, _effect: IO<any, any, any>): void {
    return
  }
  unsafeOnSuspend<E, A>(_fiber: RuntimeFiber<E, A>): void {
    return
  }
  unsafeOnResume<E, A>(_fiber: RuntimeFiber<E, A>): void {
    return
  }
}

export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(readonly value: UIO<A>) {
    super()
  }
  unsafeOnStart() {
    return
  }
  unsafeOnEnd() {
    return
  }
  unsafeOnEffect() {
    return
  }
  unsafeOnSuspend() {
    return
  }
  unsafeOnResume() {
    return
  }
}

export class ProxySupervisor<A> extends Supervisor<A> {
  constructor(readonly value: UIO<A>, readonly underlying: Supervisor<any>) {
    super()
  }
  unsafeOnStart<R, E, A>(
    environment: R,
    effect: IO<R, E, A>,
    parent: M.Maybe<RuntimeFiber<E, A>>,
    fiber: RuntimeFiber<E, A>
  ): void {
    this.underlying.unsafeOnStart(environment, effect, parent, fiber)
  }
  unsafeOnEnd<E, A>(value: Exit<E, A>, fiber: RuntimeFiber<E, A>): void {
    this.underlying.unsafeOnEnd(value, fiber)
  }
  unsafeOnEffect<E, A>(fiber: RuntimeFiber<E, A>, effect: IO<any, any, any>): void {
    this.underlying.unsafeOnEffect(fiber, effect)
  }
  unsafeOnSuspend<E, A>(fiber: RuntimeFiber<E, A>) {
    this.underlying.unsafeOnSuspend(fiber)
  }
  unsafeOnResume<E, A>(fiber: RuntimeFiber<E, A>) {
    this.underlying.unsafeOnResume(fiber)
  }
}

export function unsafeTrack(): Supervisor<ReadonlyArray<RuntimeFiber<any, any>>> {
  const set = new Set<RuntimeFiber<any, any>>()
  return new (class extends Supervisor<ReadonlyArray<RuntimeFiber<any, any>>> {
    value = I.succeedLazy(() => Array.from(set))
    unsafeOnStart<R, E, A>(
      _environment: R,
      _effect: IO<R, E, A>,
      _parent: M.Maybe<RuntimeFiber<E, A>>,
      fiber: RuntimeFiber<E, A>
    ) {
      set.add(fiber)
    }
    unsafeOnEnd<E, A>(_value: Exit<E, A>, fiber: RuntimeFiber<E, A>) {
      set.delete(fiber)
    }
  })()
}

export function fibersIn(
  ref: AtomicReference<HS.HashSet<RuntimeFiber<any, any>>>
): UIO<Supervisor<HS.HashSet<RuntimeFiber<any, any>>>> {
  return I.succeedLazy(
    () =>
      new (class extends Supervisor<HS.HashSet<RuntimeFiber<any, any>>> {
        value = I.succeedLazy(() => ref.get)
        unsafeOnStart<R, E, A>(
          environment: R,
          effect: IO<R, E, A>,
          parent: M.Maybe<RuntimeFiber<any, any>>,
          fiber: RuntimeFiber<E, A>
        ) {
          ref.set(HS.add_(ref.get, fiber))
        }
        unsafeOnEnd<E, A>(value: Exit<E, A>, fiber: RuntimeFiber<E, A>) {
          ref.set(HS.remove_(ref.get, fiber))
        }
      })()
  )
}

export const track: UIO<Supervisor<ReadonlyArray<RuntimeFiber<any, any>>>> = I.succeedLazy(() => unsafeTrack())

export function fromIO<A>(ma: UIO<A>): Supervisor<A> {
  return new ConstSupervisor(ma)
}

export function cross_<A, B>(fa: Supervisor<A>, fb: Supervisor<B>): Supervisor<readonly [A, B]> {
  return new (class extends Supervisor<readonly [A, B]> {
    value = pipe(fa.value, I.cross(fb.value))
    unsafeOnStart<R, E, A>(
      environment: R,
      effect: IO<R, E, A>,
      parent: M.Maybe<RuntimeFiber<any, any>>,
      fiber: RuntimeFiber<E, A>
    ) {
      try {
        fa.unsafeOnStart(environment, effect, parent, fiber)
      } finally {
        fb.unsafeOnStart(environment, effect, parent, fiber)
      }
    }
    unsafeOnEnd<E, A>(value: Exit<E, A>, fiber: RuntimeFiber<E, A>) {
      fa.unsafeOnEnd(value, fiber)
      fb.unsafeOnEnd(value, fiber)
    }
    unsafeOnEffect<E, A>(fiber: RuntimeFiber<E, A>, effect: IO<any, any, any>) {
      fa.unsafeOnEffect(fiber, effect)
      fb.unsafeOnEffect(fiber, effect)
    }
    unsafeOnSuspend<E, A>(fiber: RuntimeFiber<E, A>) {
      fa.unsafeOnSuspend(fiber)
      fb.unsafeOnSuspend(fiber)
    }
    unsafeOnResume<E, A>(fiber: RuntimeFiber<E, A>) {
      fa.unsafeOnResume(fiber)
      fb.unsafeOnResume(fiber)
    }
  })()
}

export const none = new ConstSupervisor(I.unit())
