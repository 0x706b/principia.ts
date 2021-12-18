import type { Length, List } from '@principia/typelevel/List'

import { unsafeCoerce } from './function'
import * as Iso from './Iso'

export declare const NewtypeId: unique symbol

export type Newtype<URI extends string, A, Subtypes extends List<Newtype<any, A>> = []> = {
  readonly [K in `_${URI}`]: A
} & (Length<Subtypes> extends 0
  ? {}
  : {
      [K in URIOf<Subtypes[number]>]: A
    })

export type AnyNewtype = Newtype<any, any>

export type GenericNewtypeOf<T, K extends GenericConstructor<any>> = [K] extends [GenericConstructor<infer URI>]
  ? Newtype<URI, T>
  : never

export type TypeOf<N extends Newtype<any, any>> = N[keyof N]

export type URIOf<N extends Newtype<any, any>> = keyof N

export interface GenericConstructor<URI extends string> {
  URI: URI
  wrap: {
    /**
     * @optimize identity
     */
    <T>(_: T): Newtype<URI, T>
  }
  unwrap: {
    /**
     * @optimize identity
     */
    <T>(_: Newtype<URI, T>): T
  }
  of: <T>() => NewtypeIso<Newtype<URI, T>>
}

export interface NewtypeIso<K extends Newtype<any, any>> extends Iso.Iso<TypeOf<K>, K> {
  get: {
    /**
     * @optimize identity
     */
    (_: TypeOf<K>): K
  }
  reverseGet: {
    /**
     * @optimize identity
     */
    (_: K): TypeOf<K>
  }
}

export const newtype = <K extends Newtype<any, any>>(): NewtypeIso<K> =>
  Iso.PIso({
    get: unsafeCoerce,
    reverseGet: unsafeCoerce
  }) as any

export const genericDef = <URI extends string>(URI: URI): GenericConstructor<URI> => ({
  URI,
  wrap: unsafeCoerce,
  unwrap: unsafeCoerce,
  of: <T>() => newtype<Newtype<URI, T>>()
})
