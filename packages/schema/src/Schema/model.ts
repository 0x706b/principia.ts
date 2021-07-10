import type { Constructor } from '../Constructor'
import type { Decoder } from '../Decoder'
import type { Encoder } from '../Encoder'
import type { Guard } from '../Guard'
import type { CoreURIS } from '../Modules'
import type * as PE from '../ParseError'
import type { SchemaAnnotation } from './SchemaAnnotation'

import * as Ct from '../Constructor'
import * as D from '../Decoder'
import * as E from '../Encoder'
import * as Eq from '../Eq'
import * as Gen from '../Gen'
import * as G from '../Guard'
import * as S from './core'
import { to } from './interpreter'
import { SchemaAnnotationMap } from './SchemaAnnotationMap'
import * as Schemed from './schemed'

export type SchemaForModel<M, S extends S.AnyS> = S.Schema<
  S.URISIn<S> | CoreURIS,
  S.InputOf<S>,
  S.CInputOf<S>,
  S.ErrorOf<S>,
  S.CErrorOf<S>,
  M,
  S.OutputOf<S>,
  S.ApiOf<S>
>

export type DecoderFor<S extends S.AnyS> = Decoder<S.InputOf<S>, S.ErrorOf<S>, S.TypeOf<S>>

export type ConstructorFor<S extends S.AnyS> = Constructor<S.CInputOf<S>, S.CErrorOf<S>, S.TypeOf<S>>

export type EncoderFor<S extends S.AnyS> = Encoder<S.TypeOf<S>, S.OutputOf<S>>

export type GuardFor<S extends S.AnyS> = Guard<S.TypeOf<S>>

export type ArbitraryFor<S extends S.AnyS> = Gen.Gen<S.TypeOf<S>>

export type EqFor<S extends S.AnyS> = Eq.Eq<S.TypeOf<S>>

export type ModelFor<M, S extends S.AnyS> = M extends S.TypeOf<S>
  ? SchemaForModel<M, S>
  : SchemaForModel<S.TypeOf<S>, S>

export interface Model<M, S extends S.AnyS>
  extends Schemed.Schemed<S>,
    S.Schema<
      S.URISIn<S>,
      S.InputOf<S>,
      S.CInputOf<S>,
      PE.NamedE<string, S.ErrorOf<S>>,
      PE.NamedE<string, S.CErrorOf<S>>,
      M,
      S.OutputOf<S>,
      S.ApiOf<S>
    > {
  [Schemed.schemaField]: S

  readonly decode: DecoderFor<SchemaForModel<M, S>>['parse']

  readonly create: ConstructorFor<SchemaForModel<M, S>>['parse']

  readonly encode: EncoderFor<SchemaForModel<M, S>>['encode']

  readonly is: GuardFor<SchemaForModel<M, S>>['is']

  readonly gen: ArbitraryFor<SchemaForModel<M, S>>

  readonly equals: EqFor<SchemaForModel<M, S>>['equals_']
}

/**
 * @inject genericName
 */
export function Model<M>(__name?: string) {
  return <S extends S.AnyS>(schema: CoreURIS extends S.URISIn<S> ? S : never): Model<M, S> => {
    const schemed       = Schemed.Schemed(S.named_(schema, __name ?? 'Model(Anonymous)'))
    const schemedSchema = Schemed.schema(schemed)

    Object.defineProperty(schemed, S.SchemaTypeId, {
      value: S.SchemaTypeId
    })

    Object.defineProperty(schemed, S.SchemaContinuation, {
      value: schemedSchema
    })

    Object.defineProperty(schemed, 'annotations', {
      value: SchemaAnnotationMap.empty
    })

    Object.defineProperty(schemed, 'api', {
      get() {
        return schemedSchema.api
      }
    })

    Object.defineProperty(schemed, 'clone', {
      value() {
        return Model(__name)(schema)
      }
    })

    Object.defineProperty(schemed, '>>>', {
      value: schemedSchema['>>>']
    })

    Object.defineProperty(schemed, 'decode', {
      value: to(D.Schemable)(schemedSchema).parse
    })

    Object.defineProperty(schemed, 'create', {
      value: to(Ct.Schemable)(schemedSchema).parse
    })

    Object.defineProperty(schemed, 'encode', {
      value: to(E.Schemable)(schemedSchema).encode
    })

    Object.defineProperty(schemed, 'is', {
      value: to(G.Schemable)(schemedSchema).is
    })

    Object.defineProperty(schemed, 'gen', {
      value: to(Gen.Schemable)(schemedSchema)
    })

    Object.defineProperty(schemed, 'equals', {
      value: to(Eq.Schemable)(schemedSchema).equals_
    })

    Object.defineProperty(schemed, 'annotate', {
      value<V>(this: S.AnyS, key: SchemaAnnotation<V>, value: V) {
        const copy = this.clone()
        // @ts-expect-error
        copy.annotations = this.annotations.annotate(key, value)
        return copy as any
      }
    })

    Object.defineProperty(schemed, 'getAnnotation', {
      value<V>(key: SchemaAnnotation<V>): V {
        return this.annotations.get(key)
      }
    })

    // @ts-expect-error the following is correct
    return schemed
  }
}
