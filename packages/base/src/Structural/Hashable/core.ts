export const $hash = Symbol('@principia/base/Structural/Hashable')

export interface Hashable {
  [$hash]: number
}

export function isHashable(value: any): value is Hashable {
  return $hash in value
}
