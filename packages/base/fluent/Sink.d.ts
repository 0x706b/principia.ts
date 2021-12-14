import type * as C from '@principia/base/Chunk'
import type { Clock } from '@principia/base/Clock'
import type * as Si from '@principia/base/experimental/Sink'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Sink: SinkStaticOps
  export interface Sink<R, InErr, In, OutErr, L, Z> extends Si.Sink<R, InErr, In, OutErr, L, Z> {}
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
  export interface Sink<R, InErr, In, OutErr, L, Z> {
    /**
     * @rewrite chain_ from "@principia/base/Sink"
     */
    chain<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1>
    /**
     * @rewrite contramap_ from "@principia/base/Sink"
     */
    contramap<R, InErr, In, OutErr, L, Z, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (_: In1) => In
    ): Sink<R, InErr, In1, OutErr, L, Z>
    /**
     * @rewrite contramapChunks_ from "@principia/base/Sink"
     */
    contramapChunks<R, InErr, In, OutErr, L, Z, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (chunk: C.Chunk<In1>) => C.Chunk<In>
    ): Sink<R, InErr, In1, OutErr, L, Z>
    /**
     * @rewrite contramapChunksIO_ from "@principia/base/Sink"
     */
    contramapChunksIO<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z>
    /**
     * @rewrite contramapIO_ from "@principia/base/Sink"
     */
    contramapIO<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (_: In1) => I.IO<R1, InErr1, In>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z>
    /**
     * @rewrite crossSecond_ from "@principia/base/Sink"
     */
    crossSecond<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1>
    /**
     * @rewrite crossWith_ from "@principia/base/Sink"
     */
    crossWith_<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1, Z2>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
      f: (a: Z, b: Z1) => Z2
    ): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z2>
    /**
     * @rewriteGetter dropLeftover from "@principia/base/Sink"
     */
    dropLeftover: Sink<R, InErr, In, OutErr, never, Z>
    /**
     * @rewriteGetter exposeLeftover from "@principia/base/Sink"
     */
    exposeLeftover: Sink<R, InErr, In, OutErr, never, readonly [Z, C.Chunk<L>]>
    /**
     * @rewrite map_ from "@principia/base/Sink"
     */
    map<R, InErr, In, OutErr, L, Z, Z2>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => Z2
    ): Sink<R, InErr, In, OutErr, L, Z2>
    /**
     * @rewrite mapIO_ from "@principia/base/Sink"
     */
    mapIO<R, InErr, In, OutErr, L, Z, R1, OutErr1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => I.IO<R1, OutErr1, Z1>
    ): Sink<R & R1, InErr, In, OutErr | OutErr1, L, Z1>
    /**
     * @rewrite matchSink_ from "@principia/base/Sink"
     */
    matchSink<
      R,
      InErr,
      In,
      OutErr,
      L extends In1 & In2 & (L1 | L2),
      Z,
      R1,
      InErr1,
      In1 extends In,
      OutErr1,
      L1,
      Z1,
      R2,
      InErr2,
      In2 extends In,
      OutErr2,
      L2,
      Z2
    >(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      onFailure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
      onSuccess: (z: Z) => Sink<R2, InErr2, In2, OutErr2, L2, Z2>
    ): Sink<R & R1 & R2, InErr & InErr1 & InErr2, In1 & In2, OutErr1 | OutErr2, L1 | L2, Z1 | Z2>
    /**
     * @rewrite summarized_ from "@principia/base/Sink"
     */
    summarized<R, InErr, In, OutErr, L, Z, R1, E1, B, C>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      summary: I.IO<R1, E1, B>,
      f: (b1: B, b2: B) => C
    ): Sink<R & R1, InErr, In, OutErr | E1, L, readonly [Z, C]>
    /**
     * @rewriteGetter timed from "@principia/base/Sink"
     */
    timed: Sink<R & Has<Clock>, InErr, In, OutErr, L, readonly [Z, number]>
  }
}
