import type { Byte } from '@principia/base/Byte'
import type { Conc } from '@principia/base/collection/immutable/Conc'
import type { ReadonlyRecord } from '@principia/base/collection/immutable/Record'
import type * as HKT from '@principia/base/HKT'
import type { FIO, IO, UIO } from '@principia/base/IO'
import type * as http from 'http'
import type { Readable } from 'stream'

import * as Ch from '@principia/base/Channel'
import * as C from '@principia/base/collection/immutable/Conc'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as NT from '@principia/base/Newtype'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import * as SRef from '@principia/base/SRef'
import * as S from '@principia/base/Stream'
import * as NS from '@principia/node/stream'

import { HttpException } from './HttpException'
import * as Status from './StatusCode'

interface CloseEvent {
  readonly _tag: 'Close'
}

interface ErrorEvent {
  readonly _tag: 'Error'
  readonly error: Error
}

interface DrainEvent {
  readonly _tag: 'Drain'
}

interface FinishEvent {
  readonly _tag: 'Finish'
}

interface PipeEvent {
  readonly _tag: 'Pipe'
  readonly src: Readable
}

interface UnpipeEvent {
  readonly _tag: 'Unpipe'
  readonly src: Readable
}

export type ResponseEvent = CloseEvent | DrainEvent | ErrorEvent | FinishEvent | PipeEvent | UnpipeEvent

export interface HttpResponseCompletedF extends HKT.HKT {
  readonly type: HttpResponseCompleted
}

export interface HttpResponseCompleted extends NT.Newtype<'HttpResponseCompleted', void> {}
export const HttpResponseCompleted = NT.newtype<HttpResponseCompletedF>()

export class HttpResponse {
  eventStream: Ma.Managed<unknown, never, S.Stream<unknown, never, ResponseEvent>>

  constructor(readonly ref: SRef.USRef<http.ServerResponse>) {
    this.eventStream = pipe(
      ref.get,
      Ma.fromIO,
      Ma.chain((res) =>
        S.broadcastDynamic_(
          new S.Stream(
            Ch.unwrapManaged(
              Ma.gen(function* ($) {
                const queue   = yield* $(Q.makeUnbounded<ResponseEvent>())
                const done    = yield* $(Ref.make(false))
                const runtime = yield* $(I.runtime<unknown>())
                yield* $(
                  I.succeedLazy(() => {
                    res.on('close', () => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Close' }))
                    })
                    res.on('drain', () => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Drain' }))
                    })
                    res.on('finish', () => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Finish' }))
                    })
                    res.on('error', (error) => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Error', error }))
                    })
                    res.on('pipe', (src) => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Pipe', src }))
                    })
                    res.on('unpipe', (src) => {
                      runtime.unsafeRun(Q.offer_(queue, { _tag: 'Unpipe', src }))
                    })
                  })
                )
                const writer: Ch.Channel<unknown, unknown, unknown, unknown, never, Conc<ResponseEvent>, void> = pipe(
                  Q.take(queue),
                  I.chain((event) => {
                    if (event._tag === 'Close') {
                      return I.apSecond_(done.set(true), I.succeed(Ch.end(undefined)))
                    }
                    return I.succeed(Ch.crossSecond_(Ch.write(C.single(event)), writer))
                  }),
                  Ch.unwrap
                )
                return Ch.unwrap(
                  pipe(
                    done.get,
                    I.map((b) => (b ? Ch.end(undefined) : writer))
                  )
                )
              })
            )
          ),
          1
        )
      )
    )
  }

  access<R, E, A>(f: (res: http.ServerResponse) => IO<R, E, A>): IO<R, E, A> {
    return I.chain_(this.ref.get, f)
  }

  modify<R, E>(f: (res: http.ServerResponse) => IO<R, E, http.ServerResponse>): IO<R, E, void> {
    return SRef.updateIO_(this.ref, f)
  }

  status(s: Status.StatusCode): UIO<void> {
    return SRef.updateIO_(this.ref, (res) =>
      I.succeedLazy(() => {
        res.statusCode = s.code
        return res
      })
    )
  }

  get headers(): UIO<http.OutgoingHttpHeaders> {
    return I.map_(this.ref.get, (res) => res.getHeaders())
  }

  get(name: string): UIO<M.Maybe<http.OutgoingHttpHeader>> {
    return I.map_(this.ref.get, (res) => M.fromNullable(res.getHeaders()[name]))
  }

  set(headers: ReadonlyRecord<string, http.OutgoingHttpHeader>): FIO<HttpException, void> {
    return SRef.updateIO_(this.ref, (res) =>
      I.defer(() => {
        const hs = Object.entries(headers)
        try {
          for (let i = 0; i < hs.length; i++) {
            res.setHeader(hs[i][0], hs[i][1])
          }
          return I.succeed(res)
        } catch (err) {
          return I.fail(
            new HttpException('Failed to set headers', {
              status: Status.InternalServerError,
              originalError: err
            })
          )
        }
      })
    )
  }

  has(name: string): UIO<boolean> {
    return I.map_(this.ref.get, (res) => res.hasHeader(name))
  }

  write(chunk: string | Buffer): FIO<HttpException, void> {
    return I.chain_(this.ref.get, (res) =>
      I.async<unknown, HttpException, void>((cb) => {
        res.write(chunk, (err) => {
          if (err) {
            cb(
              I.fail(
                new HttpException('Failed to write body', {
                  status: Status.InternalServerError,
                  originalError: err
                })
              )
            )
          } else {
            cb(I.unit())
          }
        })
      })
    )
  }

  pipeFrom<R, E>(stream: S.Stream<R, E, Byte>): IO<R, HttpException, void> {
    return pipe(
      this.ref.get,
      I.chain((res) =>
        S.run_(
          stream,
          NS.sinkFromWritable(() => res)
        )
      ),
      I.catchAll((e) =>
        I.fail(
          new HttpException('Failed to write response body', {
            status: Status.InternalServerError,
            originalError: e
          })
        )
      )
    )
  }

  end(): UIO<HttpResponseCompleted> {
    return I.chain_(this.ref.get, (res) =>
      I.succeedLazy(() => {
        return res.end() as any
      })
    )
  }
}
