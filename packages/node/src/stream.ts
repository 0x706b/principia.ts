import type { Byte } from '@principia/base/Byte'
import type * as stream from 'stream'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ch from '@principia/base/IO/experimental/Channel'
import * as Sink from '@principia/base/IO/experimental/Sink'
import * as S from '@principia/base/IO/experimental/Stream'
import * as Ma from '@principia/base/IO/Managed'
import * as M from '@principia/base/Maybe'
import { tuple } from '@principia/base/tuple'

export class ReadableError {
  readonly _tag = 'ReadableError'
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Readable`, converting it into a `Stream`
 *
 * @category Node
 * @since 1.0.0
 */
export function streamFromReadable(r: () => stream.Readable): S.Stream<unknown, ReadableError, Byte> {
  return pipe(
    I.tryCatch(r, (err) => new ReadableError(err as Error)),
    I.tap((sr) =>
      sr.readableEncoding != null
        ? I.haltMessage(`stream.Readable encoding set to ${sr.readableEncoding} cannot be used to produce Buffer`)
        : I.unit()
    ),
    S.bracket((sr) =>
      I.succeedLazy(() => {
        sr.destroy()
      })
    ),
    S.chain((sr) =>
      S.async<unknown, ReadableError, Byte>((cb) => {
        sr.on('data', (chunk) => {
          cb(I.succeed(chunk))
        })
        sr.on('error', (err) => {
          cb(I.fail(M.just(new ReadableError(err))))
        })
        sr.on('end', () => {
          cb(I.fail(M.nothing()))
        })
      })
    )
  )
}

export class WritableError {
  readonly _tag = 'WritableError'
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Writable`, converting it into a `Sink`
 *
 * @category Node
 * @since 1.0.0
 */
export function sinkFromWritable<InErr>(
  w: () => stream.Writable
): Sink.Sink<unknown, InErr, Byte, WritableError | InErr, never, void> {
  return new Sink.Sink(
    Ch.unwrapManaged(
      pipe(
        I.async<unknown, never, stream.Writable>((cb) => {
          const onError = (err: Error) => {
            clearImmediate(handle)
            cb(I.halt(err))
          }

          const writable = w().once('error', onError)
          const handle   = setImmediate(() => {
            writable.removeListener('error', onError)
            cb(I.succeed(writable))
          })
        }),
        Ma.bracket((writable) =>
          I.succeedLazy(() => {
            writable.destroy()
          })
        ),
        Ma.map((writable) => {
          const reader: Ch.Channel<
            unknown,
            InErr,
            C.Chunk<Byte>,
            unknown,
            WritableError | InErr,
            never,
            void
          > = Ch.readWith(
            (chunk: C.Chunk<Byte>) =>
              Ch.unwrap(
                I.async<unknown, WritableError, typeof reader>((cb) => {
                  writable.write(C.toBuffer(chunk), (err) =>
                    err ? cb(I.fail(new WritableError(err))) : cb(I.succeed(reader))
                  )
                })
              ),
            Ch.fail,
            () => Ch.end(undefined)
          )
          return reader
        })
      )
    )
  )
}

export class TransformError {
  readonly _tag = 'TransformError'
  constructor(readonly error: Error) {}
}

export function transform(
  tr: () => stream.Transform
): <R, E>(stream: S.Stream<R, E, Byte>) => S.Stream<R, E | TransformError, Byte> {
  return <R, E>(stream: S.Stream<R, E, Byte>) => {
    const managedSink = pipe(
      I.succeedLazy(tr),
      Ma.bracket((transform) =>
        I.succeedLazy(() => {
          transform.destroy()
        })
      ),
      Ma.map((transform) => {
        const endTransform = pipe(
          I.succeedLazy(() => {
            transform.end()
          })
        )
        const reader: Ch.Channel<
          unknown,
          E,
          C.Chunk<Byte>,
          unknown,
          E | TransformError,
          C.Chunk<Byte>,
          void
        > = Ch.readWith(
          (inp: C.Chunk<Byte>) =>
            Ch.unwrap(
              I.async<
                unknown,
                TransformError,
                Ch.Channel<unknown, E, C.Chunk<Byte>, unknown, E | TransformError, C.Chunk<Byte>, void>
              >((cb) => {
                transform.write(C.toBuffer(inp), (err) =>
                  err ? cb(I.fail(new TransformError(err))) : cb(I.succeed(reader))
                )
              })
            ),
          (err) =>
            Ch.unwrap(
              pipe(
                endTransform,
                I.map(() => Ch.fail(err))
              )
            ),
          () =>
            Ch.unwrap(
              pipe(
                endTransform,
                I.map(() => Ch.end(undefined))
              )
            )
        )
        return tuple(transform, new Sink.Sink(reader))
      })
    )
    return pipe(
      S.fromManaged(managedSink),
      S.chain(([transform, sink]) =>
        S.asyncIO<unknown, TransformError, Byte, R, E | TransformError>((cb) =>
          I.crossSecond_(
            I.succeedLazy(() => {
              transform.on('data', (chunk) => {
                cb(I.succeed(C.fromBuffer(chunk)))
              })
              transform.on('error', (err) => {
                cb(I.fail(M.just(new TransformError(err))))
              })
              transform.on('end', () => {
                cb(I.fail(M.nothing()))
              })
            }),
            S.run_(stream, sink)
          )
        )
      )
    )
  }
}
