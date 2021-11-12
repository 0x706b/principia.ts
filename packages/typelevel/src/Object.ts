import type { At, Cast, Extends, Is, Key, Keys, Match } from './Any'
import type { BuiltIn } from './BuiltIn'
import type { Iteration, IterationOf, Next, Pos } from './Iteration'
import type { Append, Head, Length, List, Pop, PrependAll, Tail } from './List'
import type * as U from './Union'

/*
 * -------------------------------------------------------------------------------------------------
 * Path
 * -------------------------------------------------------------------------------------------------
 */

export type _Path<O, P extends List<Key>, I extends Iteration = IterationOf<0>> = {
  0: _Path<At<O, P[Pos<I>]>, P, Next<I>>
  1: O
}[Extends<Pos<I>, Length<P>>]

export type Path<O, P extends List<Key>> = _Path<O & {}, P> extends infer X ? Cast<X, any> : never

/*
 * -------------------------------------------------------------------------------------------------
 * AutoPath
 * -------------------------------------------------------------------------------------------------
 */

type Index = number | string

type KeyToIndex<K extends Key, SP extends List<Index>> = number extends K ? Head<SP> : K & Index

const __Cont = Symbol()
type __Cont = typeof __Cont
const __Path = Symbol()
type __Path = typeof __Path

type _MetaPath<O, SP extends List<Index> = [], P extends List<Index> = []> = {
  [K in keyof O]: {
    [__Cont]: _MetaPath<O[K], Tail<SP>, Append<P, KeyToIndex<K, SP>>>
    [__Path]: Append<P, KeyToIndex<K, SP>>
  }
}

type MetaPath<O, SP extends List<Index> = [], P extends List<Index> = []> = {
  [__Cont]: _MetaPath<O, SP, P>
  [__Path]: []
}

type NextPath<OP> = At<UnionOf<At<OP, __Cont>>, __Path> extends infer X ? (undefined extends X ? never : X) : never

type ExecPath<A, SP extends List<Index>> = NextPath<Path<MetaPath<A, SP>, PrependAll<SP, __Cont>>>

type HintPath<A, SP extends List<Index>, Exec extends List<Index>> = [Exec] extends [never]
  ? ExecPath<A, Pop<SP>>
  : Exec | SP

export type AutoPath<A, P extends List<Index>> = HintPath<A, P, ExecPath<A, P>>

/*
 * -------------------------------------------------------------------------------------------------
 * UnionOf
 * -------------------------------------------------------------------------------------------------
 */

export type _UnionOf<O> = O[keyof O]

export type UnionOf<O> = O extends unknown ? _UnionOf<O> : never

/*
 * -------------------------------------------------------------------------------------------------
 * RequiredKeys
 * -------------------------------------------------------------------------------------------------
 */

