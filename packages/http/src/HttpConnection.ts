import type { URef } from '@principia/base/Ref'
import type { USRef } from '@principia/base/SRef'
import type * as http from 'http'

import { tag } from '@principia/base/Has'

import { HttpRequest } from './HttpRequest'
import { HttpResponse } from './HttpResponse'

export class HttpConnection {
  readonly req: HttpRequest
  readonly res: HttpResponse
  constructor(reqRef: URef<http.IncomingMessage>, resRef: USRef<http.ServerResponse>) {
    this.req = new HttpRequest(reqRef)
    this.res = new HttpResponse(resRef)
  }
}

export const HttpConnectionTag = tag<HttpConnection>()
