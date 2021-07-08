import type { StatusCode } from './StatusCode'

import { Exception } from '@principia/base/Exception'

export interface HttpExceptionData {
  readonly status: StatusCode
  readonly originalError?: unknown
}

export class HttpException extends Exception {
  readonly _tag = 'HttpException'
  constructor(message: string, readonly data: HttpExceptionData) {
    super(message)
  }
}
