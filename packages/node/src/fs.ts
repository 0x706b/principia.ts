import type { Byte } from '@principia/base/Byte'
import type { Chunk } from '@principia/base/Chunk'
import type { IO } from '@principia/base/IO'

import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import { Integer } from '@principia/base/Integer'
import * as I from '@principia/base/IO'
import * as Ma from '@principia/base/IO/Managed'
import * as Queue from '@principia/base/IO/Queue'
import * as Ref from '@principia/base/IO/Ref'
import * as S from '@principia/base/IO/Stream'
import * as Push from '@principia/base/IO/Stream/Push'
import * as Sink from '@principia/base/IO/Stream/Sink'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/Newtype'
import * as fs from 'fs'

type ErrnoException = NodeJS.ErrnoException

const _FileDescriptor = N.typeDef<number>()('FileDescriptor')
export interface FileDescriptor extends N.TypeOf<typeof _FileDescriptor> {}
export const FileDescriptor = N.newtype<FileDescriptor>()(_FileDescriptor)

function unitErrorCallback(cb: (_: IO<unknown, ErrnoException, void>) => void): (err: ErrnoException | null) => void {
  return (err) => (err ? cb(I.fail(err)) : cb(I.unit()))
}

export function access(path: fs.PathLike, mode: number | undefined): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.access(path, mode, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function appendFile(
  path: fs.PathLike | FileDescriptor,
  data: string | Buffer,
  options?: fs.WriteFileOptions
): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.appendFile(path as any, data, options ?? {}, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function chmod(path: fs.PathLike, mode: fs.Mode): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.chmod(path, mode, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function close(fd: FileDescriptor): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.close(FileDescriptor.unwrap(fd), (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function chown(path: fs.PathLike, uid: number, gid: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.chown(path, uid, gid, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function copyFile(src: fs.PathLike, dest: fs.PathLike, flags: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.copyFile(src, dest, flags, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

interface CreateReadStreamOptions {
  chunkSize?: number
  flags?: fs.OpenMode
  mode?: string | number
  start?: Integer
  end?: Integer
}

export function createReadStream(
  path: fs.PathLike,
  options?: CreateReadStreamOptions
): S.Stream<unknown, ErrnoException, Byte> {
  const chunkSize = options?.chunkSize ?? 1024 * 64
  return pipe(
    open(path, options?.flags ?? fs.constants.O_RDONLY, options?.mode),
    I.crossPar(
      I.defer(() => {
        const start = options?.start ? Integer.unwrap(options?.start) : 0
        const end   = options?.end ? Integer.unwrap(options?.end) : Infinity
        if (end < start) {
          return I.fail(new RangeError(`start (${start}) must be <= end (${end})`))
        } else {
          return Ref.make([start, end] as const)
        }
      })
    ),
    S.bracket(([fd, _]) => I.orHalt(close(fd))),
    S.chain(([fd, state]) =>
      S.repeatIOChunkMaybe(
        I.gen(function* (_) {
          const [pos, end]     = yield* _(state.get)
          const n              = Math.min(end - pos + 1, chunkSize)
          const [bytes, chunk] = yield* _(I.mapError_(read(fd, n, pos), M.just))

          yield* _(I.when_(I.fail(M.nothing()), () => bytes === 0))
          yield* _(state.set([pos + n, end]))
          if (bytes !== chunk.length) {
            const dst = Buffer.allocUnsafeSlow(bytes)
            chunk.copy(dst, 0, 0, bytes)
            return C.fromBuffer(dst)
          } else {
            return C.fromBuffer(chunk)
          }
        })
      )
    )
  )
}

interface CreateWriteSinkOptions {
  flags?: fs.OpenMode
  mode?: string | number
  start?: Integer
}

export function createWriteSink(
  path: fs.PathLike,
  options?: CreateWriteSinkOptions
): Sink.Sink<unknown, ErrnoException, Byte, never, void> {
  return new Sink.Sink(
    Ma.gen(function* (_) {
      const errorRef = yield* _(Ref.make<M.Maybe<ErrnoException>>(M.nothing()))
      const st       = yield* _(
        Ma.catchAll_(
          Ma.bracket_(
            I.crossPar_(
              open(path, options?.flags ?? fs.constants.O_CREAT | fs.constants.O_WRONLY, options?.mode),
              Ref.make(options?.start ? Integer.unwrap(options.start) : undefined)
            ),
            ([fd, _]) => I.orHalt(close(fd))
          ),
          (err) => I.toManaged_(errorRef.set(M.just(err)))
        )
      )

      const maybeError = yield* _(errorRef.get)
      if (!st && M.isJust(maybeError)) {
        return (_: M.Maybe<Chunk<Byte>>) => Push.fail(maybeError.value, C.empty())
      } else {
        return (is: M.Maybe<Chunk<Byte>>) =>
          M.match_(
            is,
            () => Push.emit(undefined, C.empty()),
            (chunk) =>
              pipe(
                (st[1] as Ref.URef<number | undefined>).get,
                I.chain((pos) => write(st[0], chunk, pos)),
                I.chain((_) =>
                  Ref.update_(st[1] as Ref.URef<number | undefined>, (n) => (n ? n + chunk.length : undefined))
                ),
                I.chain((_) => Push.more),
                I.mapError((err) => [E.left(err), C.empty()])
              )
          )
      }
    })
  )
}

export function fchmod(fd: FileDescriptor, mode: fs.Mode): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.fchmod(FileDescriptor.unwrap(fd), mode, unitErrorCallback(cb))
  })
}

export function fchown(fd: FileDescriptor, uid: number, gid: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.fchown(FileDescriptor.unwrap(fd), uid, gid, unitErrorCallback(cb))
  })
}

export function fdatasync(fd: FileDescriptor): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.fdatasync(FileDescriptor.unwrap(fd), unitErrorCallback(cb))
  })
}

export function fstat(fd: FileDescriptor): I.FIO<ErrnoException, fs.Stats> {
  return I.async<unknown, ErrnoException, fs.Stats>((cb) => {
    fs.fstat(FileDescriptor.unwrap(fd), (err, stats) => (err ? cb(I.fail(err)) : cb(I.succeed(stats))))
  })
}

export function fsync(fd: FileDescriptor): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.fsync(FileDescriptor.unwrap(fd), unitErrorCallback(cb))
  })
}

