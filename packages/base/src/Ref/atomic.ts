import type { UIO } from '../IO/core'
import type { Option } from '../Option'
import type { Atomic } from './core'

import * as I from '../IO/core'

export function getAndSet<A>(a: A) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.value.get
      self.value.set(a)
      return v
    })
}

export function getAndUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.value.get
      self.value.set(f(v))
      return v
    })
}

export function getAndUpdateSome<A>(f: (a: A) => Option<A>) {
  return (self: Atomic<A>): UIO<A> =>
    I.succeedLazy(() => {
      const v = self.value.get
      const o = f(v)
      if (o._tag === 'Some') {
        self.value.set(o.value)
      }
      return v
    })
}

export function modify<A, B>(f: (a: A) => readonly [B, A]) {
  return (self: Atomic<A>): UIO<B> =>
    I.succeedLazy(() => {
      const v = self.value.get
      const o = f(v)
      self.value.set(o[1])
      return o[0]
    })
}

export function modifySome<B>(def: B) {
  return <A>(f: (a: A) => Option<readonly [B, A]>) =>
    (self: Atomic<A>): UIO<B> =>
      I.succeedLazy(() => {
        const v = self.value.get
        const o = f(v)

        if (o._tag === 'Some') {
          self.value.set(o.value[1])
          return o.value[0]
        }

        return def
      })
}

export function update<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<void> =>
    I.succeedLazy(() => {
      self.value.set(f(self.value.get))
    })
}

export function updateAndGet<A>(f: (a: A) => A) {
  return (self: Atomic<A>): UIO<A> => {
    return I.succeedLazy(() => {
      self.value.set(f(self.value.get))
      return self.value.get
    })
  }
}

export function updateSome<A>(f: (a: A) => Option<A>) {
  return (self: Atomic<A>): UIO<void> =>
    I.succeedLazy(() => {
      const o = f(self.value.get)

      if (o._tag === 'Some') {
        self.value.set(o.value)
      }
    })
}

export function updateSomeAndGet<A>(f: (a: A) => Option<A>) {
  return (self: Atomic<A>): UIO<A> => {
    return I.succeedLazy(() => {
      const o = f(self.value.get)

      if (o._tag === 'Some') {
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
