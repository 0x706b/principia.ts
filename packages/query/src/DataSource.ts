import type { DataSourceAspect } from './DataSourceAspect'
import type { AnyRequest, Request } from './Request'
import type { Chunk } from '@principia/base/Chunk'
import type * as O from '@principia/base/Option'
import type { _A, _E } from '@principia/base/prelude'

import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import { IllegalArgumentError } from '@principia/base/Error'
import { flow, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import { not } from '@principia/base/Predicate'
import * as St from '@principia/base/Structural'
import { tuple } from '@principia/base/tuple'
import { isObject } from '@principia/base/util/predicates'

import { CompletedRequestMap } from './CompletedRequestMap'
import { Described } from './Described'

export const DataSourceTypeId = Symbol('@principia/query/DataSource')
export type DataSourceTypeId = typeof DataSourceTypeId

const baseHash = St.hashString('@principia/query/DataSource')

export class DataSource<R, A> implements St.Equatable, St.Hashable {
  readonly [DataSourceTypeId]: DataSourceTypeId = DataSourceTypeId

  constructor(
    readonly identifier: string,
    readonly runAll: (requests: Chunk<Chunk<A>>) => I.IO<R, never, CompletedRequestMap>
  ) {}

  [St.$equals](that: unknown): boolean {
    return isDataSource(that) && this.identifier === that.identifier
  }

  get [St.$hash]() {
    return St.combineHash(baseHash, St.hashString(this.identifier))
  }
}

export function isDataSource(u: unknown): u is DataSource<unknown, unknown> {
  return isObject(u) && DataSourceTypeId in u
}

export function batchN_<R, A>(dataSource: DataSource<R, A>, n: number): DataSource<R, A> {
  return new DataSource(`${dataSource.identifier}.batchN(${n})`, (requests) =>
    n < 1
      ? I.halt(new IllegalArgumentError('batchN: n must be at least one', 'DataSource.batchN'))
      : dataSource.runAll(C.foldl_(requests, C.empty(), (b, a) => C.concat_(b, C.chunksOf_(a, n))))
  )
}

export function contramapIO_<R, A, R1, B>(
  dataSource: DataSource<R, A>,
  f: Described<(b: B) => I.IO<R1, never, A>>
): DataSource<R & R1, B> {
  return new DataSource(
    `${dataSource.identifier}.contramapM(${f.description})`,
    flow(I.foreach(I.foreachPar(f.value)), I.chain(dataSource.runAll))
  )
}

export function eitherWith_<R, A, R1, B, C>(
  ds1: DataSource<R, A>,
  ds2: DataSource<R1, B>,
  f: Described<(c: C) => E.Either<A, B>>
): DataSource<R & R1, C> {
  return new DataSource(
    `${ds1.identifier}.eitherWith(${ds2.identifier}, ${f.description})`,
    flow(
      I.foreach((rs) => {
        const [left, right] = C.partitionMap_(rs, f.value)
        return pipe(
          ds1.runAll(C.single(left)),
          I.crossWithPar(ds2.runAll(C.single(right)), (a, b) => a.concat(b))
        )
      }),
      I.map(C.foldl(CompletedRequestMap.empty(), (b, a) => b.concat(a)))
    )
  )
}

export function equals(ds1: DataSource<any, any>, ds2: DataSource<any, any>): boolean {
  return ds1.identifier === ds2.identifier
}

export function gives_<R, A, R0>(ds: DataSource<R, A>, f: Described<(r0: R0) => R>): DataSource<R0, A> {
  return new DataSource(`${ds.identifier}.giveSome(${f.description})`, flow(ds.runAll, I.gives(f.value)))
}

export function giveAll_<R, A>(ds: DataSource<R, A>, r: Described<R>): DataSource<unknown, A> {
  return gives_(
    ds,
    Described((_) => r.value, `(_) => ${r.description}`)
  )
}

export function race_<R, A, R1, A1 extends A>(ds1: DataSource<R, A>, ds2: DataSource<R1, A1>): DataSource<R & R1, A1> {
  return new DataSource(`${ds1.identifier}.race(${ds2.identifier})`, (requests) =>
    pipe(ds1.runAll(requests), I.race(ds2.runAll(requests)))
  )
}

export class Batched<R, A> extends DataSource<R, A> {
  constructor(readonly identifier: string, readonly run: (requests: Chunk<A>) => I.IO<R, never, CompletedRequestMap>) {
    super(
      identifier,
      I.foldl(CompletedRequestMap.empty(), (m, r) => {
        const newRequests = C.filter_(r, not(m.contains))
        if (C.isEmpty(newRequests)) {
          return I.succeed(m)
        } else {
          return pipe(
            this.run(newRequests),
            I.map((_) => m.concat(_))
          )
        }
      })
    )
  }
}

export function makeBatched<R, A>(
  name: string,
  f: (requests: Chunk<A>) => I.IO<R, never, CompletedRequestMap>
): Batched<R, A> {
  return new Batched(name, f)
}

export function fromFunction<A extends Request<never, any>>(name: string, f: (a: A) => _A<A>): DataSource<unknown, A> {
  return new Batched<unknown, A>(
    name,
    flow(
      C.foldl(CompletedRequestMap.empty(), (m, k) => m.insert(k, E.right(f(k)))),
      I.succeed
    )
  )
}

export function fromFunctionIOBatched<R, A extends AnyRequest>(
  name: string,
  f: (a: Chunk<A>) => I.IO<R, _E<A>, Chunk<_A<A>>>
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: Chunk<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): Chunk<readonly [A, E.Either<_E<A>, _A<A>>]> => C.map_(requests, (_) => tuple(_, E.left(e))),
        (bs): Chunk<readonly [A, E.Either<_E<A>, _A<A>>]> => C.zip_(requests, C.map_(bs, E.right))
      ),
      I.map(C.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionBatched<A extends Request<never, any>>(
  name: string,
  f: (a: Chunk<A>) => Chunk<_A<A>>
): DataSource<unknown, A> {
  return fromFunctionIOBatched(name, flow(f, I.succeed))
}

export function fromFunctionIOBatchedOption<R, A extends AnyRequest>(
  name: string,
  f: (a: Chunk<A>) => I.IO<R, _E<A>, Chunk<O.Option<_A<A>>>>
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: Chunk<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): Chunk<readonly [A, E.Either<_E<A>, O.Option<_A<A>>>]> => C.map_(requests, (a) => tuple(a, E.left(e))),
        (bs): Chunk<readonly [A, E.Either<_E<A>, O.Option<_A<A>>>]> => C.zip_(requests, C.map_(bs, E.right))
      ),
      I.map(C.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
    )
  )
}

