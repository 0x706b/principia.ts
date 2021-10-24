import type { Cast, Compute, Drop, Iterator, Next, Slice } from './helpers'

// BuildMany :: DataStructure -> Union<[value, path][]> -> Union<DataStructure>
export type BuildMany<Data, Xs extends any[]> = Xs extends any ? BuildOne<Data, Xs> : never

// BuildOne :: DataStructure
// -> [value, path][]
// -> DataStructure
type BuildOne<Data, Xs extends any[]> = Xs extends [[infer value, infer path], ...infer tail]
  ? BuildOne<Update<Data, value, Cast<path, PropertyKey[]>>, tail>
  : Data

type SafeGet<Data, K extends PropertyKey, Default> = K extends keyof Data ? Data[K] : Default

// Update :: a -> b -> PropertyKey[] -> a
type Update<Data, Value, Path extends PropertyKey[]> = Path extends [infer head, ...infer tail]
  ? Data extends readonly [any, ...any]
    ? head extends number
      ? [
          ...Slice<Data, Iterator<head>>,
          Update<Data[head], Value, Cast<tail, PropertyKey[]>>,
          ...Drop<Data, Next<Iterator<head>>>
        ]
      : never
    : Data extends readonly (infer a)[]
    ? Update<a, Value, Cast<tail, PropertyKey[]>>[]
    : Data extends Set<infer a>
    ? Set<Update<a, Value, Cast<tail, PropertyKey[]>>>
    : Data extends Map<infer k, infer v>
    ? Map<k, Update<v, Value, Cast<tail, PropertyKey[]>>>
    : Compute<
        Omit<Data, Cast<head, PropertyKey>> & {
          [k in Cast<head, PropertyKey>]: Update<SafeGet<Data, k, {}>, Value, Cast<tail, PropertyKey[]>>
        }
      >
  : Value
