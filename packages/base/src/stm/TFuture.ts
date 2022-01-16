import * as E from '../Either'
import { pipe } from '../function'
import * as M from '../Maybe'
import * as NT from '../Newtype'
import * as STM from './STM'
import * as TR from './TRef'

export interface TFuture<E, A> extends NT.Newtype<'@principia/base/stm/TFuture', TR.UTRef<M.Maybe<E.Either<E, A>>>> {}
export const TFuture = <E, A>() => NT.newtype<TFuture<E, A>>()

export function make<E, A>(): STM.USTM<TFuture<E, A>> {
  return pipe(TR.make<M.Maybe<E.Either<E, A>>>(M.nothing()), STM.map(TFuture<E, A>().get))
}

function wait<E, A>(tf: TFuture<E, A>): STM.STM<unknown, E, A> {
  return pipe(TFuture<E, A>().reverseGet(tf), TR.get, STM.filterMapSTM(M.map(STM.fromEither)))
}

export { wait as await }

export function done_<E, A>(tf: TFuture<E, A>, v: E.Either<E, A>): STM.USTM<boolean> {
  return pipe(
    TFuture<E, A>().reverseGet(tf),
    TR.get,
    STM.chain(
      M.match(
        () =>
          pipe(
            TFuture<E, A>().reverseGet(tf),
            TR.set(M.just(v)),
            STM.chain(() => STM.succeed(true))
          ),
        () => STM.succeed(false)
      )
    )
  )
}

export function done<E, A>(v: E.Either<E, A>): (tf: TFuture<E, A>) => STM.USTM<boolean> {
  return (tf) => done_(tf, v)
}

export function fail<E, A>(tf: TFuture<E, A>, e: E): STM.USTM<boolean> {
  return done_(tf, E.left(e))
}

export function poll<E, A>(tf: TFuture<E, A>): STM.USTM<M.Maybe<E.Either<E, A>>> {
  return TR.get(TFuture<E, A>().reverseGet(tf))
}

export function succeed_<E, A>(tf: TFuture<E, A>, a: A): STM.USTM<boolean> {
  return done_(tf, E.right(a))
}

export function succeed<A>(a: A): <E>(tf: TFuture<E, A>) => STM.USTM<boolean> {
  return (tf) => succeed_(tf, a)
}
