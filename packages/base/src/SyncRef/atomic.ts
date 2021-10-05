import type { Maybe } from '../Maybe'
import type { USync } from '../Sync'
import type { Atomic } from './core'

import * as S from '../Sync'

export function getAndSet<A>(a: A) {
  return (self: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = self.value.get
      self.value.set(a)
      return v
    })
}

export function getAndUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = self.value.get
      self.value.set(f(v))
      return v
    })
}

export function getAndUpdateJust<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = self.value.get
      const o = f(v)
      if (o._tag === 'Just') {
        self.value.set(o.value)
      }
      return v
    })
}

export function modify<A, B>(f: (a: A) => readonly [B, A]) {
  return (self: Atomic<A>): USync<B> =>
    S.succeedLazy(() => {
      const v = self.value.get
      const o = f(v)
      self.value.set(o[1])
      return o[0]
    })
}

export function modifyJust<B>(def: B) {
  return <A>(f: (a: A) => Maybe<readonly [B, A]>) =>
    (self: Atomic<A>): USync<B> =>
      S.succeedLazy(() => {
        const v = self.value.get
        const o = f(v)

        if (o._tag === 'Just') {
          self.value.set(o.value[1])
          return o.value[0]
        }

        return def
      })
}

export function update<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USync<void> =>
    S.succeedLazy(() => {
      self.value.set(f(self.value.get))
    })
}

export function updateAndGet<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USync<A> => {
    return S.succeedLazy(() => {
      self.value.set(f(self.value.get))
      return self.value.get
    })
  }
}

export function updateJust<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): USync<void> =>
    S.succeedLazy(() => {
      const o = f(self.value.get)

      if (o._tag === 'Just') {
        self.value.set(o.value)
      }
    })
}

export function updateJustAndGet<A>(f: (a: A) => Maybe<A>) {
  return (self: Atomic<A>): USync<A> => {
    return S.succeedLazy(() => {
      const o = f(self.value.get)

      if (o._tag === 'Just') {
        self.value.set(o.value)
      }

      return self.value.get
    })
  }
}

export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>) => {
    self.value.set(f(self.value.get))
  }
}
