import type * as C from '@principia/base/Chunk'
import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type * as Si from '@principia/base/Sink'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Sink: SinkStaticOps
  export interface Sink<R, E, In, L, Z> extends Si.Sink<R, E, In, L, Z> {}
}

interface SinkStaticOps {
  /**
   * @rewriteStatic collectAll from "@principia/base/Sink"
   */
  collectAll: typeof Si.collectAll
  /**
   * @rewriteStatic drain from "@principia/base/Sink"
   */
  drain: typeof Si.drain
  /**
   * @rewriteStatic fail from "@principia/base/Sink"
   */
  fail: typeof Si.fail
  /**
   * @rewriteStatic failLazy from "@principia/base/Sink"
   */
  failLazy: typeof Si.failLazy
  /**
   * @rewriteStatic fold from "@principia/base/Sink"
   */
  fold: typeof Si.fold
  /**
   * @rewriteStatic foldChunks from "@principia/base/Sink"
   */
  foldChunks: typeof Si.foldChunks
  /**
   * @rewriteStatic foldChunksIO from "@principia/base/Sink"
   */
  foldChunksIO: typeof Si.foldChunksIO
  /**
   * @rewriteStatic foldIO from "@principia/base/Sink"
   */
  foldIO: typeof Si.foldIO
  /**
   * @rewriteStatic foldUntil from "@principia/base/Sink"
   */
  foldUntil: typeof Si.foldUntil
  /**
   * @rewriteStatic foldUntilIO from "@principia/base/Sink"
   */
  foldUntilIO: typeof Si.foldUntilIO
  /**
   * @rewriteStatic foldWeighted from "@principia/base/Sink"
   */
  foldWeighted: typeof Si.foldWeighted
  /**
   * @rewriteStatic foldWeightedDecompose from "@principia/base/Sink"
   */
  foldWeightedDecompose: typeof Si.foldWeightedDecompose
  /**
   * @rewriteStatic foldWeightedDecomposeIO from "@principia/base/Sink"
   */
  foldWeightedDecomposeIO: typeof Si.foldWeightedDecomposeIO
  /**
   * @rewriteStatic foldWeightedIO from "@principia/base/Sink"
   */
  foldWeightedIO: typeof Si.foldWeightedIO
  /**
   * @rewriteStatic foldl from "@principia/base/Sink"
   */
  foldl: typeof Si.foldl
  /**
   * @rewriteStatic foldlChunks from "@principia/base/Sink"
   */
  foldlChunks: typeof Si.foldlChunks
  /**
   * @rewriteStatic foldlChunksIO from "@principia/base/Sink"
   */
  foldlChunksIO: typeof Si.foldlChunksIO
  /**
   * @rewriteStatic foldlIO from "@principia/base/Sink"
   */
  foldlIO: typeof Si.foldlIO
  /**
   * @rewriteStatic foreach from "@principia/base/Sink"
   */
  foreach: typeof Si.foreach
  /**
   * @rewriteStatic foreachChunk from "@principia/base/Sink"
   */
  foreachChunk: typeof Si.foreachChunk
  /**
   * @rewriteStatic foreachChunkWhile from "@principia/base/Sink"
   */
  foreachChunkWhile: typeof Si.foreachChunkWhile
  /**
   * @rewriteStatic foreachWhile from "@principia/base/Sink"
   */
  foreachWhile: typeof Si.foreachWhile
  /**
   * @rewriteStatic fromIO from "@principia/base/Sink"
   */
  fromIO: typeof Si.fromIO
  /**
   * @rewriteStatic head from "@principia/base/Sink"
   */
  head: typeof Si.head
  /**
   * @rewriteStatic last from "@principia/base/Sink"
   */
  last: typeof Si.last
  /**
   * @rewriteStatic leftover from "@principia/base/Sink"
   */
  leftover: typeof Si.leftover
  /**
   * @rewriteStatic managed_ from "@principia/base/Sink"
   */
  managed: typeof Si.managed_
  /**
   * @rewriteStatic succeed from "@principia/base/Sink"
   */
  succeed: typeof Si.succeed
  /**
   * @rewriteStatic succeedLazy from "@principia/base/Sink"
   */
  succeedLazy: typeof Si.succeedLazy
  /**
   * @rewriteStatic take from "@principia/base/Sink"
   */
  take: typeof Si.take
}

