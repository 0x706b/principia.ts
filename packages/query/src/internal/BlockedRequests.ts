import type { Cache } from '../Cache'
import type { DataSource } from '../DataSource'
import type { DataSourceAspect } from '../DataSourceAspect'
import type { Described } from '../Described'
import type { BlockedRequest } from './BlockedRequest'
import type { Sequential } from './Sequential'
import type { List } from '@principia/base/collection/immutable/List'

import * as C from '@principia/base/collection/immutable/Conc'
import * as L from '@principia/base/collection/immutable/List'
import * as Ev from '@principia/base/Eval'
import { identity, pipe } from '@principia/base/function'
import * as HS from '@principia/base/HashSet'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/Ref'

import * as DS from '../DataSource'
import * as Par from './Parallel'

export class Empty {
  readonly _tag = 'Empty'
  readonly _R!: (_: unknown) => void
}

export const empty: BlockedRequests<unknown> = new Empty()

export class Both<R> {
  readonly _tag = 'Both'
  readonly _R!: (_: R) => void

  constructor(readonly left: BlockedRequests<R>, readonly right: BlockedRequests<R>) {}
}

export function both<R, R1>(left: BlockedRequests<R>, right: BlockedRequests<R1>): BlockedRequests<R & R1> {
  return new Both<R & R1>(left, right)
}

export class Single<R, A> {
  readonly _tag = 'Single'

  readonly _R!: (_: R) => void
  readonly _A!: () => A

  constructor(readonly dataSource: DataSource<R, A>, readonly blockedRequest: BlockedRequest<A>) {}
}

export function single<R, A>(dataSource: DataSource<R, A>, blockedRequest: BlockedRequest<A>): BlockedRequests<R> {
  return new Single(dataSource, blockedRequest)
}

export class Then<R> {
  readonly _tag = 'Then'

  readonly _R!: (_: R) => void

  constructor(readonly left: BlockedRequests<R>, readonly right: BlockedRequests<R>) {}
}

export function then<R, R1>(left: BlockedRequests<R>, right: BlockedRequests<R1>): BlockedRequests<R & R1> {
  return new Then<R & R1>(left, right)
}

export type BlockedRequests<R> = Empty | Both<R> | Then<R> | Single<R, any>

