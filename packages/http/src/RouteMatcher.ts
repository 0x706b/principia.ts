import type { HttpConnection } from './HttpConnection'
import type { HttpException } from './HttpException'
import type { HttpMethod } from './utils'
import type { IO } from '@principia/base/IO'

import * as I from '@principia/base/IO'
import { pathToRegexp } from 'path-to-regexp'

export type MatchMethod = HttpMethod | '*'

export class RouteMatcher {
  readonly regex: RegExp
  constructor(readonly method: MatchMethod, readonly path: string) {
    this.regex = pathToRegexp(path)
  }
  match(conn: HttpConnection): IO<unknown, HttpException, boolean> {
    const self = this
    return I.gen(function* (_) {
      const { pathname } = yield* _(conn.req.url)
      const method       = yield* _(conn.req.method)
      return self.method === '*' || self.method === method ? self.regex.test(pathname) : false
    })
  }
}
