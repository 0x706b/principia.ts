import type * as I from '../../IO'

import { pipe } from '../../function'
import * as S from '../core'
import * as GB from '../GroupBy'

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapIOPartitioned_<R, E, A, R1, E1, A1, K>(
  stream: S.Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, A1>,
  keyBy: (a: A) => K,
  buffer = 16
): S.Stream<R & R1, E | E1, A1> {
  return pipe(
    stream,
    GB.groupByKey(keyBy, buffer),
    GB.merge((_, s) => S.mapIO_(s, f))
  )
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapIOPartitioned<A, R1, E1, A1, K>(
  f: (a: A) => I.IO<R1, E1, A1>,
  keyBy: (a: A) => K,
  buffer = 16
): <R, E>(stream: S.Stream<R, E, A>) => S.Stream<R & R1, E | E1, A1> {
  return (stream) => mapIOPartitioned_(stream, f, keyBy, buffer)
}
