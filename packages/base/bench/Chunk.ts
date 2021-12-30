import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as L from '@principia/base/List'
import * as b from 'benny'

const c1 = C.range(0, 1000)
let c2   = C.empty<number>()
for (let i = 0; i < 1000; i++) {
  c2 = C.prepend_(c2, i)
}

const l1 = L.range(0, 1000)
let l2   = L.empty<number>()
for (let i = 0; i < 1000; i++) {
  l2 = L.prepend_(l2, i)
}

b.suite(
  'chunk',
  b.add('chunk prepend', () => {
    let chunk = C.empty<number>()
    for (let i = 0; i < 100; i++) {
      chunk = C.prepend_(chunk, i)
    }
    C.foreach_(chunk, (n) => n)
  }),
  b.add('list prepend', () => {
    let list = L.empty<number>()
    for (let i = 0; i < 100; i++) {
      list = L.prepend_(list, i)
    }
    L.forEach_(list, (n) => n)
  }),
  b.add('chunk map', () => {
    C.map_(c2, (n) => n + 1)
  }),
  b.add('list map', () => {
    L.map_(l2, (n) => n + 1)
  }),
  b.add('chunk append', () => {
    let chunk = C.empty<number>()
    for (let i = 0; i < 100; i++) {
      chunk = C.append_(chunk, i)
    }
    C.foreach_(chunk, (n) => n)
  }),
  b.add('list append', () => {
    let list = L.empty<number>()
    for (let i = 0; i < 100; i++) {
      list = L.append_(list, i)
    }
    L.forEach_(list, (n) => n)
  }),
  b.add('chunk concat', () => {
    const c = C.concat_(c1, c2)
    C.foreach_(c, (n) => n)
  }),
  b.add('list concat', () => {
    const l = L.concat_(l1, l2)
    L.forEach_(l, (n) => n)
  }),
  b.add('chunk take', () => {
    const c = C.take_(c2, 537)
    C.foreach_(c, (n) => n)
  }),
  b.add('list take', () => {
    const l = L.take_(l2, 537)
    L.forEach_(l, (n) => n)
  }),
  b.cycle(),
  b.complete()
)