export type _RequiredKeys<O> = {
  [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

export type RequiredKeys<O> = O extends unknown ? _RequiredKeys<O> : never

/*
 * -------------------------------------------------------------------------------------------------
 * OptionalKeys
 * -------------------------------------------------------------------------------------------------
 */

export type _OptionalKeys<O> = {
  [K in keyof O]-?: {} extends Pick<O, K> ? K : never
}[keyof O]

export type OptionalKeys<O> = O extends unknown ? _OptionalKeys<O> : never

/*
 * -------------------------------------------------------------------------------------------------
 * Pick
 * -------------------------------------------------------------------------------------------------
 */

type __Pick<O, K extends keyof O> = {
  [P in K]: O[P]
} & {}

export type _Pick<O, K extends Key> = __Pick<O, keyof O & K>

export type Pick<O, K extends Key> = O extends unknown ? _Pick<O, K> : never

/*
 * -------------------------------------------------------------------------------------------------
 * Pick
 * -------------------------------------------------------------------------------------------------
 */

export type _Omit<O, K extends Key> = _Pick<O, U.Exclude<keyof O, K>>

export type Omit<O, K extends Key> = O extends unknown ? _Omit<O, K> : never

/*
 * -------------------------------------------------------------------------------------------------
 * Anyify
 * -------------------------------------------------------------------------------------------------
 */

export type Anyify<O> = {
  [K in keyof O]: any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Exclude
 * -------------------------------------------------------------------------------------------------
 */

export type _ExcludeMatch<O, O1, M extends Match> = {
  [K in keyof O]-?: {
    1: never
    0: K
  }[Is<O[K], At<O1, K>, M>]
}[keyof O]

export type ExcludeMatch<O, O1, M extends Match> = O extends unknown ? _ExcludeMatch<O, O1, M> : never

export type ExcludeKeys<O, O1, M extends Match = 'default'> = {
  default: U.Exclude<Keys<O>, Keys<O1>>
  'contains->': ExcludeMatch<O, O1, 'contains->'>
  'extends->': ExcludeMatch<O, O1, 'extends->'>
  '<-contains': ExcludeMatch<O, O1, '<-contains'>
  '<-extends': ExcludeMatch<O, O1, '<-extends'>
  equals: ExcludeMatch<O, O1, 'equals'>
}[M]

/*
 * -------------------------------------------------------------------------------------------------
 * Exclude
 * -------------------------------------------------------------------------------------------------
 */

export type Exclude<O, O1, M extends Match> = Pick<O, ExcludeKeys<O, O1, M>>

/*
 * -------------------------------------------------------------------------------------------------
 * Merge
 * -------------------------------------------------------------------------------------------------
 */

type Longer<L extends List, L1 extends List> = L extends unknown
  ? L1 extends unknown
    ? U.Has<RequiredKeys<L>, RequiredKeys<L1>>
    : never
  : never

type MergeProp<OK, O1K, Fill, OOKeys extends Key, K extends Key> = K extends OOKeys
  ? U.Exclude<OK, undefined> | O1K
  : [OK] extends [never]
  ? O1K
  : OK extends Fill
  ? O1K
  : OK

type MergeFlatObject<O, O1, Fill, OOKeys extends Key = OptionalKeys<O>> = {
  [K in keyof (Anyify<O> & O1)]: MergeProp<At<O, K>, At<O1, K>, Fill, OOKeys, K>
} & {}

type MergeFlatList<
  L extends List,
  L1 extends List,
  Ignore,
  Fill,
  LOK extends Key = _OptionalKeys<L>
> = number extends Length<L | L1>
  ? MergeFlatChoice<L[number], L1[number], Ignore, Fill>[]
  : Longer<L, L1> extends 1
  ? { [K in keyof L]: MergeProp<L[K], At<L1, K>, Fill, LOK, K> }
  : { [K in keyof L1]: MergeProp<At<L, K>, L1[K], Fill, LOK, K> }

type MergeFlatChoice<O, O1, Ignore, Fill> = O extends Ignore
  ? O
  : O1 extends Ignore
  ? O
  : O extends List
  ? O1 extends List
    ? MergeFlatList<O, O1, Ignore, Fill>
    : MergeFlatObject<O, O1, Fill>
  : MergeFlatObject<O, O1, Fill>

export type MergeFlat<O, O1, Ignore = BuiltIn, Fill = undefined> = O extends unknown
  ? O1 extends unknown
    ? MergeFlatChoice<O, O1, Ignore, Fill>
    : never
  : never

type MergeDeepList<L extends List, L1 extends List, Ignore, Fill> = number extends Length<L | L1>
  ? MergeDeepChoice<L[number], L1[number], Ignore, Fill, never, any>[]
  : Longer<L, L1> extends 1
  ? { [K in keyof L]: MergeDeepChoice<L[K], At<L1, K>, Ignore, Fill, _OptionalKeys<L>, K> }
  : { [K in keyof L1]: MergeDeepChoice<At<L, K>, L1[K], Ignore, Fill, _OptionalKeys<L>, K> }

type MergeDeepObject<O, O1, Ignore, Fill, OOKeys extends Key = _OptionalKeys<O>> = {
  [K in keyof (Anyify<O> & O1)]: MergeDeepChoice<At<O, K>, At<O1, K>, Ignore, Fill, OOKeys, K>
}

type MergeDeepChoice<OK, O1K, Ignore, Fill, OOKeys extends Key, K extends Key> = [OK] extends [never]
  ? MergeProp<OK, O1K, Fill, OOKeys, K>
  : [O1K] extends [never]
  ? MergeProp<OK, O1K, Fill, OOKeys, K>
  : OK extends Ignore
  ? MergeProp<OK, O1K, Fill, OOKeys, K>
  : O1K extends Ignore
  ? MergeProp<OK, O1K, Fill, OOKeys, K>
  : OK extends List
  ? O1K extends List
    ? MergeDeepList<OK, O1K, Ignore, Fill>
    : MergeProp<OK, O1K, Fill, OOKeys, K>
  : OK extends object
  ? O1K extends object
    ? MergeDeepObject<OK, O1K, Ignore, Fill>
    : MergeProp<OK, O1K, Fill, OOKeys, K>
  : MergeProp<OK, O1K, Fill, OOKeys, K>

export type MergeDeep<O, O1, Ignore, Fill> = O extends unknown
  ? O1 extends unknown
    ? MergeDeepChoice<O, O1, Ignore, Fill, 'x', 'y'>
    : never
  : never

/*
 * -------------------------------------------------------------------------------------------------
 * Patch
 * -------------------------------------------------------------------------------------------------
 */

type PatchProp<OK, O1K, Fill, OKeys extends Key, K extends Key> = K extends OKeys ? (OK extends Fill ? O1K : OK) : O1K

/**
 * @hidden
 */
type PatchFlatObject<O, O1, Fill, OKeys extends Key = keyof O> = {
  [K in keyof (O & _Omit<O1, OKeys>)]: PatchProp<At<O, K>, At<O1, K>, Fill, OKeys, K>
} & {}

type PatchFlatList<L extends List, L1 extends List, Ignore, Fill> = number extends Length<L | L1>
  ? PatchFlatChoice<L[number], L1[number], Ignore, Fill>[]
  : Longer<L, L1> extends 1
  ? { [K in keyof L]: PatchProp<L[K], At<L1, K>, Fill, keyof L, K> }
  : { [K in keyof L1]: PatchProp<At<L, K>, L1[K], Fill, keyof L, K> }

export type PatchFlatChoice<O, O1, Ignore, Fill> = O extends Ignore
  ? O
  : O1 extends Ignore
  ? O
  : O extends List
  ? O1 extends List
    ? PatchFlatList<O, O1, Ignore, Fill>
    : PatchFlatObject<O, O1, Fill>
  : PatchFlatObject<O, O1, Fill>

export type PatchFlat<O, O1, Ignore = BuiltIn, Fill = never> = O extends unknown
  ? O1 extends unknown
    ? PatchFlatChoice<O, O1, Ignore, Fill>
    : never
  : never

type PatchDeepList<L extends List, L1 extends List, Ignore, Fill> = number extends Length<L | L1>
  ? PatchDeepChoice<L[number], L1[number], Ignore, Fill, never, any>[]
  : Longer<L, L1> extends 1
  ? { [K in keyof L]: PatchDeepChoice<L[K], At<L1, K>, Ignore, Fill, keyof L, K> }
  : { [K in keyof L1]: PatchDeepChoice<At<L, K>, L1[K], Ignore, Fill, keyof L, K> }

type PatchDeepObject<O, O1, Ignore, Fill, OKeys extends Key = keyof O> = {
  [K in keyof (O & _Omit<O1, OKeys>)]: PatchDeepChoice<At<O, K>, At<O1, K>, Ignore, Fill, OKeys, K>
}

type PatchDeepChoice<OK, O1K, Ignore, fill, OKeys extends Key, K extends Key> = [OK] extends [never]
  ? PatchProp<OK, O1K, fill, OKeys, K>
  : [O1K] extends [never]
  ? PatchProp<OK, O1K, fill, OKeys, K>
  : OK extends Ignore
  ? PatchProp<OK, O1K, fill, OKeys, K>
  : O1K extends Ignore
  ? PatchProp<OK, O1K, fill, OKeys, K>
  : OK extends List
  ? O1K extends List
    ? PatchDeepList<OK, O1K, Ignore, fill>
    : PatchProp<OK, O1K, fill, OKeys, K>
  : OK extends object
  ? O1K extends object
    ? PatchDeepObject<OK, O1K, Ignore, fill>
    : PatchProp<OK, O1K, fill, OKeys, K>
  : PatchProp<OK, O1K, fill, OKeys, K>

export type PatchDeep<O, O1, Ignore, Fill> = O extends unknown
  ? O1 extends unknown
    ? PatchDeepChoice<O, O1, Ignore, Fill, 'x', 'y'> // dummy x, y
    : never
  : never

export type Diff<O, O1, M extends Match = 'default'> = PatchFlat<Exclude<O, O1, M>, Exclude<O1, O, M>>