export function ftruncate(fd: FileDescriptor, len: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.ftruncate(FileDescriptor.unwrap(fd), len, unitErrorCallback(cb))
  })
}

export function futimes(
  fd: FileDescriptor,
  atime: string | number | Date,
  mtime: string | number | Date
): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.futimes(FileDescriptor.unwrap(fd), atime, mtime, unitErrorCallback(cb))
  })
}

export function lchmod(path: fs.PathLike, mode: fs.Mode): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.lchmod(path, mode, unitErrorCallback(cb))
  })
}

export function lchown(path: fs.PathLike, uid: number, gid: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.lchown(path, uid, gid, unitErrorCallback(cb))
  })
}

export function lutimes(
  path: fs.PathLike,
  atime: string | number | Date,
  mtime: string | number | Date
): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.lutimes(path, atime, mtime, unitErrorCallback(cb))
  })
}

export function link(path: fs.PathLike, newPath: fs.PathLike): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.link(path, newPath, (err) => (err ? cb(I.fail(err)) : cb(I.unit())))
  })
}

export function lstat(path: fs.PathLike): I.FIO<ErrnoException, fs.Stats> {
  return I.async<unknown, ErrnoException, fs.Stats>((cb) => {
    fs.lstat(path, (err, stats) => (err ? cb(I.fail(err)) : cb(I.succeed(stats))))
  })
}

export function mkdir(
  path: fs.PathLike,
  options?: { recursive?: boolean, mode?: fs.Mode }
): I.FIO<ErrnoException, M.Maybe<string>> {
  return I.async<unknown, ErrnoException, M.Maybe<string>>((cb) => {
    fs.mkdir(path, options, (err, path) => (err ? cb(I.fail(err)) : cb(I.succeed(M.fromNullable(path)))))
  })
}

export function mkdtemp(prefix: string, options?: { encoding?: BufferEncoding }): I.FIO<ErrnoException, string> {
  return I.async<unknown, ErrnoException, string>((cb) => {
    fs.mkdtemp(prefix, options, (err, folder) => (err ? cb(I.fail(err)) : cb(I.succeed(folder))))
  })
}

export function open(
  path: fs.PathLike,
  flags: fs.OpenMode,
  mode?: string | number
): I.FIO<NodeJS.ErrnoException, FileDescriptor> {
  return I.async<unknown, ErrnoException, FileDescriptor>((cb) => {
    fs.open(path, flags, mode ?? null, (err, fd) => (err ? cb(I.fail(err)) : cb(I.succeed(FileDescriptor.wrap(fd)))))
  })
}

export class Dir {
  readonly path: string
  private readonly _dir: fs.Dir
  constructor(dir: fs.Dir) {
    this.path = dir.path
    this._dir = dir
  }

  close(): I.FIO<ErrnoException, void> {
    return I.async<unknown, ErrnoException, void>((cb) => {
      this._dir.close(unitErrorCallback(cb))
    })
  }

