import * as HS from '@principia/base/collection/immutable/HashSet'
import * as b from 'benny'

b.suite(
  'HashSet',
  b.add('add', () => {
    let set = HS.makeDefault<number>()
    for (let i = 0; i < 100; i++) {
      set = HS.add_(set, i)
    }
  }),
  b.add('remove', () => {
    let set = HS.makeDefault<number>()
    for (let i = 0; i < 100; i++) {
      set = HS.add_(set, i)
    }
    return () => {
      for (let i = 0; i < 100; i++) {
        set = HS.remove_(set, i)
      }
    }
  }),
  b.add('filter', () => {
    let set = HS.makeDefault<number>()
    for (let i = 0; i < 100; i++) {
      set = HS.add_(set, i)
    }
    return () => {
      HS.filter_(set, (n) => n % 2 === 0)
    }
  }),
  b.cycle(),
  b.complete()
)