export function mapDataSources<R, R1>(br: BlockedRequests<R>, f: DataSourceAspect<R1>): BlockedRequests<R & R1> {
  const go = (br: BlockedRequests<R>, f: DataSourceAspect<R1>): Ev.Eval<BlockedRequests<R & R1>> =>
    Ev.gen(function* (_) {
      switch (br._tag) {
        case 'Empty': {
          return empty
        }
        case 'Both': {
          return both(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Then': {
          return then(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Single': {
          return single(f.apply(br.dataSource), br.blockedRequest)
        }
      }
    })

  return Ev.run(go(br, f))
}

export function gives_<R, R0>(br: BlockedRequests<R>, f: Described<(r0: R0) => R>): BlockedRequests<R0> {
  const go = (br: BlockedRequests<R>, f: Described<(r0: R0) => R>): Ev.Eval<BlockedRequests<R0>> =>
    Ev.gen(function* (_) {
      switch (br._tag) {
        case 'Empty': {
          return empty
        }
        case 'Both': {
          return both(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Then': {
          return then(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Single': {
          return single(DS.gives_(br.dataSource, f), br.blockedRequest)
        }
      }
    })

  return Ev.run(go(br, f))
}

export function run_<R>(br: BlockedRequests<R>, cache: Cache): I.IO<R, never, void> {
  return I.defer(() =>
    pipe(
      flatten(br),
      I.foreachUnit((requestsByDataSource) =>
        I.foreachUnitC_(requestsByDataSource.toIterable, ([dataSource, sequential]) =>
          I.gen(function* (_) {
            const completedRequests = yield* _(
              dataSource.runAll(
                C.map_(
                  sequential,
                  C.map((r) => r.request)
                )
              )
            )

            const blockedRequests = pipe(sequential, C.chain(identity))

            let leftovers = completedRequests.requests
            for (const r of C.map_(blockedRequests, (br) => br.request)) {
              leftovers = HS.remove_(leftovers, r)
            }

            yield* _(I.foreachUnit_(blockedRequests, (br) => br.result.set(completedRequests.lookup(br.request))))

            yield* _(
              I.foreachUnit_(leftovers, (r) =>
                pipe(
                  Ref.make(completedRequests.lookup(r)),
                  I.chain((ref) => cache.put(r, ref))
                )
              )
            )
          })
        )
      )
    )
  )
}

function flatten<R>(blockedRequests: BlockedRequests<R>): List<Sequential<R>> {
  const go = <R>(brs: List<BlockedRequests<R>>, flattened: List<Sequential<R>>): Ev.Eval<List<Sequential<R>>> =>
    Ev.gen(function* (_) {
      const [parallel, sequential] = L.foldl_(
        brs,
        [Par.empty<R>(), L.nil<BlockedRequests<R>>()] as const,
        ([parallel, sequential], blockedRequest) => {
          const [par, seq] = step(blockedRequest)
          return [parallel['++'](par), L.concat_(sequential, seq)] as const
        }
      )

      const updated = merge(flattened, parallel)
      if (L.isEmpty(sequential)) {
        return L.reverse(updated)
      } else {
        return yield* _(go(sequential, updated))
      }
    })

  return Ev.run(go(L.cons(blockedRequests), L.nil()))
}

function step<R>(c: BlockedRequests<R>): readonly [Par.Parallel<R>, List<BlockedRequests<R>>] {
  const go = <R>(
    blockedRequests: BlockedRequests<R>,
    stack: List<BlockedRequests<R>>,
    parallel: Par.Parallel<R>,
    sequential: List<BlockedRequests<R>>
  ): Ev.Eval<readonly [Par.Parallel<R>, List<BlockedRequests<R>>]> =>
    Ev.gen(function* (_) {
      switch (blockedRequests._tag) {
        case 'Empty': {
          if (L.isEmpty(stack)) {
            return [parallel, sequential]
          } else {
            return yield* _(go(L.unsafeHead(stack) as BlockedRequests<R>, L.unsafeTail(stack), parallel, sequential))
          }
        }
        case 'Then': {
          switch (blockedRequests.left._tag) {
            case 'Empty': {
              return yield* _(go(blockedRequests.left, stack, parallel, sequential))
            }
            case 'Then': {
              return yield* _(
                go(
                  then(blockedRequests.left.left, then(blockedRequests.left.right, blockedRequests.right)),
                  stack,
                  parallel,
                  sequential
                )
              )
            }
            case 'Both': {
              return yield* _(
                go(
                  both(
                    then(blockedRequests.left.left, blockedRequests.right),
                    then(blockedRequests.left.right, blockedRequests.right)
                  ),
                  stack,
                  parallel,
                  sequential
                )
              )
            }
            case 'Single': {
              return yield* _(go(blockedRequests.left, stack, parallel, L.prepend(blockedRequests.right)(sequential)))
            }
          }
        }
        // eslint-disable-next-line no-fallthrough
        case 'Both': {
          return yield* _(go(blockedRequests.left, L.prepend(blockedRequests.right)(stack), parallel, sequential))
        }
        case 'Single': {
          if (L.isEmpty(stack)) {
            return [parallel['++'](Par.from(blockedRequests.dataSource, blockedRequests.blockedRequest)), sequential]
          } else {
            return yield* _(
              go(
                L.unsafeHead(stack) as BlockedRequests<R>,
                L.unsafeTail(stack),
                parallel['++'](Par.from(blockedRequests.dataSource, blockedRequests.blockedRequest)),
                sequential
              )
            )
          }
        }
      }
    })

  return Ev.run(go(c, L.nil(), Par.empty(), L.nil()))
}

const getIterableSize = (it: Iterable<any> | undefined): number => (it ? Array.from(it).length : 0)

function merge<R>(sequential: List<Sequential<R>>, parallel: Par.Parallel<R>): List<Sequential<R>> {
  if (L.isEmpty(sequential)) {
    return L.cons(parallel.sequential)
  } else if (parallel.isEmpty) {
    return sequential
  } else if (getIterableSize(L.unsafeHead(sequential)?.keys) === 1 && getIterableSize(parallel.keys) === 1) {
    return pipe(
      L.unsafeHead(sequential) as Sequential<R>,
      (s) => s['++'](parallel.sequential),
      (s) => L.prepend(s)(L.unsafeTail(sequential))
    )
  } else {
    return L.prepend(parallel.sequential)(sequential)
  }
}
