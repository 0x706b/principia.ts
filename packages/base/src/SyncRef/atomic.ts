import type { Maybe } from '../Maybe'
import type { USync } from '../Sync'
import type { Atomic } from './core'

import * as S from '../Sync'

export function getAndSet<A>(a: A) {
  return (ref: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = ref.unsafeGet
      ref.unsafeSet(a)
      return v
    })
}

export function getAndUpdate<A>(f: (a: A) => A) {
  return (ref: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = ref.unsafeGet
      ref.unsafeSet(f(v))
      return v
    })
}

export function getAndUpdateJust<A>(f: (a: A) => Maybe<A>) {
  return (ref: Atomic<A>): USync<A> =>
    S.succeedLazy(() => {
      const v = ref.unsafeGet
      const o = f(v)
      if (o._tag === 'Just') {
        ref.unsafeSet(o.value)
      }
      return v
    })
}

export function modify<A, B>(f: (a: A) => readonly [B, A]) {
  return (ref: Atomic<A>): USync<B> =>
    S.succeedLazy(() => {
      const v = ref.unsafeGet
      const o = f(v)
      ref.unsafeSet(o[1])
      return o[0]
    })
}

export function modifyJust<B>(def: B) {
  return <A>(f: (a: A) => Maybe<readonly [B, A]>) =>
    (ref: Atomic<A>): USync<B> =>
      S.succeedLazy(() => {
        const v = ref.unsafeGet
        const o = f(v)

        if (o._tag === 'Just') {
          ref.unsafeSet(o.value[1])
          return o.value[0]
        }

        return def
      })
}

export function update<A>(f: (a: A) => A) {
  return (ref: Atomic<A>): USync<void> =>
    S.succeedLazy(() => {
      ref.unsafeSet(f(ref.unsafeGet))
    })
}

export function updateAndGet<A>(f: (a: A) => A) {
  return (ref: Atomic<A>): USync<A> => {
    return S.succeedLazy(() => {
      ref.unsafeSet(f(ref.unsafeGet))
      return ref.unsafeGet
    })
  }
}

export function updateJust<A>(f: (a: A) => Maybe<A>) {
  return (ref: Atomic<A>): USync<void> =>
    S.succeedLazy(() => {
      const o = f(ref.unsafeGet)

      if (o._tag === 'Just') {
        ref.unsafeSet(o.value)
      }
    })
}

export function updateJustAndGet<A>(f: (a: A) => Maybe<A>) {
  return (ref: Atomic<A>): USync<A> => {
    return S.succeedLazy(() => {
      const o = f(ref.unsafeGet)

      if (o._tag === 'Just') {
        ref.unsafeSet(o.value)
      }

      return ref.unsafeGet
    })
  }
}

export function unsafeUpdate<A>(f: (a: A) => A) {
  return (ref: Atomic<A>) => {
    ref.unsafeSet(f(ref.unsafeGet))
  }
}