  read(): I.FIO<ErrnoException, M.Maybe<fs.Dirent>> {
    return I.async<unknown, ErrnoException, M.Maybe<fs.Dirent>>((cb) => {
      this._dir.read((err, dirEnt) => (err ? cb(I.fail(err)) : cb(I.succeed(M.fromNullable(dirEnt)))))
    })
  }
}

export function opendir(path: fs.PathLike, options?: fs.OpenDirOptions): I.FIO<ErrnoException, Dir> {
  return I.async<unknown, ErrnoException, Dir>((cb) => {
    fs.opendir(path as any, options ?? {}, (err, dir) => (err ? cb(I.fail(err)) : cb(I.succeed(new Dir(dir)))))
  })
}

export function read(
  fd: FileDescriptor,
  length: number,
  position?: number
): I.FIO<ErrnoException, readonly [number, Buffer]> {
  return I.async<unknown, ErrnoException, readonly [number, Buffer]>((cb) => {
    const buf = Buffer.alloc(length)
    fs.read(FileDescriptor.unwrap(fd), buf, 0, length, position ?? null, (err, bytesRead, buffer) =>
      err ? cb(I.fail(err)) : cb(I.succeed([bytesRead, buffer]))
    )
  })
}

export function readdir(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding
    withFileTypes?: false
  }
): I.FIO<ErrnoException, ReadonlyArray<string>>
export function readdir(
  path: fs.PathLike,
  options: {
    encoding: 'buffer'
    withFileTypes?: false
  }
): I.FIO<ErrnoException, ReadonlyArray<Buffer>>
export function readdir(
  path: fs.PathLike,
  options: {
    encoding?: BufferEncoding
    withFileTypes: true
  }
): I.FIO<ErrnoException, ReadonlyArray<Dir>>
export function readdir(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding | 'buffer'
    withFileTypes?: boolean
  }
): I.FIO<ErrnoException, ReadonlyArray<any>> {
  return I.async((cb) => {
    fs.readdir(path, options ?? ({} as any), (err, files: any) =>
      err ? cb(I.fail(err)) : files[0] && files[0] instanceof fs.Dir ? C.map_(files, (a: fs.Dir) => new Dir(a)) : files
    )
  })
}

export function realpath(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding
  }
): I.FIO<ErrnoException, string>
export function realpath(
  path: fs.PathLike,
  options: {
    encoding: 'buffer'
  }
): I.FIO<ErrnoException, Buffer>
export function realpath(path: fs.PathLike, options?: any): I.FIO<ErrnoException, any> {
  return I.async<unknown, ErrnoException, any>((cb) => {
    fs.realpath(path, options ?? {}, (err, resolvedPath) => (err ? cb(I.fail(err)) : cb(I.succeed(resolvedPath))))
  })
}

export function realpathNative(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding
  }
): I.FIO<ErrnoException, string>
export function realpathNative(
  path: fs.PathLike,
  options: {
    encoding: 'buffer'
  }
): I.FIO<ErrnoException, Buffer>
export function realpathNative(path: fs.PathLike, options?: any): I.FIO<ErrnoException, any> {
  return I.async<unknown, ErrnoException, any>((cb) => {
    fs.realpath.native(path, options ?? {}, (err, resolvedPath) =>
      err ? cb(I.fail(err)) : cb(I.succeed(resolvedPath))
    )
  })
}

export function rename(oldPath: fs.PathLike, newPath: fs.PathLike): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.rename(oldPath, newPath, unitErrorCallback(cb))
  })
}

export function rm(path: fs.PathLike, options?: fs.RmOptions): I.FIO<ErrnoException, void> {
  return I.async<unknown, NodeJS.ErrnoException, void>((cb) => {
    fs.rm(path, options ?? {}, unitErrorCallback(cb))
  })
}

export function rmdir(path: fs.PathLike, options?: fs.RmDirOptions): I.FIO<ErrnoException, void> {
  return I.async<unknown, NodeJS.ErrnoException, void>((cb) => {
    fs.rmdir(path, options ?? {}, unitErrorCallback(cb))
  })
}

export function stat(path: fs.PathLike, options?: { bigint?: false }): I.FIO<ErrnoException, fs.Stats>
export function stat(path: fs.PathLike, options: { bigint: true }): I.FIO<ErrnoException, fs.BigIntStats>
export function stat(
  path: fs.PathLike,
  options?: { bigint?: boolean }
): I.FIO<ErrnoException, fs.Stats | fs.BigIntStats> {
  return I.async<unknown, ErrnoException, fs.Stats | fs.BigIntStats>((cb) => {
    fs.stat(path, options ?? ({} as any), (err, stats) => (err ? cb(I.fail(err)) : cb(I.succeed(stats))))
  })
}