export function fromFunctionBatchedOption<A extends Request<never, any>>(
  name: string,
  f: (a: Chunk<A>) => Chunk<O.Option<_A<A>>>
): DataSource<unknown, A> {
  return fromFunctionIOBatchedOption(name, flow(f, I.succeed))
}

export function fromFunctionIOBatchedWith<R, A extends AnyRequest>(
  name: string,
  f: (a: Chunk<A>) => I.IO<R, _E<A>, Chunk<_A<A>>>,
  g: (b: _A<A>) => A
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: Chunk<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): Chunk<readonly [A, E.Either<_E<A>, _A<A>>]> => C.map_(requests, (a) => tuple(a, E.left(e))),
        (bs): Chunk<readonly [A, E.Either<_E<A>, _A<A>>]> => C.map_(bs, (b) => tuple(g(b), E.right(b)))
      ),
      I.map(C.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionBatchedWith<A extends Request<never, any>>(
  name: string,
  f: (a: Chunk<A>) => Chunk<_A<A>>,
  g: (b: _A<A>) => A
): DataSource<unknown, A> {
  return fromFunctionIOBatchedWith(name, flow(f, I.succeed), g)
}

export function fromFunctionIO<R, A extends AnyRequest>(
  name: string,
  f: (a: A) => I.IO<R, _E<A>, _A<A>>
): DataSource<R, A> {
  return new Batched<R, A>(
    name,
    flow(
      I.foreachPar((a) =>
        pipe(
          f(a),
          I.either,
          I.map((r) => tuple(a, r))
        )
      ),
      I.map(C.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionIOOption<R, A extends AnyRequest>(
  name: string,
  f: (a: A) => I.IO<R, _E<A>, O.Option<_A<A>>>
): DataSource<R, A> {
  return new Batched<R, A>(
    name,
    flow(
      I.foreachPar((a) =>
        pipe(
          f(a),
          I.either,
          I.map((r) => tuple(a, r))
        )
      ),
      I.map(C.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
    )
  )
}

export function fromFunctionOption<A extends Request<never, any>>(
  name: string,
  f: (a: A) => O.Option<_A<A>>
): DataSource<unknown, A> {
  return fromFunctionIOOption(name, flow(f, I.succeed))
}

export function applyAspect_<R, A, R1>(
  dataSource: DataSource<R, A>,
  aspect: DataSourceAspect<R1>
): DataSource<R & R1, A> {
  return aspect.apply(dataSource)
}

export const never: DataSource<unknown, any> = new DataSource('never', () => I.never)
