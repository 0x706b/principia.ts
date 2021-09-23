import type { Endomorphism } from '../../Endomorphism'

import * as Ansi from '../../util/AnsiFormat'

export type Style =
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'bold'
  | 'italic'
  | 'underline'

export type ShowGroup =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'special'
  | 'undefined'
  | 'null'
  | 'symbol'
  | 'date'
  | 'regexp'
  | 'module'
  | 'dim'

export type ShowStyle = Record<ShowGroup, Endomorphism<string>>

export const defaultShowStyle: ShowStyle = {
  string: Ansi.green,
  number: Ansi.yellow,
  boolean: Ansi.yellow,
  bigint: Ansi.yellow,
  special: Ansi.cyan,
  undefined: Ansi.brightBlack,
  null: Ansi.bold,
  symbol: Ansi.green,
  date: Ansi.magenta,
  regexp: Ansi.red,
  module: Ansi.underline,
  dim: Ansi.dim
}

export type StyleFunction = (str: string, group: ShowGroup) => string

export type GetStyle = (group: ShowGroup) => string

export function stylizeWithColor(str: string, group: ShowGroup): string {
  return defaultShowStyle[group](str)
}

export function stylizeNoColor(str: string, _: ShowGroup): string {
  return str
}
