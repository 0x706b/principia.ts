import * as b from 'benny'

const VALUE = Symbol()

function makeLazy<A>(a: () => A): () => A {
  return () => {
    if (a[VALUE] !== undefined) {
      return a[VALUE]
    } else {
      const value = a()
      a[VALUE]    = value
      return value
    }
  }
}

function makeLazyProxy<A>(a: () => A): () => A {
  return new Proxy(a, {
    apply: (target) => {
      if (VALUE in target) {
        return target[VALUE]
      }
      target[VALUE] = target()
      return target[VALUE]
    }
  })
}

b.suite(
  'lazy',
  b.add('fn', () => {
    const a = makeLazy(() => 1)
    return () => {
      a()
    }
  }),
  b.add('proxy', () => {
    const a = makeLazyProxy(() => 1)
    return () => {
      a()
    }
  }),
  b.cycle(),
  b.complete()
)