export function symlink(target: fs.PathLike, path: fs.PathLike): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.symlink(target, path, unitErrorCallback(cb))
  })
}

export function truncate(path: fs.PathLike, len?: number): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.truncate(path, len, unitErrorCallback(cb))
  })
}

export function unlink(path: fs.PathLike): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.unlink(path, unitErrorCallback(cb))
  })
}

export function utimes(
  path: fs.PathLike,
  atime: string | number | Date,
  mtime: string | number | Date
): I.FIO<ErrnoException, void> {
  return I.async<unknown, ErrnoException, void>((cb) => {
    fs.utimes(path, atime, mtime, unitErrorCallback(cb))
  })
}

export function write(fd: FileDescriptor, buffer: Chunk<Byte>, position?: number): I.FIO<ErrnoException, number> {
  return I.async<unknown, ErrnoException, number>((cb) => {
    const b = C.toBuffer(buffer)
    fs.write(FileDescriptor.unwrap(fd), b, position ?? null, b.byteLength, (err, bytesWritten) =>
      err ? cb(I.fail(err)) : cb(I.succeed(bytesWritten))
    )
  })
}

export function writev(
  fd: FileDescriptor,
  buffers: ReadonlyArray<Uint8Array>,
  position?: number
): I.FIO<ErrnoException, number> {
  return I.async<unknown, ErrnoException, number>((cb) => {
    if (position) {
      fs.writev(FileDescriptor.unwrap(fd), buffers, position, (err, bytesWritten) =>
        err ? cb(I.fail(err)) : cb(I.succeed(bytesWritten))
      )
    } else {
      fs.writev(FileDescriptor.unwrap(fd), buffers, (err, bytesWritten) =>
        err ? cb(I.fail(err)) : cb(I.succeed(bytesWritten))
      )
    }
  })
}

export function watch(
  filename: fs.PathLike,
  options: {
    persistent?: boolean
    recursive?: boolean
    encoding: 'buffer'
  }
): S.Stream<unknown, Error, { eventType: 'rename' | 'change', filename: Buffer }>
export function watch(
  filename: fs.PathLike,
  options?: {
    persistent?: boolean
    recursive?: boolean
    encoding?: BufferEncoding
  }
): S.Stream<unknown, Error, { eventType: 'rename' | 'change', filename: string }>
export function watch(
  filename: fs.PathLike,
  options?: any
): S.Stream<unknown, Error, { eventType: 'rename' | 'change', filename: string | Buffer }> {
  return pipe(
    I.tryCatch(
      () => fs.watch(filename, options ?? {}),
      (err) => err as Error
    ),
    S.fromIO,
    S.chain((watcher) =>
      S.repeatIOMaybe(
        I.async<unknown, M.Maybe<Error>, { eventType: 'rename' | 'change', filename: string | Buffer }>((cb) => {
          watcher.once('change', (eventType, filename) => {
            watcher.removeAllListeners()
            cb(I.succeed({ eventType: eventType as any, filename }))
          })
          watcher.once('error', (error) => {
            watcher.removeAllListeners()
            cb(I.fail(M.just(error)))
          })
          watcher.once('close', () => {
            watcher.removeAllListeners()
            cb(I.fail(M.nothing()))
          })
        })
      )
    )
  )
}

export function watchFile(
  filename: fs.PathLike,
  options: {
    bigint: true
    persistent?: boolean
    interval?: Integer
  }
): S.Stream<unknown, never, [fs.BigIntStats, fs.BigIntStats]>
export function watchFile(
  filename: fs.PathLike,
  options?: {
    bigint?: false
    persistent?: boolean
    interval?: Integer
  }
): S.Stream<unknown, never, [fs.Stats, fs.Stats]>
export function watchFile(
  filename: fs.PathLike,
  options?: any
): S.Stream<unknown, never, [fs.BigIntStats | fs.Stats, fs.BigIntStats | fs.Stats]> {
  return pipe(
    I.gen(function* (_) {
      const queue   = yield* _(Queue.makeUnbounded<[fs.BigIntStats | fs.Stats, fs.BigIntStats | fs.Stats]>())
      const runtime = yield* _(I.runtime<unknown>())
      fs.watchFile(filename, options ?? {}, (curr, prev) => {
        runtime.run_(Queue.offer_(queue, [curr, prev]))
      })
      return queue
    }),
    S.bracket(Queue.shutdown),
    S.chain((q) =>
      S.repeatIOMaybe<unknown, never, [fs.BigIntStats | fs.Stats, fs.BigIntStats | fs.Stats]>(Queue.take(q))
    )
  )
}
