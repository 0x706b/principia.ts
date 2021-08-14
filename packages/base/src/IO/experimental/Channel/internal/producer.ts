import type { UIO } from '../../..'
import type { Cause } from '../../../Cause'

export interface AsyncInputProducer<Err, Elem, Done> {
  emit(el: Elem): UIO<unknown>
  done(a: Done): UIO<unknown>
  error(cause: Cause<Err>): UIO<unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(onError: (cause: Cause<Err>) => A, onElement: (element: Elem) => A, onDone: (done: Done) => A): UIO<A>
}
