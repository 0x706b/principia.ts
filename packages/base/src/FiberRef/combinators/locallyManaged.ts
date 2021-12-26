import * as E from '../../Either'
import { pipe } from '../../function'
import * as I from '../../IO/core'
import * as Ma from '../../Managed/core'
import { matchTag_ } from '../../prelude'
import * as FR from '../core'

export function locallyManaged_<EA, EB, A, B>(
  fiberRef: FR.FiberRef<EA, EB, A, B>,
  a: A
): Ma.Managed<unknown, EA, void> {
  FR.concrete(fiberRef)
  return matchTag_(fiberRef, {
    Runtime: (ref: FR.Runtime<A>) =>
      pipe(
        ref.get,
        I.chain((old) => pipe(ref.set(a), I.as(old))),
        Ma.bracket((a) => ref.set(a)),
        Ma.asUnit
      ),
    Derived: (ref) =>
      pipe(
        ref.use((value, _, setEither) =>
          pipe(
            value.get,
            I.chain((old) =>
              pipe(
                setEither(a),
                E.match(I.fail, (s) => pipe(value.set(s), I.as(old)))
              )
            ),
            Ma.bracket((s) => value.set(s))
          )
        ),
        Ma.asUnit
      ),
    DerivedAll: (ref) =>
      pipe(
        ref.use((value, _, setEither) =>
          pipe(
            value.get,
            I.chain((old) =>
              pipe(
                setEither(a)(old),
                E.match(I.fail, (s) => pipe(value.set(s), I.as(old)))
              )
            ),
            Ma.bracket((s) => value.set(s))
          )
        ),
        Ma.asUnit
      )
  })
}

export function locallyManaged<A>(
  value: A
): <EA, EB, B>(fiberRef: FR.FiberRef<EA, EB, A, B>) => Ma.Managed<unknown, EA, void> {
  return (fiberRef) => locallyManaged_(fiberRef, value)
}
