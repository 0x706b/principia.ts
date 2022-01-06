import * as L from '@principia/base/collection/immutable/List'
import * as Li from '@principia/base/List'
import * as b from 'benny'

b.suite(
  'List',
  b.add('List.prepend', () => {
    let l: L.List<number> = new L.Nil()
    for (let i = 0; i < 1000; i++) {
      l = L.prepend_(l, i)
    }
  }),
  b.add('List(2).prepend', () => {
    let l: Li.List<number> = Li.empty()
    for (let i = 0; i < 1000; i++) {
      l = Li.prepend_(l, i)
    }
  }),
  b.add('List.reverse', () => {
    let l: L.List<number> = new L.Nil()
    for (let i = 0; i < 1000; i++) {
      l = L.prepend_(l, i)
    }
    return () => {
      L.reverse(l)
    }
  }),
  b.add('List(2).reverse', () => {
    let l: Li.List<number> = Li.empty()
    for (let i = 0; i < 1000; i++) {
      l = Li.prepend_(l, i)
    }
    return () => {
      Li.reverse(l)
    }
  }),
  b.add('List.forEach', () => {
    let l: L.List<number> = new L.Nil()
    for (let i = 0; i < 1000; i++) {
      l = L.prepend_(l, i)
    }
    return () => {
      L.forEach_(l, () => {
        //
      })
    }
  }),
  b.add('List(2).forEach', () => {
    let l: Li.List<number> = Li.empty()
    for (let i = 0; i < 1000; i++) {
      l = Li.prepend_(l, i)
    }
    return () => {
      Li.forEach_(l, () => {
        //
      })
    }
  }),
  b.add('List.filter', () => {
    let l: L.List<number> = new L.Nil()
    for (let i = 0; i < 1000; i++) {
      l = L.prepend_(l, i)
    }
    return () => {
      L.filter_(l, (n) => n % 2 === 0)
    }
  }),
  b.add('List(2).filter', () => {
    let l: Li.List<number> = Li.empty()
    for (let i = 0; i < 1000; i++) {
      l = Li.prepend_(l, i)
    }
    return () => {
      Li.filter_(l, (n) => n % 2 === 0)
    }
  }),
  b.add('List.map', () => {
    let l: L.List<number> = new L.Nil()
    for (let i = 0; i < 1000; i++) {
      l = L.prepend_(l, i)
    }
    return () => {
      L.map_(l, (n) => n * 2)
    }
  }),
  b.add('List(2).map', () => {
    let l: Li.List<number> = Li.empty()
    for (let i = 0; i < 1000; i++) {
      l = Li.prepend_(l, i)
    }
    return () => {
      Li.map_(l, (n) => n * 2)
    }
  }),
  b.cycle(),
  b.complete()
)
