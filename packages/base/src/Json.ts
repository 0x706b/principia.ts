import * as E from './Either'
import { identity } from './function'

export type Json = boolean | number | string | null | JsonArray | JsonRecord

export interface JsonRecord extends Readonly<Record<string, Json>> {}

export interface JsonArray extends ReadonlyArray<Json> {}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function parseJson(s: string): E.Either<unknown, Json> {
  return E.tryCatch(() => JSON.parse(s), identity)
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson(u: unknown): E.Either<unknown, string> {
  return E.tryCatch(() => JSON.stringify(u), identity)
}
