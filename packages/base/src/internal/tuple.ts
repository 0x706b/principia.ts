export function tuple<T extends ReadonlyArray<any>>(...t: T): readonly [...T] {
  return t
}
