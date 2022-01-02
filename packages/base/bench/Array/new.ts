import * as b from 'benny'

export function unzipNew<A, B>(as: ReadonlyArray<readonly [A, B]>): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const fa: Array<A> = new Array(as.length)
  const fb: Array<B> = new Array(as.length)

  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i][0]
    fb[i] = as[i][1]
  }

  return [fa, fb]
}

export function unzipEmpty<A, B>(as: ReadonlyArray<readonly [A, B]>): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const fa: Array<A> = []
  const fb: Array<B> = []

  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i][0]
    fb[i] = as[i][1]
  }

  return [fa, fb]
}

const arr: ReadonlyArray<readonly [number, string]> = [
  [1, 'a'],
  [2, 'b'],
  [3, 'c'],
  [4, 'd'],
  [5, 'e']
]

b.suite(
  'new Array',
  b.add('new', () => {
    unzipNew(arr)
  }),
  b.add('empty', () => {
    unzipEmpty(arr)
  }),
  b.cycle(),
  b.complete()
)