declare module '@principia/base/Sink/core' {
  export interface Sink<R, E, In, L, Z> {
    /**
     * @rewrite apSecond_ from "@principia/base/Sink"
     */
    apSecond<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1>(
      this: Sink<R, E, In, L, Z>,
      fb: Sink<R1, E1, In1, L1, Z1>
    ): Sink<R & R1, E | E1, In1, L1, Z1>
    /**
     * @rewrite chain_ from "@principia/base/Sink"
     */
    chain<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1>(
      this: Sink<R, E, In, L, Z>,
      f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
    ): Sink<R & R1, E | E1, In1, L1, Z1>
    /**
     * @rewrite contramap_ from "@principia/base/Sink"
     */
    contramap<R, E, In, L, Z, In1>(this: Sink<R, E, In, L, Z>, f: (_: In1) => In): Sink<R, E, In1, L, Z>
    /**
     * @rewrite contramapChunks_ from "@principia/base/Sink"
     */
    contramapChunks<R, E, In, L, Z, In1>(
      this: Sink<R, E, In, L, Z>,
      f: (chunk: C.Chunk<In1>) => C.Chunk<In>
    ): Sink<R, E, In1, L, Z>
    /**
     * @rewrite contramapChunksIO_ from "@principia/base/Sink"
     */
    contramapChunksIO<R, E, In, L, Z, R1, E1, In1>(
      this: Sink<R, E, In, L, Z>,
      f: (chunk: C.Chunk<In1>) => I.IO<R1, E1, C.Chunk<In>>
    ): Sink<R & R1, E | E1, In1, L, Z>
    /**
     * @rewrite contramapIO_ from "@principia/base/Sink"
     */
    contramapIO<R, E, In, L, Z, R1, E1, In1>(
      this: Sink<R, E, In, L, Z>,
      f: (_: In1) => I.IO<R1, E1, In>
    ): Sink<R & R1, E | E1, In1, L, Z>
    /**
     * @rewrite crossWith_ from "@principia/base/Sink"
     */
    crossWith<R, E, In, L extends In1 & L1, Z, R1, E1, In1 extends In, L1, Z1, Z2>(
      this: Sink<R, E, In, L, Z>,
      fb: Sink<R1, E1, In1, L1, Z1>,
      f: (a: Z, b: Z1) => Z2
    ): Sink<R & R1, E | E1, In & In1, L1, Z2>
    /**
     * @rewriteGetter dropLeftover from "@principia/base/Sink"
     */
    dropLeftover: Sink<R, E, In, never, Z>
    /**
     * @rewriteGetter exposeLeftover from "@principia/base/Sink"
     */
    exposeLeftover: Sink<R, E, In, never, readonly [Z, C.Chunk<L>]>
    /**
     * @rewrite map_ from "@principia/base/Sink"
     */
    map<R, E, In, L, Z, Z2>(this: Sink<R, E, In, L, Z>, f: (z: Z) => Z2): Sink<R, E, In, L, Z2>
    /**
     * @rewrite mapIO_ from "@principia/base/Sink"
     */
    mapIO<R, E, In, L, Z, R1, E1, Z1>(
      this: Sink<R, E, In, L, Z>,
      f: (z: Z) => I.IO<R1, E1, Z1>
    ): Sink<R & R1, E | E1, In, L, Z1>
    /**
     * @rewrite matchSink_ from "@principia/base/Sink"
     */
    matchSink<
      R,
      E,
      In,
      L extends In1 & In2 & (L1 | L2),
      Z,
      R1,
      E1,
      In1 extends In,
      L1,
      Z1,
      R2,
      E2,
      In2 extends In,
      L2,
      Z2
    >(
      this: Sink<R, E, In, L, Z>,
      onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>,
      onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
    ): Sink<R & R1 & R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
    /**
     * @rewrite summarized_ from "@principia/base/Sink"
     */
    summarized<R, E, In, L, Z, R1, E1, B, C>(
      this: Sink<R, E, In, L, Z>,
      summary: I.IO<R1, E1, B>,
      f: (b1: B, b2: B) => C
    ): Sink<R & R1, E | E1, In, L, readonly [Z, C]>
    /**
     * @rewriteGetter timed from "@principia/base/Sink"
     */
    timed: Sink<R & Has<Clock>, E, In, L, readonly [Z, number]>
  }
}
