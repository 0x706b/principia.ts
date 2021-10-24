import type { UnionToTuple } from '../../types'
import type { BuildMany } from './BuildMany'
import type { Cast, Flatten, IsAny, IsPlainObject, IsUnion, Length, Values } from './helpers'
import type { IsMatching } from './IsMatching'

/**
 * DistributeMatchingUnions takes two arguments:
 * - a data structure of type `a` containing unions
 * - a pattern `p`, matching this data structure
 * and turns it into a union of all possible
 * combination of each unions contained in `a` that matches `p`.
 *
 * It does this in 3 main steps:
 *  - 1. Find all unions contained in the data structure, that matches `p`
 *    with `FindUnions<a, p>`. It returns a tree of [union, path] pairs.
 *  - 2. this tree is passed to the `Distribute` type level function,
 *    Which turns it into a union of list of `[singleValue, path]` pairs.
 *    Each list correspond to one of the possible combination of the unions
 *    found in `a`.
 *  - 3. build a data structure with the same shape as `a` for each combination
 *    and return the union of these data structures.
 *
 * @example
 * type t1 = DistributeMatchingUnions<['a' | 'b', 1 | 2], ['a', 1]>;
 * // => ['a', 1] | ['a', 2] | ['b', 1] | ['b', 2]
 *
 * type t2 = DistributeMatchingUnions<['a' | 'b', 1 | 2], ['a', unknown]>;
 * // => ['a', 1 | 2] | ['b', 1 | 2]
 */
export type DistributeMatchingUnions<a, p> = IsAny<a> extends true
  ? any
  : BuildMany<a, Distribute<FindUnionsMany<a, p>>>

// FindUnionsMany :: a -> Union<a> -> PropertyKey[] -> UnionConfig[]
export type FindUnionsMany<A, P, Path extends PropertyKey[] = []> = UnionToTuple<
  (P extends any ? (IsMatching<A, P> extends true ? FindUnions<A, P, Path> : []) : never) extends (infer T)[]
    ? T
    : never
>

/**
 * The reason we don't look further down the tree with lists,
 * Set and Maps is that they can be heterogeneous,
 * so matching on a A[] for a in input of (A|B)[]
 * doesn't rule anything out. You can still have
 * a (A|B)[] afterward. The same logic goes for Set and Maps.
 *
 * Kinds are types of types.
 *
 * kind UnionConfig = {
 *  cases: Union<{
 *    value: b,
 *    subUnions: UnionConfig[]
 *  }>,
 *  path: string[]
 * }
 * FindUnions :: Pattern a p => a -> p -> UnionConfig[]
 */
export type FindUnions<A, P, Path extends PropertyKey[] = []> = unknown extends P
  ? []
  : IsAny<P> extends true
  ? [] // Don't try to find unions after 5 levels
  : Length<Path> extends 5
  ? []
  : IsUnion<A> extends true
  ? [
      {
        cases: A extends any
          ? {
              value: A
              subUnions: FindUnionsMany<A, P, Path>
            }
          : never
        path: Path
      }
    ]
  : [A, P] extends [readonly any[], readonly any[]]
  ? [A, P] extends [
      readonly [infer A1, infer A2, infer A3, infer A4, infer A5],
      readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
    ]
    ? [
        ...FindUnions<A1, P1, [...Path, 0]>,
        ...FindUnions<A2, P2, [...Path, 1]>,
        ...FindUnions<A3, P3, [...Path, 2]>,
        ...FindUnions<A4, P4, [...Path, 3]>,
        ...FindUnions<A5, P5, [...Path, 4]>
      ]
    : [A, P] extends [
        readonly [infer A1, infer A2, infer A3, infer A4],
        readonly [infer P1, infer P2, infer P3, infer P4]
      ]
    ? [
        ...FindUnions<A1, P1, [...Path, 0]>,
        ...FindUnions<A2, P2, [...Path, 1]>,
        ...FindUnions<A3, P3, [...Path, 2]>,
        ...FindUnions<A4, P4, [...Path, 3]>
      ]
    : [A, P] extends [readonly [infer A1, infer A2, infer A3], readonly [infer P1, infer P2, infer P3]]
    ? [...FindUnions<A1, P1, [...Path, 0]>, ...FindUnions<A2, P2, [...Path, 1]>, ...FindUnions<A3, P3, [...Path, 2]>]
    : [A, P] extends [readonly [infer A1, infer A2], readonly [infer P1, infer P2]]
    ? [...FindUnions<A1, P1, [...Path, 0]>, ...FindUnions<A2, P2, [...Path, 1]>]
    : [A, P] extends [readonly [infer A1], readonly [infer P1]]
    ? FindUnions<A1, P1, [...Path, 0]>
    : []
  : A extends Set<any>
  ? []
  : A extends Map<any, any>
  ? []
  : [IsPlainObject<A>, IsPlainObject<P>] extends [true, true]
  ? Flatten<
      Values<{
        // we use Required to remove the optional property modifier (?:).
        // Optional properties aren't considered as union types to avoid
        // generating a huge union.
        [k in keyof Required<A> & keyof P]: FindUnions<NonNullable<A[k]>, P[k], [...Path, k]>
      }>
    >
  : []

// Distribute :: UnionConfig[] -> Union<[a, path][]>
export type Distribute<Unions extends any[]> = Unions extends [{ cases: infer Cases, path: infer Path }, ...infer Tail]
  ? Cases extends { value: infer Value, subUnions: infer SubUnions }
    ? [[Value, Path], ...Distribute<Cast<SubUnions, any[]>>, ...Distribute<Tail>]
    : never
  : []
