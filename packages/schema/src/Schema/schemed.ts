import type { CoreURIS } from '../Modules'

import { isFunction, pipe } from '@principia/base/prelude'
import * as St from '@principia/base/Structural'
import * as Th from '@principia/base/These'

import * as Ct from '../Constructor'
import * as D from '../Decoder'
import * as Gen from '../Gen'
import * as Pr from '../Parser'
import * as S from './core'
import { to } from './interpreter'
import { unsafeCondemn } from './unsafe'

export const schemaField = Symbol('@principia/schema/Schema/schemed/schemaField')
export type schemaField = typeof schemaField

export interface SchemedOut<S extends S.AnyS> {
  [schemaField]: S
  new (_: any): S.TypeOf<S>
}

export const SchemedTypeId = Symbol('@principia/schema/Schema/schemed/Schemed')
export type SchemedTypeId = typeof SchemedTypeId

export function isSchemed(u: unknown): u is SchemedOut<any> {
  return isFunction(u) && u[SchemedTypeId] === SchemedTypeId
}

export type TypeFromSchemedOut<
  C extends {
    new (_: any): any
  }
> = C extends {
  new (_: any): infer T
}
  ? T
  : never

export type SchemaForSchemed<S extends SchemedOut<S.AnyS>> = [S[schemaField]] extends [
  S.Schema<CoreURIS, infer In, infer CIn, infer Err, infer CErr, any, infer Out, infer Api>
]
  ? S.Schema<CoreURIS, In, CIn, Err, CErr, TypeFromSchemedOut<S>, Out, Api>
  : never

export interface Copy {
  copy(args: {} extends this ? void : Partial<Omit<this, 'copy'>>): this
}

export interface Schemed<S extends S.AnyS> {
  [schemaField]: S
  new (_: S.CInputOf<S>): S.TypeOf<S> & Copy
}

type TypeFromClass<
  C extends {
    new (_: any): any
  }
> = C extends {
  new (_: any): infer T
}
  ? T
  : never

export const fromFields = Symbol()
export type fromFields = typeof fromFields

export function Schemed<S extends S.AnyS>(schema: S): Schemed<S> {
  const create = pipe(to(Ct.Schemable)(schema).parse, unsafeCondemn)
  // @ts-expect-error
  return class Schemed {
    static [schemaField]   = schema
    static [SchemedTypeId] = SchemedTypeId
    constructor(i?: S.CInputOf<S>) {
      if (i) {
        this[fromFields](create(i))
      }
    }
    [fromFields](fields: any) {
      for (const k in fields) {
        this[k] = fields[k]
      }
    }
    copy(partial: any) {
      // @ts-expect-error
      const inst = new this.constructor()
      inst[fromFields]({ ...this, ...partial })
      return inst
    }
    get [St.$hash](): number {
      const ka = Object.keys(this).sort()
      if (ka.length === 0) {
        return 0
      }
      let hash = St.combineHash(St.hashString(ka[0]!), St.hash(this[ka[0]!]))
      let i    = 1
      while (hash && i < ka.length) {
        hash = St.combineHash(hash, St.combineHash(St.hashString(ka[i]!), St.hash(this[ka[i]!])))
        i++
      }
      return hash
    }
    [St.$equals](that: unknown): boolean {
      if (!(that instanceof this.constructor)) {
        return false
      }
      const ka = Object.keys(this)
      const kb = Object.keys(that)
      if (ka.length !== kb.length) {
        return false
      }
      let eq    = true
      let i     = 0
      const ka_ = ka.sort()
      const kb_ = kb.sort()
      while (eq && i < ka.length) {
        eq = ka_[i] === kb_[i] && St.equals(this[ka_[i]!], this[kb_[i]!])
        i++
      }
      return eq
    }
  }
}

export function schema<S extends SchemedOut<any>>(self: S) {
  const guard  = (u: unknown): u is TypeFromClass<S> => u instanceof self
  const create = to(Ct.Schemable)(self[schemaField])
  const decode = to(D.Schemable)(self[schemaField])
  const gen    = to(Gen.Schemable)(self[schemaField])

  const schema = pipe(
    self[schemaField],
    S.is(guard),
    S.constructor(
      Pr.parser((u: any): any => {
        return Th.match_(
          create.parse(u),
          Th.left,
          (_) => {
            // @ts-expect-error
            const x = new self() as TypeFromClass<S>
            x[fromFields](_)
            return Th.right(x)
          },
          (e, _) => {
            // @ts-expect-error
            const x = new self() as TypeFromClass<S>
            x[fromFields](_)
            return Th.both(e, x)
          }
        )
      }, create.label)
    ),
    S.decoder(
      Pr.parser((u: any): any => {
        return Th.match_(
          decode.parse(u),
          Th.left,
          (_) => {
            // @ts-expect-error
            const x = new self() as TypeFromClass<S>
            x[fromFields](_)
            return Th.right(x)
          },
          (e, _) => {
            // @ts-expect-error
            const x = new self() as TypeFromClass<S>
            x[fromFields](_)
            return Th.both(e, x)
          }
        )
      }, decode.label)
    ),
    S.gen(
      Gen.map_(gen, (out) => {
        // @ts-expect-error
        const x = new self() as TypeFromClass<S>
        x[fromFields](out)
        return x
      })
    ),
    S.mapApi(() => self[schemaField].api)
  )

  return schema as SchemaForSchemed<S>
}
