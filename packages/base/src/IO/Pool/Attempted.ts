import * as Ex from '../Exit'
import * as IO from '../IO'
import * as Ma from '../Managed'

export class Attempted<E, A> {
  constructor(readonly result: Ex.Exit<E, A>, readonly finalizer: IO.UIO<any>) {}
}

export function isFailure<E, A>(attempted: Attempted<E, A>): boolean {
  return Ex.isFailure(attempted.result)
}

export function foreach_<E, A, R, E1>(attempted: Attempted<E, A>, f: (a: A) => IO.IO<R, E1, any>): IO.IO<R, E1, any> {
  return Ex.match_(attempted.result, () => IO.unit(), f)
}

export function toManaged<E, A>(attempted: Attempted<E, A>): Ma.Managed<unknown, E, A> {
  return IO.toManaged_(IO.fromExit(attempted.result))
}
