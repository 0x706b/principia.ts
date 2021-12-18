import { unsafeCoerce } from './function'
import * as Iso from './Iso'

export declare const NewtypeId: unique symbol

export interface Newtype<URI extends string, A> {
  _URI: URI
  _A: A
}

export type AnyNewtype = Newtype<any, any>

export type GenericNewtypeOf<T, K extends GenericConstructor<any>> = [K] extends [GenericConstructor<infer URI>]
  ? Newtype<URI, T>
  : never

export type TypeOf<N extends Newtype<any, any>> = N['_A']

export type URIOf<N extends Newtype<any, any>> = N['_URI']

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
