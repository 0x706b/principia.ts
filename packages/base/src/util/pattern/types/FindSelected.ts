import type { UnionToIntersection } from '../../types'
import type * as symbols from '../symbols'
import type { Cast, IsAny } from './helpers'
import type { AnonymousSelectPattern, NamedSelectPattern } from './Pattern'

export type FindSelectionUnion<
  I,
  P,
  // path just serves as an id, to identify different anonymous patterns which have the same type
  Path extends any[] = []
> = IsAny<I> extends true
  ? never
  : P extends NamedSelectPattern<infer K>
  ? { [KK in K]: [I, Path] }
  : P extends AnonymousSelectPattern
  ? { [KK in symbols.AnonymousSelect]: [I, Path] }
  : P extends readonly (infer PP)[]
  ? I extends readonly (infer II)[]
    ? [I, P] extends [
        readonly [infer I1, infer I2, infer I3, infer I4, infer I5],
        readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
      ]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
          | FindSelectionUnion<I4, P4, [...Path, 4]>
          | FindSelectionUnion<I5, P5, [...Path, 5]>
      : [I, P] extends [
          readonly [infer I1, infer I2, infer I3, infer I4],
          readonly [infer P1, infer P2, infer P3, infer P4]
        ]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
          | FindSelectionUnion<I4, P4, [...Path, 4]>
      : [I, P] extends [readonly [infer I1, infer I2, infer I3], readonly [infer P1, infer P2, infer P3]]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
      : [I, P] extends [readonly [infer I1, infer I2], readonly [infer P1, infer P2]]
      ? FindSelectionUnion<I1, P1, [...Path, 1]> | FindSelectionUnion<I2, P2, [...Path, 2]>
      : FindSelectionUnion<II, PP, [...Path, number]> extends infer SelectedUnion
      ? {
          [k in keyof SelectedUnion]: SelectedUnion[k] extends [infer V, infer Path] ? [V[], Path] : never
        }
      : never
    : never
  : P extends object
  ? I extends object
    ? {
        [K in keyof P]: K extends keyof I ? FindSelectionUnion<I[K], P[K], [...Path, K]> : never
      }[keyof P]
    : never
  : never

export type SeveralAnonymousSelectError<
  A = 'You can only use a single anonymous selection (with `select()`) in your pattern. If you need to select multiple values, give them names with `select(<name>)` instead'
> = {
  __error: never
} & A

export type MixedNamedAndAnonymousSelectError<
  A = 'Mixing named selections (`select("name")`) and anonymous selections (`select()`) is forbiden. Please, only use named selections.'
> = {
  __error: never
} & A

// SelectionToArgs :: [number | string, value][] -> [...args]
type SelectionToArgs<Selections extends Record<string, [unknown, unknown]>, I> = [keyof Selections] extends [never]
  ? I
  : symbols.AnonymousSelect extends keyof Selections
  ? // If the path is never, it means several anonymous patterns were `&` together
    [Selections[symbols.AnonymousSelect][1]] extends [never]
    ? SeveralAnonymousSelectError
    : keyof Selections extends symbols.AnonymousSelect
    ? Selections[symbols.AnonymousSelect][0]
    : MixedNamedAndAnonymousSelectError
  : { [K in keyof Selections]: Selections[K][0] }

export type FindSelected<I, P> = SelectionToArgs<
  Cast<UnionToIntersection<{} | FindSelectionUnion<I, P>>, Record<string, [unknown, unknown]>>,
  I
>
