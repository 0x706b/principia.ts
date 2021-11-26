import type { Byte } from '@principia/base/Byte'
import type { FSync, USync } from '@principia/base/Sync'

import * as Ch from '@principia/base/Channel'
import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as Sink from '@principia/base/Sink'
import * as S from '@principia/base/Stream'
import * as Sy from '@principia/base/Sync'
import { tuple } from '@principia/base/tuple'
import { once } from 'events'

export class StdinError {
  readonly _tag = 'StdinError'
  constructor(readonly error: Error) {}
}

export const stdin: S.Stream<unknown, StdinError, Byte> = pipe(
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

function stdoutLoop<E>(): Ch.Channel<unknown, E, C.Chunk<Buffer>, unknown, StdoutError | E, C.Chunk<never>, void> {
  return Ch.readWith(
    (is: C.Chunk<Buffer>) =>
      pipe(
        Ch.fromIO(
          I.async<unknown, StdoutError, void>(async (cb) => {
            for (let i = 0; i < is.length; i++) {
              if (!process.stdout.write(C.unsafeGet_(is, i), (err) => err && cb(I.fail(new StdoutError(err))))) {
                await once(process.stdout, 'drain')
              }
            }
            cb(I.unit())
          })
        ),
        Ch.crossSecond(stdoutLoop<E>())
      ),
    Ch.fail,
    Ch.end
  )
}

export function stdout<E>(): Sink.Sink<unknown, E | StdoutError, Buffer, never, void> {
  return new Sink.Sink(stdoutLoop<E>())
}

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
