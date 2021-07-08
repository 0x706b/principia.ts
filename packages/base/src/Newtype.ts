import { identity } from './function'

export interface Newtype<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

export type AnyNewtype = Newtype<any, any>

export interface Constructor<T, URI> {
  URI: URI
  wrap: (_: T) => Newtype<URI, T>
  unwrap: (_: Newtype<URI, T>) => T
}

export interface GenericConstructor<URI> {
  URI: URI
  wrap: <T>(_: T) => Newtype<URI, T>
  unwrap: <T>(_: Newtype<URI, T>) => T
  of: <T>() => Constructor<T, URI>
}

export interface ConstructorK<T, URI, K extends Newtype<URI, T>> {
  wrap: (_: T) => K
  unwrap: (_: K) => T
}

export const typeDef = <T>() => <URI extends string>(URI: URI): Constructor<T, URI> => ({
  URI,
  wrap: identity as any,
  unwrap: identity as any
})

export const genericDef = <URI extends string>(URI: URI): GenericConstructor<URI> => ({
  URI,
  wrap: identity as any,
  unwrap: identity as any,
  of: () => ({
    URI,
    wrap: identity as any,
    unwrap: identity as any
  })
})

export const newtype = <K extends Newtype<any, any>>() => (
  _: Constructor<K['_A'], K['_URI']>
): ConstructorK<K['_A'], K['_URI'], K> => _ as any

export type TypeOf<T extends Constructor<any, any>> = [T] extends [Constructor<infer K, infer URI>]
  ? Newtype<URI, K>
  : never

export type Generic<T, K extends GenericConstructor<any>> = [K] extends [GenericConstructor<infer URI>]
  ? Newtype<URI, T>
  : never
