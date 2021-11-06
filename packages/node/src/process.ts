import type { Byte } from '@principia/base/Byte'
import type { Chunk } from '@principia/base/Chunk'
import type * as E from '@principia/base/Either'
import type { FSync, USync } from '@principia/base/Sync'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as S from '@principia/base/Stream'
import * as Push from '@principia/base/Stream/Push'
import * as Sink from '@principia/base/Stream/Sink'
import * as Sy from '@principia/base/Sync'
import { tuple } from '@principia/base/tuple'
import { once } from 'events'

export class StdinError {
  readonly _tag = 'StdinError'
  constructor(readonly error: Error) {}
}

export const stdin: S.FStream<StdinError, Byte> = pipe(
  S.fromIO(I.succeedLazy(() => tuple(process.stdin.resume(), new Array<() => void>()))),
  S.chain(([rs, cleanup]) =>
    S.ensuring_(
      S.async<unknown, StdinError, Byte>((cb) => {
        const onData = (data: Buffer) => {
          cb(I.succeed(C.fromBuffer(data)))
        }
        const onError = (err: Error) => {
          cb(I.fail(M.just(new StdinError(err))))
        }
        cleanup.push(
          () => {
            rs.removeListener('error', onError)
          },
          () => {
            rs.removeListener('data', onData)
          },
          () => {
            rs.pause()
          }
        )
        rs.on('data', onData)
        rs.on('error', onError)
      }),
      I.succeedLazy(() => {
        cleanup.forEach((h) => {
          h()
        })
      })
    )
  )
)

export class StdoutError {
  readonly _tag = 'StdoutError'
  constructor(readonly error: Error) {}
}

export const stdout: Sink.Sink<unknown, StdoutError, Buffer, never, void> = Sink.fromPush((is) =>
  M.match_(
    is,
    () => Push.emit(undefined, C.empty()),
    (bufs) =>
      I.async<unknown, readonly [E.Either<StdoutError, void>, Chunk<never>], void>(async (cb) => {
        for (let i = 0; i < bufs.length; i++) {
          if (!process.stdout.write(bufs[i], (err) => err && cb(Push.fail(new StdoutError(err), C.empty())))) {
            await once(process.stdout, 'drain')
          }
        }
        cb(Push.more)
      })
  )
)

export function abort(): USync<never> {
  return Sy.succeedLazy(process.abort)
}

export function chdir(directory: string): FSync<Error, void> {
  return Sy.tryCatch(
    () => process.chdir(directory),
    (err) => err as Error
  )
}

export function cpuUsage(previousValue?: NodeJS.CpuUsage): USync<NodeJS.CpuUsage> {
  return Sy.succeedLazy(() => process.cpuUsage(previousValue))
}

export function cwd(): USync<string> {
  return Sy.succeedLazy(() => process.cwd())
}

export function emitWarning(
  warning: string | Error,
  options?: {
    type?: string
    code?: string
    ctor?: Function
    detail?: string
  }
): USync<void> {
  return Sy.succeedLazy(() => process.emitWarning(warning, options as any))
}

export function exit(code?: number): USync<never> {
  return Sy.succeedLazy(() => process.exit(code))
}

export const exitCode = Sy.succeedLazy(() => process.exitCode)

export function hrtime(time?: readonly [number, number]): USync<readonly [number, number]> {
  return Sy.succeedLazy(() => process.hrtime(time as any))
}

export const hrtimeBigint = Sy.succeedLazy(() => process.hrtime.bigint())

export const memoryUsage = Sy.succeedLazy(process.memoryUsage)

export const resourceUsage = Sy.succeedLazy(process.resourceUsage)

export {
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  config,
  connected,
  debugPort,
  env,
  execArgv,
  execPath,
  pid,
  platform,
  ppid,
  release,
  traceDeprecation,
  version,
  versions
} from 'process'
