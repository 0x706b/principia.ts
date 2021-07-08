// Important notes while writing sinks and combinators:
// - What return values for sinks mean:
//   IO.unit - "need more values"
//   IO.fail([Either.Right(z), l]) - "ended with z and emit leftover l"
//   IO.fail([Either.Left(e), l]) - "failed with e and emit leftover l"
// - Result of processing of the stream using the sink must not depend on how the stream is chunked
//   (chunking-invariance)
//   pipe(stream, run(sink), IO.either) === pipe(stream, chunkN(1), run(sink), IO.either)
// - Sinks should always end when receiving a `None`. It is a defect to not end with some
//   sort of result (even a failure) when receiving a `None`.

import type { Managed } from '../../Managed'
import type { Push } from '../Push'

// - Sinks can assume they will not be pushed again after emitting a value.
export class Sink<R, E, I, L, Z> {
  constructor(readonly push: Managed<R, never, Push<R, E, I, L, Z>>) {}
}
