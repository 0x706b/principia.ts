import type { Async } from './Async'
import type { Chunk } from './Chunk'
import type { Const } from './Const'
import type { Either } from './Either'
import type { Eq } from './Eq'
import type { Eval } from './Eval'
import type { FreeSemiring } from './FreeSemiring'
import type { Guard } from './Guard'
import type { HashMap } from './HashMap'
import type { Identity } from './Identity'
import type { IO } from './IO'
import type { List } from './List/core'
import type { NonEmptyArray } from './NonEmptyArray'
import type { Option } from './Option'
import type { Ord } from './Ord'
import type { Predicate } from './Predicate'
import type { Reader } from './Reader'
import type { ReadonlyRecord } from './Record'
import type { RoseTree } from './RoseTree'
import type { Show } from './Show'
import type { State } from './State'
import type { StateIn, StateOut } from './StateT'
import type { Store } from './Store'
import type { Sync } from './Sync'
import type { These } from './These'
import type { Tuple2 } from './Tuple2'
import type { Writer } from './Writer'
import type { Z } from './Z'
import type { ZReader } from './ZReader'
import type { ZState } from './ZState'

export const ShowURI = 'Show'
export type ShowURI = typeof ShowURI

export const EqURI = 'Eq'
export type EqURI = typeof EqURI

export const OrdURI = 'Ord'
export type OrdURI = typeof OrdURI

export const PredicateURI = 'Predicate'
export type PredicateURI = typeof PredicateURI

export const ArrayURI = 'Array'
export type ArrayURI = typeof ArrayURI

export const ConstURI = 'Const'
export type ConstURI = typeof ConstURI

export const EitherURI = 'Either'
export type EitherURI = typeof EitherURI

export const EvalURI = 'Eval'
export type EvalURI = typeof EvalURI

export const GuardURI = 'Guard'
export type GuardURI = typeof GuardURI

export const IdentityURI = 'Identity'
export type IdentityURI = typeof IdentityURI

export const IterableURI = 'Iterable'
export type IterableURI = typeof IterableURI

export const AsyncIterableURI = 'AsyncIterable'
export type AsyncIterableURI = typeof AsyncIterableURI

export const ListURI = 'List'
export type ListURI = typeof ListURI

export const MapURI = 'Map'
export type MapURI = typeof MapURI

export const NonEmptyArrayURI = 'NonEmptyArray'
export type NonEmptyArrayURI = typeof NonEmptyArrayURI

export const OptionURI = 'Option'
export type OptionURI = typeof OptionURI

export const ReaderURI = 'Reader'
export type ReaderURI = typeof ReaderURI

export const RecordURI = 'Record'
export type RecordURI = typeof RecordURI

export const TheseURI = 'These'
export type TheseURI = typeof TheseURI

export const Tuple2URI = 'Tuple2'
export type Tuple2URI = typeof Tuple2URI

export const StoreURI = 'Store'
export type StoreURI = typeof StoreURI

export const WriterURI = 'Writer'
export type WriterURI = typeof WriterURI

export const StateURI = 'State'
export type StateURI = typeof StateURI

export const StateInURI = 'StateIn'
export type StateInURI = typeof StateInURI

export const StateOutURI = 'StateOut'
export type StateOutURI = typeof StateOutURI

export const ZURI = 'Z'
export type ZURI = typeof ZURI

export const SyncURI = 'Sync'
export type SyncURI = typeof SyncURI

export const ZReaderURI = 'ZReader'
export type ZReaderURI = typeof ZReaderURI

export const ZStateURI = 'ZState'
export type ZStateURI = typeof ZStateURI

export const FreeSemiringURI = 'FreeSemiring'
export type FreeSemiringURI = typeof FreeSemiringURI

export const AsyncURI = 'Async'
export type AsyncURI = typeof AsyncURI

export const IOURI = 'IO'
export type IOURI = typeof IOURI

export const ChunkURI = 'Chunk'
export type ChunkURI = typeof ChunkURI

export const RoseTreeURI = 'RoseTree'
export type RoseTreeURI = typeof RoseTreeURI

export const HashMapURI = 'HashMap'
export type HashMapURI = typeof HashMapURI

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [ShowURI]: Show<A>
    [EqURI]: Eq<A>
    [OrdURI]: Ord<A>
    [PredicateURI]: Predicate<A>
    [ArrayURI]: ReadonlyArray<A>
    [ConstURI]: Const<E, A>
    [EitherURI]: Either<E, A>
    [EvalURI]: Eval<A>
    [GuardURI]: Guard<unknown, A>
    [IdentityURI]: Identity<A>
    [IterableURI]: Iterable<A>
    [AsyncIterableURI]: AsyncIterable<A>
    [ListURI]: List<A>
    [MapURI]: ReadonlyMap<K, A>
    [NonEmptyArrayURI]: NonEmptyArray<A>
    [OptionURI]: Option<A>
    [ReaderURI]: Reader<R, A>
    [RecordURI]: ReadonlyRecord<N, A>
    [TheseURI]: These<E, A>
    [Tuple2URI]: Tuple2<A, I>
    [StoreURI]: Store<E, A>
    [WriterURI]: Writer<W, A>
    [StateURI]: State<S, A>
    [SyncURI]: Sync<R, E, A>
    [ZURI]: Z<W, S, S, R, E, A>
    [FreeSemiringURI]: FreeSemiring<X, A>
    [ZReaderURI]: ZReader<R, A>
    [ZStateURI]: ZState<S, A>
    [AsyncURI]: Async<R, E, A>
    [IOURI]: IO<R, E, A>
    [ChunkURI]: Chunk<A>
    [RoseTreeURI]: RoseTree<A>
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
    [HashMapURI]: HashMap<K, A>
  }
  interface URItoIndex<N, K> {
    [ArrayURI]: number
    [MapURI]: K
    [NonEmptyArrayURI]: number
    [RecordURI]: N
    [HashMapURI]: K
    [IterableURI]: number
    [AsyncIterableURI]: number
    [ChunkURI]: number
    [ListURI]: number
  }
}
