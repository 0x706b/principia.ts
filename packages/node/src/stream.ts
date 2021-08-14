import type { Byte } from '@principia/base/Byte'
import type * as stream from 'stream'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/IO/Managed'
import * as S from '@principia/base/IO/Stream'
import * as Push from '@principia/base/IO/Stream/Push'
import * as Sink from '@principia/base/IO/Stream/Sink'
import * as O from '@principia/base/Option'
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
          cb(I.fail(O.some(new ReadableError(err))))
        })
        sr.on('end', () => {
          cb(I.fail(O.none()))
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
export function sinkFromWritable(w: () => stream.Writable): Sink.Sink<unknown, WritableError, Byte, never, void> {
  return new Sink.Sink(
    pipe(
      I.async<unknown, never, stream.Writable>((cb) => {
        const onError = (err: Error) => {
          clearImmediate(im)
          cb(I.halt(err))
        }

        const sw = w().once('error', onError)
        const im = setImmediate(() => {
          sw.removeListener('error', onError)
          cb(I.succeed(sw))
        })
      }),
      M.bracket((sw) =>
        I.succeedLazy(() => {
          sw.destroy()
        })
      ),
      M.map((sw) =>
        O.match(
          () => Push.emit(undefined, C.empty()),
          (chunk) =>
            I.async((cb) => {
              sw.write(chunk, (err) => (err ? cb(Push.fail(new WritableError(err), C.empty())) : cb(Push.more)))
            })
        )
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
      M.bracket((st) =>
        I.succeedLazy(() => {
          st.destroy()
        })
      ),
      M.map((st) =>
        tuple(
          st,
          Sink.fromPush<unknown, TransformError, Byte, never, void>(
            O.match(
              () =>
                I.chain_(
                  I.succeedLazy(() => {
                    st.end()
                  }),
                  () => Push.emit(undefined, C.empty())
                ),
              (chunk) =>
                I.async((cb) => {
                  st.write(C.toBuffer(chunk), (err) =>
                    err ? cb(Push.fail(new TransformError(err), C.empty())) : cb(Push.more)
                  )
                })
            )
          )
        )
      )
    )
    return pipe(
      S.fromManaged(managedSink),
      S.chain(([transform, sink]) =>
        S.asyncIO<unknown, TransformError, Byte, R, E | TransformError>((cb) =>
          I.crossSecond_(
            I.succeedLazy(() => {
              transform.on('data', (chunk) => {
                cb(I.succeed(chunk))
              })
              transform.on('error', (err) => {
                cb(I.fail(O.some(new TransformError(err))))
              })
              transform.on('end', () => {
                cb(I.fail(O.none()))
              })
            }),
            S.run_(stream, sink)
          )
        )
      )
    )
  }
}
