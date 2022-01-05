import { HashSet } from '@principia/base/collection/mutable/HashSet'
import * as b from 'benny'

b.suite(
  'HashMap',
  b.add('native Set', () => {
    const set = new Set<string>()
    for (let i = 0; i < 128; i++) {
      set.add(String.fromCharCode(i))
    }
    set.forEach(() => {
      //
    })
  }),
  b.add('HashSet', () => {
    const set = HashSet.empty<string>()
    for (let i = 0; i < 128; i++) {
      set.add(String.fromCharCode(i))
    }
    set.forEach(() => {
      //
    })
  }),
  b.cycle(),
  b.complete()
)
