import type { NonEmptyArray } from '@principia/base/collection/immutable/NonEmptyArray'
import type { Maybe } from '@principia/base/Maybe'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  interface String {
    /**
     * @rewrite append_ from "@principia/base/string"
     */
    append(s: string): string

    /**
     * @rewrite capitalize from "@principia/base/string"
     */
    capitalize(this: string): string

    /**
     * @rewrite capitalizeAll from "@principia/base/string"
     */
    capitalizeAll(this: string): string

    /**
     * @rewrite contains_ from "@principia/base/string"
     */
    contains(substr: string): boolean

    /**
     * @rewriteGetter isEmpty from "@principia/base/string"
     */
    isEmpty: boolean

    /**
     * @rewriteGetter isNonEmpty from "@principia/base/string"
     */
    isNonEmpty: boolean

    /**
     * @rewriteGetter lines from "@principia/base/string"
     */
    lines: ReadonlyArray<string>

    /**
     * @rewrite matchAll_ from "@principia/base/string"
     */
    matchAllMaybe(regex: RegExp): Maybe<NonEmptyArray<RegExpMatchArray>>

    /**
     * @rewrite match_ from "@principia/base/string"
     */
    matchMaybe(regex: RegExp): Maybe<RegExpMatchArray>

    /**
     * @rewrite prepend_ from "@principia/base/string"
     */
    prepend(s: string): string

    /**
     * @rewriteGetter reverse from "@principia/base/string"
     */
    reverse: string

    /**
     * @rewrite surround_ from "@principia/base/string"
     */
    surround(s: string): string

    /**
     * @rewrite take_ from "@principia/base/string"
     */
    take(n: number): string

    /**
     * @rewrite takeLast_ from "@principia/base/string"
     */
    takeLast(n: number): string

    /**
     * @rewrite unappend_ from "@principia/base/string"
     */
    unappend(s: string): string

    /**
     * @rewrite under_ from "@principia/base/string"
     */
    under(f: (chars: ReadonlyArray<string>) => ReadonlyArray<string>): string

    /**
     * @rewrite unprepend_ from "@principia/base/string"
     */
    unprepend(s: string): string
  }
}
