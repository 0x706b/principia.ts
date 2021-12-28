import type { UIO } from '../IO/core'
import type { Maybe } from '../Maybe'
import type { Atomic } from './core'

import * as I from '../IO/core'

export function getAndSet<A>(a: A) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.unsafeGet
      self.unsafeSet(a)
      return v
    })
}

export function getAndUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.unsafeGet
      self.unsafeSet(f(v))
      return v
    })
}

export function getAndUpdateJust<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.unsafeGet
      const o = f(v)
      if (o._tag === 'Just') {
        self.unsafeSet(o.value)
      }
      return v
    })
}

export function modify<A, B>(f: (a: A) => readonly [B, A]) {
  return (self: Atomic<A>): UIO<B> =>
    I.succeedLazy(() => {
      const v = self.unsafeGet
      const o = f(v)
      self.unsafeSet(o[1])
      return o[0]
    })
}

export function modifyJust<B>(def: B) {
  return <A>(f: (a: A) => Maybe<readonly [B, A]>) =>
    (self: Atomic<A>): UIO<B> =>
      I.succeedLazy(() => {
        const v = self.unsafeGet
        const o = f(v)

        if (o._tag === 'Just') {
          self.unsafeSet(o.value[1])
          return o.value[0]
        }

        return def
      })
}

export function update<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<void> =>
    I.succeedLazy(() => {
      self.unsafeSet(f(self.unsafeGet))
    })
}

export function updateAndGet<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<A> => {
    return I.succeedLazy(() => {
      self.unsafeSet(f(self.unsafeGet))
      return self.unsafeGet
    })
  }
}

export function updateJust<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): UIO<void> =>
    I.succeedLazy(() => {
      const o = f(self.unsafeGet)

      if (o._tag === 'Just') {
        self.unsafeSet(o.value)
      }
    })
}

export function updateJustAndGet<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): UIO<A> => {
    return I.succeedLazy(() => {
      const o = f(self.unsafeGet)

      if (o._tag === 'Just') {
        self.unsafeSet(o.value)
      }

      return self.unsafeGet
    })
  }
}

export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>) => {
    self.unsafeSet(f(self.unsafeGet))
  }
}
