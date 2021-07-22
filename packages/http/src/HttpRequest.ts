import type { HttpMethod } from './utils'
import type { Byte } from '@principia/base/Byte'
import type { Chunk } from '@principia/base/Chunk'
import type { FIO, IO, UIO } from '@principia/base/IO'
import type * as http from 'http'
import type { Socket } from 'net'

import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Iter from '@principia/base/Iterable'
import * as M from '@principia/base/Managed'
import * as O from '@principia/base/Option'
import * as Q from '@principia/base/Queue'
import * as R from '@principia/base/Record'
import * as Ref from '@principia/base/Ref'
import { Semigroup } from '@principia/base/Semigroup'
import * as S from '@principia/base/Stream'
import * as Pull from '@principia/base/Stream/Pull'
import * as Str from '@principia/base/string'
import * as Sy from '@principia/base/Sync'
import * as Th from '@principia/base/These'
import * as NS from '@principia/node/stream'
import { TLSSocket } from 'tls'
import * as Url from 'url'

import { HttpException } from './HttpException'
import * as Status from './StatusCode'
import { decodeCharset, parseContentType } from './utils'

interface CloseEvent {
  readonly _tag: 'Close'
}

interface DataEvent {
  readonly _tag: 'Data'
  readonly chunk: Buffer
}

interface EndEvent {
  readonly _tag: 'End'
}

interface ErrorEvent {
  readonly _tag: 'Error'
  readonly error: Error
}

interface PauseEvent {
  readonly _tag: 'Pause'
}

interface ReadableEvent {
  readonly _tag: 'Readble'
}

interface ResumeEvent {
  readonly _tag: 'Resume'
}

export type RequestEvent = CloseEvent | DataEvent | EndEvent | ErrorEvent | PauseEvent | ReadableEvent | ResumeEvent

export class HttpRequest {
  private memoizedUrl: E.Either<HttpException, O.Option<Url.URL>> = E.right(O.none())

  eventStream: M.Managed<unknown, never, I.UIO<S.Stream<unknown, never, RequestEvent>>>

