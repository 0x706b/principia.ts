import type { IO } from '../../FiberRef/internal/io'
import type { Has, Tag } from '../../Has'
import type { IOState } from '../../IOState'

import * as I from '../core'

/**
 * Gets a state from the environment.
 */
export function getState<S>(tag: Tag<IOState<S>>): IO<Has<IOState<S>>, never, S> {
  return I.serviceWith(tag)((state) => state.get)
}

/**
 * Gets a state from the environment and uses it to run the specified
 * function.
 */
export function getStateWith<S>(tag: Tag<IOState<S>>): <A>(f: (s: S) => A) => IO<Has<IOState<S>>, never, A> {
  return (f) => I.serviceWith(tag)((state) => state.get['<$>'](f))
}

/**
 * Sets a state in the environment to the specified value.
 */
export function setState<S>(tag: Tag<IOState<S>>): (s: S) => IO<Has<IOState<S>>, never, void> {
  return (s) => I.serviceWith(tag)((state) => state.set(s))
}

/**
 * Updates a state in the environment with the specified function.
 */
export function updateState<S>(tag: Tag<IOState<S>>): (f: (s: S) => S) => IO<Has<IOState<S>>, never, void> {
  return (f) => I.serviceWith(tag)((state) => state.update(f))
}
