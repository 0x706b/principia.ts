import type * as C from '@principia/base/Chunk'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Clock } from '@principia/base/IO/Clock'

declare module '@principia/base/IO/experimental/Sink' {
  export interface Sink<R, InErr, In, OutErr, L, Z> {
    /**
     * @rewrite chain_ from "@principia/base/IO/experimental/Sink"
     */
    chain<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1>
    /**
     * @rewrite contramap_ from "@principia/base/IO/experimental/Sink"
     */
    contramap<R, InErr, In, OutErr, L, Z, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (_: In1) => In
    ): Sink<R, InErr, In1, OutErr, L, Z>
    /**
     * @rewrite contramapChunks_ from "@principia/base/IO/experimental/Sink"
     */
    contramapChunks<R, InErr, In, OutErr, L, Z, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (chunk: C.Chunk<In1>) => C.Chunk<In>
    ): Sink<R, InErr, In1, OutErr, L, Z>
    /**
     * @rewrite contramapChunksIO_ from "@principia/base/IO/experimental/Sink"
     */
    contramapChunksIO<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z>
    /**
     * @rewrite contramapIO_ from "@principia/base/IO/experimental/Sink"
     */
    contramapIO<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (_: In1) => I.IO<R1, InErr1, In>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr, L, Z>
    /**
     * @rewrite crossSecond_ from "@principia/base/IO/experimental/Sink"
     */
    crossSecond<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
    ): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L1, Z1>
    /**
     * @rewrite crossWith_ from "@principia/base/IO/experimental/Sink"
     */
    crossWith_<R, InErr, In, OutErr, L extends In1 & L1, Z, R1, InErr1, In1 extends In, OutErr1, L1, Z1, Z2>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      fb: Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
      f: (a: Z, b: Z1) => Z2
    ): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z2>
    /**
     * @rewriteGetter dropLeftover from "@principia/base/IO/experimental/Sink"
     */
    dropLeftover: Sink<R, InErr, In, OutErr, never, Z>
    /**
     * @rewriteGetter exposeLeftover from "@principia/base/IO/experimental/Sink"
     */
    exposeLeftover: Sink<R, InErr, In, OutErr, never, readonly [Z, C.Chunk<L>]>
    /**
     * @rewrite map_ from "@principia/base/IO/experimental/Sink"
     */
    map<R, InErr, In, OutErr, L, Z, Z2>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => Z2
    ): Sink<R, InErr, In, OutErr, L, Z2>
    /**
     * @rewrite mapIO_ from "@principia/base/IO/experimental/Sink"
     */
    mapIO<R, InErr, In, OutErr, L, Z, R1, OutErr1, Z1>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      f: (z: Z) => I.IO<R1, OutErr1, Z1>
    ): Sink<R & R1, InErr, In, OutErr | OutErr1, L, Z1>
    /**
     * @rewrite matchSink_ from "@principia/base/IO/experimental/Sink"
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
     * @rewrite summarized_ from "@principia/base/IO/experimental/Sink"
     */
    summarized<R, InErr, In, OutErr, L, Z, R1, E1, B, C>(
      this: Sink<R, InErr, In, OutErr, L, Z>,
      summary: I.IO<R1, E1, B>,
      f: (b1: B, b2: B) => C
    ): Sink<R & R1, InErr, In, OutErr | E1, L, readonly [Z, C]>
    /**
     * @rewriteGetter timed from "@principia/base/IO/experimental/Sink"
     */
    timed: Sink<R & Has<Clock>, InErr, In, OutErr, L, readonly [Z, number]>
  }
}
