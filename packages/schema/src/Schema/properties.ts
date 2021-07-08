import type * as PE from '../ParseError'
import type { Kind, URIS } from '../Schemable'
import type { DefaultConstraint, Flat } from '../util'
import type {
  AnyS,
  AnySOf,
  AnyUS,
  AnyUSOf,
  ApiOf,
  CInputOf,
  ErrorOf,
  InputOf,
  OutputOf,
  TagApi,
  TypeOf,
  URISIn
} from './core'
import type { UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as O from '@principia/base/Option'
import { isObject } from '@principia/base/util/predicates'

import { isTagS, Schema } from './core'

type URISInProperties<P> = { [K in keyof P]: P[K] extends Property<infer S, any, any> ? URISIn<S> : never }[keyof P]

type EnsurePropertyURIS<P, URIS = URISInProperties<P>> = unknown extends {
  [K in keyof P]: P[K] extends Property<infer S, any, any>
    ? Exclude<URIS, URISIn<S>> extends never
      ? URIS
      : unknown
    : unknown
}[keyof P]
  ? never
  : P

type Optional = 'optional'
type Required = 'required'
type DefaultError = 'default can only be set for required properties'

export const PropertyTypeId = Symbol()
export type PropertyTypeId = typeof PropertyTypeId

export class Property<
  S extends AnyS,
  O extends Optional | Required,
  D extends O.Option<[DefaultConstraint, () => TypeOf<S>]>
> {
  readonly [PropertyTypeId]: PropertyTypeId = PropertyTypeId
  constructor(readonly _schema: S, readonly _optional: O, readonly _def: D) {}

  schema<S1 extends AnyS>(_: S1): Property<S1, O, O.None> {
    return new Property(_, this._optional, O.none() as O.None)
  }

  opt(): Property<S, Optional, D> {
    return new Property(this._schema, 'optional', this._def)
  }

  req(): Property<S, Required, D> {
    return new Property(this._schema, 'required', this._def)
  }

  def(_: O extends Required ? () => TypeOf<S> : DefaultError): Property<S, O, O.Some<['both', () => TypeOf<S>]>>
  def<C extends DefaultConstraint>(
    _: O extends Required ? () => TypeOf<S> : DefaultError,
    constraint: C
  ): Property<S, O, O.Some<[C, () => TypeOf<S>]>>
  def(
    _: O extends Required ? () => TypeOf<S> : DefaultError,
    constraint?: DefaultConstraint
  ): Property<S, O, O.Some<[DefaultConstraint, () => TypeOf<S>]>> {
    return new Property(
      this._schema,
      this._optional,
      O.some([constraint ?? 'both', _]) as O.Some<[DefaultConstraint, () => TypeOf<S>]>
    )
  }

  undef(): Property<S, O, O.None> {
    return new Property(this._schema, this._optional, O.none() as O.None)
  }
}

export function isProperty(u: unknown): u is AnyP {
  return isObject(u) && PropertyTypeId in u
}

export interface PropertyWithInstance<
  U extends URIS,
  S extends AnyS,
  O extends Optional | Required,
  D extends O.Option<[DefaultConstraint, () => TypeOf<S>]>
> extends Property<S, O, D> {
  readonly instance: Kind<U, any, any, any, any, any, any>
}

export type AnyPropertyWithInstance<F extends URIS> = PropertyWithInstance<
  F,
  AnyS,
  Optional | Required,
  O.Option<[DefaultConstraint, () => any]>
>

export function prop<S extends AnyS>(_: S): Property<S, Required, O.None> {
  return new Property(_, 'required', O.none() as O.None)
}

export type AnyP = Property<AnyS, Required | Optional, O.Option<[DefaultConstraint, () => any]>>
export type AnyUP = Property<AnyUS, Required | Optional, O.Option<[DefaultConstraint, () => any]>>

export type AnyPOf<U extends URIS> = Property<AnySOf<U>, Required | Optional, O.Option<[DefaultConstraint, () => any]>>
export type AnyUPOf<U extends URIS> = Property<
  AnyUSOf<U>,
  Required | Optional,
  O.Option<[DefaultConstraint, () => any]>
>

export type AnyPRecord = Record<PropertyKey, AnyP>
export type AnyUPRecord = Record<PropertyKey, AnyUP>

export type PropertiesIn<P> = Flat<
  UnionToIntersection<
    {
      [K in keyof P]: P[K] extends Property<infer S, infer O, infer D>
        ? O extends Optional
          ? {
              [H in K]?: InputOf<S>
            }
          : D extends O.Some<['decoder' | 'both', any]>
          ? {
              [H in K]?: InputOf<S>
            }
          : {
              [H in K]: InputOf<S>
            }
        : never
    }[keyof P]
  >
>

export type PropertiesCIn<P extends PropertyRecord> = Flat<
  UnionToIntersection<
    {
      [K in keyof P]: K extends TagsFromProps<P>
        ? never
        : P[K] extends Property<infer S, infer O, infer D>
        ? O extends Optional
          ? {
              [H in K]?: CInputOf<S>
            }
          : D extends O.Some<['constructor' | 'both', any]>
          ? {
              [H in K]?: CInputOf<S>
            }
          : {
              [H in K]: CInputOf<S>
            }
        : never
    }[keyof P]
  >
>

export type PropertiesType<P> = Flat<
  UnionToIntersection<
    {
      [K in keyof P]: P[K] extends Property<infer S, infer O, any>
        ? O extends Optional
          ? {
              readonly [H in K]?: TypeOf<S>
            }
          : {
              readonly [H in K]: TypeOf<S>
            }
        : never
    }[keyof P]
  >
>

export type PropertiesOptput<P> = Flat<
  UnionToIntersection<
    {
      [K in keyof P]: P[K] extends Property<infer S, infer O, any>
        ? O extends Optional
          ? {
              readonly [H in K]?: OutputOf<S>
            }
          : {
              readonly [H in K]: OutputOf<S>
            }
        : never
    }[keyof P]
  >
>

export type HasRequiredProperty<P> = unknown extends {
  [K in keyof P]: P[K] extends Property<any, infer O, any> ? (O extends Required ? unknown : never) : never
}[keyof P]
  ? true
  : false

export type RequiredKeys<P, C extends DefaultConstraint> = P extends unknown
  ? {
      [K in keyof P]: P[K] extends Property<any, infer O, infer D>
        ? O extends Optional
          ? never
          : D extends O.Some<[C | 'both', any]>
          ? never
          : K
        : never
    }[keyof P]
  : never

export type OptionalKeys<P, C extends DefaultConstraint> = P extends unknown
  ? {
      [K in keyof P]: P[K] extends Property<any, infer O, infer D>
        ? O extends Optional
          ? K
          : D extends O.Some<[C | 'both', any]>
          ? K
          : never
        : never
    }[keyof P]
  : never

export type PropertiesCErr<P> = HasRequiredProperty<P> extends true
  ? PE.CompoundE<
      | {
          [K in RequiredKeys<P, 'constructor'>]: P[K] extends Property<infer S, any, any>
            ? PE.RequiredKeyE<K, ErrorOf<S>>
            : never
        }[RequiredKeys<P, 'constructor'>]
      | {
          [K in OptionalKeys<P, 'constructor'>]: P[K] extends Property<infer S, any, any>
            ? PE.OptionalKeyE<K, ErrorOf<S>>
            : never
        }[OptionalKeys<P, 'constructor'>]
    >
  : PE.CompoundE<
      {
        [K in keyof P]: P[K] extends Property<infer S, any, any> ? PE.OptionalKeyE<K, ErrorOf<S>> : never
      }[keyof P]
    >

export type PropertiesErr<P> = HasRequiredProperty<P> extends true
  ? PE.CompositionE<
      | PE.UnknownRecordLE
      | PE.UnexpectedKeysLE
      | PE.MissingKeysLE<RequiredKeys<P, 'decoder'>>
      | PE.CompoundE<
          | {
              [K in RequiredKeys<P, 'decoder'>]: P[K] extends Property<infer S, any, any>
                ? PE.RequiredKeyE<K, ErrorOf<S>>
                : never
            }[RequiredKeys<P, 'decoder'>]
          | {
              [K in OptionalKeys<P, 'decoder'>]: P[K] extends Property<infer S, any, any>
                ? PE.OptionalKeyE<K, ErrorOf<S>>
                : never
            }[OptionalKeys<P, 'decoder'>]
        >
    >
  : PE.CompositionE<
      | PE.UnknownRecordLE
      | PE.UnexpectedKeysLE
      | PE.MissingKeysLE<RequiredKeys<P, 'decoder'>>
      | PE.CompoundE<
          {
            [K in OptionalKeys<P, 'decoder'>]: P[K] extends Property<infer S, any, any>
              ? PE.OptionalKeyE<K, ErrorOf<S>>
              : never
          }[OptionalKeys<P, 'decoder'>]
        >
    >

export const PropertiesSTypeId = Symbol('@principia/schema/Schema/PropertiesS')
export type PropertiesSTypeId = typeof PropertiesSTypeId

export class PropertiesS<P extends AnyUPRecord> extends Schema<
  URISInProperties<P>,
  unknown,
  PropertiesCIn<P>,
  PropertiesErr<P>,
  PropertiesCErr<P>,
  PropertiesType<P>,
  PropertiesOptput<P>,
  { properties: P }
> {
  readonly _tag = 'Properties';

  readonly [PropertiesSTypeId]: PropertiesSTypeId = PropertiesSTypeId
  constructor(readonly properties: P) {
    super()
  }
  get api() {
    return { properties: this.properties }
  }
  clone() {
    return new PropertiesS(this.properties)
  }
}

export function isPropertiesS(u: unknown): u is PropertiesS<AnyUPRecord> {
  return isObject(u) && PropertiesSTypeId in u
}

export function properties<P extends AnyUPRecord>(properties: EnsurePropertyURIS<P>): PropertiesS<P> {
  // @ts-expect-error
  return new PropertiesS(properties)
}

export type PropertyRecord = Record<PropertyKey, AnyP>

export type TagsFromProps<P extends PropertyRecord> = {
  [K in keyof P]: P[K]['_optional'] extends 'required'
    ? ApiOf<P[K]['_schema']> extends TagApi<string>
      ? K
      : never
    : never
}[keyof P]

export function isPropertyRecord(u: unknown): u is PropertyRecord {
  return isObject(u) && A.every_(Object.keys(u), (k) => isProperty(u[k]))
}

export function tagsFromProps(props: PropertyRecord): Record<string, string> {
  const mut_tags = {}
  for (const key in props) {
    const s = props[key]._schema
    if (O.isNone(props[key]._def) && props[key]._optional === 'required' && isTagS(s)) {
      mut_tags[key] = s.api.tag
    }
  }
  return mut_tags
}
