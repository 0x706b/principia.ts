import { HashMap } from '@principia/base/collection/mutable/HashMap'
import * as b from 'benny'

b.suite(
  'HashMap',
  b.add('native Map', () => {
    const map = new Map<string, number>()
    for (let i = 0; i < 128; i++) {
      map.set(String.fromCharCode(i), i)
    }
    map.forEach(() => {
      //
    })
  }),
  b.add('HashMap', () => {
    const map = HashMap.empty<string, number>()
    for (let i = 0; i < 128; i++) {
      map.set(String.fromCharCode(i), i)
    }
    map.forEach(() => {
      //
    })
  }),
  b.cycle(),
  b.complete()
)