  constructor(readonly ref: Ref.URef<http.IncomingMessage>) {
    this.eventStream = pipe(
      ref.get,
      M.fromIO,
      M.chain((req) =>
        S.broadcastDynamic_(
          new S.Stream(
            M.gen(function* (_) {
              const queue   = yield* _(Q.makeUnbounded<RequestEvent>())
              const done    = yield* _(Ref.make(false))
              const runtime = yield* _(I.runtime<unknown>())
              yield* _(
                I.succeedLazy(() => {
                  req.on('close', () => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Close' }))
                  })
                  req.on('data', (chunk) => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Data', chunk }))
                  })
                  req.on('end', () => {
                    runtime.run_(Q.offer_(queue, { _tag: 'End' }))
                  })
                  req.on('pause', () => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Pause' }))
                  })
                  req.on('error', (error) => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Error', error }))
                  })
                  req.on('readable', () => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Readble' }))
                  })
                  req.on('resume', () => {
                    runtime.run_(Q.offer_(queue, { _tag: 'Resume' }))
                  })
                })
              )
              return I.chain_(done.get, (b) =>
                b
                  ? Pull.end
                  : I.chain_(Q.take(queue), (event): I.UIO<Chunk<RequestEvent>> => {
                      if (event._tag === 'Close') {
                        return I.crossSecond_(done.set(true), Pull.emit(event))
                      }
                      return Pull.emit(event)
                    })
              )
            })
          ),
          1
        )
      )
    )
  }

  access<R, E, A>(f: (req: http.IncomingMessage) => IO<R, E, A>): IO<R, E, A> {
    return I.chain_(this.ref.get, f)
  }

  get headers(): UIO<http.IncomingHttpHeaders> {
    return I.map_(this.ref.get, (req) => req.headers)
  }

  get method(): UIO<HttpMethod> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.ref.get, (req) => req.method!.toUpperCase() as HttpMethod)
  }

  get urlString(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.ref.get, (req) => req.url!)
  }

  get url(): FIO<HttpException, Url.URL> {
    const self = this
    return pipe(
      this.memoizedUrl,
      E.match(
        I.fail,
        O.match(
          () =>
            I.gen(function* (_) {
              const protocol = yield* _(self.protocol)
              const url      = yield* _(self.urlString)
              const host     = yield* _(
                pipe(
                  self.getHeader('host'),
                  I.chain(
                    O.match(
                      () =>
                        I.fail(
                          new HttpException('Defect: request sent without a host', {
                            status: Status.BadRequest
                          })
                        ),
                      I.succeed
                    )
                  )
                )
              )
              return yield* _(
                pipe(
                  I.try(() => new Url.URL(`${protocol}://${host}${url}`)),
                  I.mapError(
                    (error) =>
                      new HttpException('Error while parsing URL', {
                        status: Status.BadRequest,
                        originalError: error
                      })
                  ),
                  I.tap((url) =>
                    I.succeedLazy(() => {
                      self.memoizedUrl = E.right(O.some(url))
                    })
                  ),
                  I.tapError((ex) =>
                    I.succeedLazy(() => {
                      self.memoizedUrl = E.left(ex)
                    })
                  )
                )
              )
            }),
          I.succeed
        )
      )
    )
  }

  get query(): FIO<HttpException, R.ReadonlyRecord<string, string>> {
    return pipe(
      this.url,
      I.map((url) =>
        R.fromFoldable(
          Semigroup((_: string, y: string) => y),
          Iter.Foldable
        )(url.searchParams)
      )
    )
  }

  getHeader(name: 'set-cookie'): UIO<O.Option<ReadonlyArray<string>>>
  getHeader(name: string): UIO<O.Option<string>>
  getHeader(name: string): UIO<O.Option<string | ReadonlyArray<string>>> {
    return pipe(
      this.ref.get,
      I.map((req) => O.fromNullable(req.headers[name]))
    )
  }

  get socket(): UIO<Socket | TLSSocket> {
    return I.map_(this.ref.get, (req) => req.socket)
  }

  get protocol(): UIO<string> {
    const self = this
    return I.gen(function* (_) {
      const socket = yield* _(self.socket)
      if (socket instanceof TLSSocket && socket.encrypted) {
        return 'https'
      } else {
        return 'http'
      }
    })
  }

  get secure(): UIO<boolean> {
    return I.map_(this.protocol, (p) => p === 'https')
  }

  get ip(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.socket, (s) => s.remoteAddress!)
  }

  get stream(): S.Stream<unknown, NS.ReadableError, Byte> {
    return S.chain_(S.fromIO(this.ref.get), (req) => NS.streamFromReadable(() => req))
  }

  get rawBody(): FIO<HttpException, string> {
    const self = this
    return I.gen(function* (_) {
      const contentType = yield* _(self.getHeader('content-type'))
      const charset     = yield* _(
        pipe(
          contentType,
          O.map(parseContentType),
          O.chain((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset.parse,
          Th.match(
            (_) => Sy.fail(new HttpException('Invalid charset', { status: Status.UnsupportedMediaType })),
            Sy.succeed,
            (_, a) => Sy.succeed(a)
          )
        )
      )

      return yield* _(
        pipe(
          self.stream,
          S.runCollect,
          I.map(flow(C.toBuffer, (b) => Buffer.from(b).toString(charset))),
          I.catchAll((_) =>
            I.fail(
              new HttpException('Failed to read body stream', {
                status: Status.InternalServerError,
                originalError: _
              })
            )
          )
        )
      )
    })
  }

  get bodyJson(): FIO<HttpException, Record<string, any>> {
    const self = this
    return I.gen(function* (_) {
      const contentType = yield* _(self.getHeader('Content-Type'))
      const charset     = yield* _(
        pipe(
          contentType,
          O.map(parseContentType),
          O.chain((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset.parse,
          Th.match(
            (_) => Sy.fail(new HttpException('Invalid charset', { status: Status.UnsupportedMediaType })),
            Sy.succeed,
            (_, a) => Sy.succeed(a)
          )
        )
      )

      if (!Str.startsWith_(charset, 'utf-')) {
        return yield* _(
          I.fail(
            new HttpException('Charset unsupported by JSON', {
              status: Status.UnsupportedMediaType
            })
          )
        )
      }

      return yield* _(
        pipe(
          self.stream,
          S.runCollect,
          I.map(flow(C.toBuffer, (b) => Buffer.from(b).toString(charset))),
          I.catchAll((_) =>
            I.fail(
              new HttpException('Failed to read body stream', {
                status: Status.InternalServerError
              })
            )
          ),
          I.chain((raw) =>
            I.tryCatch(
              () => JSON.parse(raw),
              (_) =>
                new HttpException('Failed to parse body JSON', {
                  status: Status.InternalServerError
                })
            )
          )
        )
      )
    })
  }
}
