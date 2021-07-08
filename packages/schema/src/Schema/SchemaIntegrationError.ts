import type { AnyS } from './core'

import { show } from '@principia/base/Structural'

export const SchemaIntegrationErrorTypeId = Symbol('@principia/schema/Schema/SchemaIntegrationError')
export type SchemaIntegrationErrorTypeId = typeof SchemaIntegrationErrorTypeId

export class SchemaIntegrationError extends Error {
  readonly [SchemaIntegrationErrorTypeId]: SchemaIntegrationErrorTypeId = SchemaIntegrationErrorTypeId
  constructor(readonly instance: string, readonly schema: AnyS) {
    super(`Missing ${instance} integration for: ${show(schema)}`)
  }
}
