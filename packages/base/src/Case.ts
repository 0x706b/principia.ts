import type { Equatable } from './Structural/Equatable'
import type { Hashable } from './Structural/Hashable'
import type { IsEqualTo } from './util/types'

import { isObject } from './prelude'
import { $equals, equals } from './Structural/Equatable'
import { _combineHash, $hash, hash, hashString } from './Structural/Hashable'

export const CaseTypeId = Symbol('@principia/base/Case')
export type CaseTypeId = typeof CaseTypeId

const $keys = Symbol('@principia/base/Case/$keys')
const $args = Symbol('@principia/base/Case/$args')

export interface CaseArgs {
  readonly [CaseTypeId]: ReadonlyArray<string>
}

export interface Copy<T> {
  copy(args: IsEqualTo<T, {}> extends true ? void : Partial<T>): this
}

export interface CaseConstructor {
  [CaseTypeId]: ReadonlyArray<string>
  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T & Copy<T> & CaseArgs
}

export function isCaseClass(u: unknown): u is CaseConstructor {
  return isObject(u) && CaseTypeId in u
}

const h0 = hashString('@principia/base/Case')

// @ts-expect-error
export const CaseClass: CaseConstructor = class<T> implements Hashable, Equatable, CaseArgs {
  private [$args]: T
  private [$keys]: ReadonlyArray<string> = []
  constructor(args: T) {
    this[$args] = args
    if (isObject(args)) {
      const keys = Object.keys(args)
      for (let i = 0; i < keys.length; i++) {
        this[keys[i]] = args[keys[i]]
      }
      this[$keys] = keys.sort()
    }
  }

  get [CaseTypeId](): ReadonlyArray<string> {
    return this[$keys]
  }

  get [$hash](): number {
    let h = h0
    for (const k of this[$keys]) {
      h = _combineHash(h, hash(this[k]))
    }
    return h
  }

  [$equals](that: unknown): boolean {
    if (this === that) {
      return true
    }
    if (that instanceof this.constructor) {
      const kthat = that[CaseTypeId]
      const len   = kthat.length
      if (len !== this[$keys].length) {
        return false
      }

      let result = true
      let i      = 0

      while (result && i < len) {
        result = this[$keys][i] === kthat[i] && equals(this[this[$keys][i]], that[kthat[i]])
        i++
      }

      return result
    }
    return false
  }

  copy(args: Partial<T>): this {
    // @ts-expect-error
    return new this.constructor({ ...this[$args], ...args })
  }
}

export interface CaseConstructorTagged<Tag extends string | symbol, K extends string | symbol> {
  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T & Copy<T> & { readonly [k in K]: Tag }
}

export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key: Key
): CaseConstructorTagged<Tag, Key>
export function Tagged<Tag extends string | symbol>(tag: Tag): CaseConstructorTagged<Tag, '_tag'>
export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key?: Key
): CaseConstructorTagged<Tag, string> {
  if (key) {
    class X extends CaseClass<{}> {
      // @ts-expect-error
      readonly [key] = tag
    }
    // @ts-expect-error
    return X
  }
  class X extends CaseClass<{}> {
    readonly _tag = tag
  }

  // @ts-expect-error
  return X
}
