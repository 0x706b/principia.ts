import { pipe } from '../function'
import * as F from '../Future'
import * as HM from '../HashMap'
import * as I from '../IO'
import * as Ex from '../IO/Exit'
import * as Ma from '../Managed'
import * as M from '../Maybe'
import * as Q from '../Queue'
import * as Ref from '../Ref'
import { tuple } from '../tuple'
import * as S from './core'

export class GroupBy<R, E, K, V, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _K!: () => K
  readonly _V!: () => V
  readonly _A!: () => A

  constructor(
    readonly stream: S.Stream<R, E, A>,
    readonly key: (a: A) => I.IO<R, E, readonly [K, V]>,
    readonly buffer: number
  ) {}

  get grouped(): S.Stream<R, E, readonly [K, Q.Dequeue<Ex.Exit<M.Maybe<E>, V>>]> {
    const self = this
    return S.unwrapManaged(
      Ma.gen(function* (_) {
        const decider = yield* _(F.make<never, (_: readonly [K, V]) => I.UIO<(_: symbol) => boolean>>())
        const out     = yield* _(
          Q.makeBounded<Ex.Exit<M.Maybe<E>, readonly [K, Q.Dequeue<Ex.Exit<M.Maybe<E>, V>>]>>(self.buffer)
        )
        const ref = yield* _(Ref.make<HM.HashMap<K, symbol>>(HM.makeDefault()))
        const add = yield* _(
          pipe(
            self.stream,
            S.mapIO(self.key),
            S.distributedWithDynamic(
              self.buffer,
              (kv) =>
                pipe(
                  decider,
                  F.await,
                  I.chain((decide) => decide(kv))
                ),
              (exit) => Q.offer_(out, exit)
            )
          )
        )
        yield* _(
          pipe(
            decider,
            F.succeed(([k, _]) =>
              pipe(
                Ref.get(ref),
                I.map(HM.get(k)),
                I.chain(
                  M.match(
                    () =>
                      pipe(
                        add,
                        I.chain(([idx, q]) =>
                          pipe(
                            ref,
                            Ref.update(HM.set(k, idx)),
                            I.crossSecond(
                              pipe(
                                out,
                                Q.offer(Ex.succeed(tuple(k, pipe(q, Q.map(Ex.map(([, v]) => v)))))),
                                I.as((_) => _ === idx)
                              )
                            )
                          )
                        )
                      ),
                    (idx) => I.succeed((_) => _ === idx)
                  )
                )
              )
            )
          )
        )
        return pipe(S.fromQueueWithShutdown_(out), S.flattenExitOption)
      })
    )
  }

  apply<R1, E1, A>(f: (k: K, s: S.Stream<unknown, E, V>) => S.Stream<R1, E1, A>): S.Stream<R & R1, E | E1, A> {
    return pipe(
      this.grouped,
      S.chainPar(
        ([k, q]) => f(k, pipe(S.fromQueueWithShutdown_(q), S.flattenExitOption)),
        Number.MAX_SAFE_INTEGER,
        this.buffer
      )
    )
  }
}

export class GroupByFilter<R, E, K, V, A> extends GroupBy<R, E, K, V, A> {
  constructor(readonly groupBy: GroupBy<R, E, K, V, A>, readonly f: (k: K) => boolean) {
    super(groupBy.stream, groupBy.key, groupBy.buffer)
  }

  get grouped() {
    return pipe(
      super.grouped,
      S.filterIO(([k, q]) => (this.f(k) ? I.succeed(true) : pipe(Q.shutdown(q), I.as(false))))
    )
  }
}

export function groupBy_<R, E, A, R1, E1, K, V>(
  stream: S.Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): GroupBy<R & R1, E | E1, K, V, A> {
  return new GroupBy<R & R1, E | E1, K, V, A>(stream, f, buffer)
}

export function groupBy<A, R1, E1, K, V>(
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): <R, E>(stream: S.Stream<R, E, A>) => GroupBy<R & R1, E | E1, K, V, A> {
  return (stream) => groupBy_(stream, f, buffer)
}

export function groupByKey_<R, E, A, K>(
  stream: S.Stream<R, E, A>,
  f: (a: A) => K,
  buffer = 16
): GroupBy<R, E, K, A, A> {
  return groupBy_(stream, (a) => I.succeed([f(a), a]), buffer)
}

export function groupByKey<A, K>(
  f: (a: A) => K,
  buffer = 16
): <R, E>(stream: S.Stream<R, E, A>) => GroupBy<R, E, K, A, A> {
  return (stream) => groupByKey_(stream, f, buffer)
}

export function filter_<R, E, K, V, A>(gb: GroupBy<R, E, K, V, A>, f: (k: K) => boolean): GroupBy<R, E, K, V, A> {
  return new GroupByFilter(gb, f)
}

export function filter<K>(f: (k: K) => boolean): <R, E, V, A>(gb: GroupBy<R, E, K, V, A>) => GroupBy<R, E, K, V, A> {
  return (gb) => filter_(gb, f)
}

export class GroupByFirst<R, E, K, V, A> extends GroupBy<R, E, K, V, A> {
  constructor(readonly groupBy: GroupBy<R, E, K, V, A>, readonly n: number) {
    super(groupBy.stream, groupBy.key, groupBy.buffer)
  }
  get grouped() {
    return pipe(
      super.grouped,
      S.zipWithIndex,
      S.filterIO(([[_, q], i]) => {
        if (i < this.n) {
          return I.succeed(true)
        } else {
          return pipe(Q.shutdown(q), I.as(false))
        }
      }),
      S.map(([kq]) => kq)
    )
  }
}

export function first_<R, E, K, V, A>(gb: GroupBy<R, E, K, V, A>, n: number): GroupBy<R, E, K, V, A> {
  return new GroupByFirst(gb, n)
}

export function first(n: number): <R, E, K, V, A>(gb: GroupBy<R, E, K, V, A>) => GroupBy<R, E, K, V, A> {
  return (gb) => first_(gb, n)
}

export function merge_<R, E, K, V, A, R1, E1, A1>(
  gb: GroupBy<R, E, K, V, A>,
  f: (k: K, s: S.Stream<unknown, E, V>) => S.Stream<R1, E1, A1>
): S.Stream<R & R1, E | E1, A1> {
  return gb.apply(f)
}

export function merge<E, K, V, A, R1, E1, A1>(
  f: (k: K, s: S.Stream<unknown, E, V>) => S.Stream<R1, E1, A1>
): <R>(gb: GroupBy<R, E, K, V, A>) => S.Stream<R & R1, E | E1, A1> {
  return (gb) => gb.apply(f)
}
