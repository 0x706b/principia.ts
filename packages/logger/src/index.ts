import type {} from '@principia/base/fluent'
import type { Has } from '@principia/base/Has'
import type ChalkType from 'chalk'

import { Clock } from '@principia/base/Clock'
import { Console, ConsoleTag } from '@principia/base/Console'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as fs from '@principia/node/fs'
import { formatISO9075, getMilliseconds } from 'date-fns'
import stripAnsi from 'strip-ansi'

export type ChalkFn = (c: typeof ChalkType) => string

export type LogFn = (m: ChalkFn) => I.URIO<Has<Clock>, void>

export type ColorMap = Record<LogLevel, ChalkType.Chalk>

export interface Logger {
  readonly debug: LogFn
  readonly error: LogFn
  readonly info: LogFn
  readonly warning: LogFn
}
export const Logger = tag<Logger>()

export interface Chalk {
  chalk: typeof ChalkType
}
export const ChalkTag = tag<Chalk>()

export type LogLevel = keyof Logger

const severity: Record<LogLevel, number> = {
  debug: 3,
  info: 2,
  warning: 1,
  error: 0
}

export interface LoggerOptions {
  path: string
  level?: LogLevel
  theme?: I.URIO<Has<Chalk>, ColorMap>
}

export type LoggerConfig = {
  [K in keyof LoggerOptions]-?: NonNullable<LoggerOptions[K]>
}
export const LoggerConfigTag = tag<LoggerConfig>()

export function loggerConfig(config: LoggerOptions) {
  return L.succeed(LoggerConfigTag)({
    path: config.path,
    level: config.level ?? 'error',
    theme:
      config.theme ??
      I.asksService(ChalkTag)(({ chalk }) => ({
        debug: chalk.gray,
        info: chalk.blue,
        warning: chalk.yellow,
        error: chalk.red
      }))
  })
}

export interface LogEntry {
  level: LogLevel
  message: string
}

const timestamp = Clock.currentTime.map(
  (ms) => `${formatISO9075(ms)}.${getMilliseconds(ms).toString().padStart(3, '0')}`
)

const showConsoleLogEntry = (entry: LogEntry) =>
  I.gen(function* (_) {
    const config    = yield* _(LoggerConfigTag)
    const { chalk } = yield* _(ChalkTag)
    const time      = yield* _(timestamp)
    const theme     = yield* _(config.theme)
    return `[${theme[entry.level](entry.level.toUpperCase())}] ${entry.message} ${chalk.gray.dim(time)}`
  })

const showFileLogEntry = (entry: LogEntry) =>
  timestamp.map((time) => `${time} [${entry.level.toUpperCase()}] ${stripAnsi(entry.message)}\n`)

const logToConsole = (entry: LogEntry) => showConsoleLogEntry(entry).chain(Console.putStrLn)

const logToFile = (entry: LogEntry) =>
  showFileLogEntry(entry).chain((s) => I.asksServiceIO(LoggerConfigTag)((config) => fs.appendFile(config.path, s)))

function _log(message: ChalkFn, level: LogLevel) {
  return I.gen(function* (_) {
    const { level: configLevel, path } = yield* _(LoggerConfigTag)

    const { chalk } = yield* _(ChalkTag)

    const entry: LogEntry = {
      message: message(chalk),
      level
    }

    yield* _(
      logToConsole(entry)
        ['*>'](logToFile(entry))
        .catchAll((error) => Console.putStrLn(`Error when writing to path ${path}\n${error}`))
        .when(() => severity[configLevel] >= severity[level])
    )
  })
}

export const LiveLogger = L.fromIO(Logger)(
  I.asksServices({ config: LoggerConfigTag, console: ConsoleTag, chalk: ChalkTag })(
    ({ config, console, chalk }): Logger => ({
      debug: (m) => _log(m, 'debug').giveServicesT(ConsoleTag, LoggerConfigTag, ChalkTag)(console, config, chalk),
      info: (m) => _log(m, 'info').giveServicesT(ConsoleTag, LoggerConfigTag, ChalkTag)(console, config, chalk),
      warning: (m) => _log(m, 'warning').giveServicesT(ConsoleTag, LoggerConfigTag, ChalkTag)(console, config, chalk),
      error: (m) => _log(m, 'error').giveServicesT(ConsoleTag, LoggerConfigTag, ChalkTag)(console, config, chalk)
    })
  )
)

export const { debug, info, warning, error } = I.deriveLifted(Logger)(['debug', 'info', 'warning', 'error'], [], [])
