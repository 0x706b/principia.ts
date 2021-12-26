import * as FR from './FiberRef/core'
import { pipe } from './function'
import * as I from './IO/core'
import * as M from './Maybe'

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 */
export class FiberRefs {
  constructor(private fiberRefLocals: Map<FR.Runtime<any>, any>) {}

  /**
   * Returns a set of each `FiberRef` in this collection.
   */
  get fiberRefs(): ReadonlySet<FR.Runtime<any>> {
    return new Set(this.fiberRefLocals.keys())
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or `None` otherwise.
   */
  get = <A>(fiberRef: FR.Runtime<A>): M.Maybe<A> => {
    if (this.fiberRefLocals.has(fiberRef)) {
      return M.just(this.fiberRefLocals.get(fiberRef))
    }
    return M.nothing()
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or the `initial` value of the `FiberRef` otherwise.
   */
  getOrDefault = <A>(fiberRef: FR.Runtime<A>): A => {
    return pipe(
      this.get(fiberRef),
      M.getOrElse(() => fiberRef.initial)
    )
  }

  /**
   * Sets the value of each `FiberRef` for the fiber running this effect to the
   * value in this collection of `FiberRef` values.
   */
  get setAll(): I.UIO<void> {
    return pipe(
      this.fiberRefs,
      I.foreachUnit((fiberRef) => pipe(fiberRef, FR.set(this.getOrDefault(fiberRef))))
    )
  }
}
