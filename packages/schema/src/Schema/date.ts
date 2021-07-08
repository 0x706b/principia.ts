import type * as PE from '../ParseError'
import type { URIS } from '../Schemable'

import * as S from './core'

export class DateStringS extends S.Schema<
  URIS,
  unknown,
  Date,
  PE.StringLE | PE.DateFromStringLE,
  never,
  Date,
  string,
  {}
> {
  readonly _tag = 'DateString'
  readonly api  = {}
  clone() {
    return new DateStringS()
  }
}

export const dateString: DateStringS = new DateStringS()

export class DateMsS extends S.Schema<URIS, unknown, Date, PE.NumberLE | PE.DateFromMsLE, never, Date, number, {}> {
  readonly _tag = 'DateMs'
  readonly api  = {}
  clone() {
    return new DateMsS()
  }
}

export const dateMs: DateMsS = new DateMsS()
