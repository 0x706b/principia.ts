import type { Endomorphism } from '../../Endomorphism'

import * as _ from '../../util/AnsiFormat'

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
  string: _.green,
  number: _.yellow,
  boolean: _.yellow,
  bigint: _.yellow,
  special: _.cyan,
  undefined: _.brightBlack,
  null: _.bold,
  symbol: _.green,
  date: _.magenta,
  regexp: _.red,
  module: _.underline,
  dim: _.dim
}

export type StyleFunction = (str: string, group: ShowGroup) => string

export type GetStyle = (group: ShowGroup) => string

export function stylizeWithColor(str: string, group: ShowGroup): string {
  return defaultShowStyle[group](str)
}

export function stylizeNoColor(str: string, _: ShowGroup): string {
  return str
}
