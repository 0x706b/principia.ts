export function tableSizeFor(capacity: number) {
  return Math.min(highestOneBit(Math.max(capacity - 1, 4) * 2), 1 << 30)
}

export function highestOneBit(i: number) {
  /* eslint-disable no-param-reassign */
  i |= i >> 1
  i |= i >> 2
  i |= i >> 4
  i |= i >> 8
  i |= i >> 16
  return i - (i >>> 1)
  /* eslint-enable */
}

export function improveHash(originalHash: number): number {
  return originalHash ^ (originalHash >>> 16)
}

export function copyOfArray<A>(arr: Array<A>, length: number) {
  const out = new Array<A>(length)
  for (let i = 0; i < arr.length; i++) {
    out[i] = arr[i]
  }
  return arr
}
