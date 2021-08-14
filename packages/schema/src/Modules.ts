import type { Constructor } from './Constructor'
import type { Decoder } from './Decoder'
import type { Encoder } from './Encoder'
import type { Guard } from './Guard'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/IO/Random'
import type { Eq } from '@principia/base/prelude'
import type { Gen } from '@principia/test/Gen'
import type { Sized } from '@principia/test/Sized'

export const GuardSURI = '@principia/schema/Guard'
export type GuardSURI = typeof GuardSURI

export const DecoderSURI = '@principia/schema/Decoder'
export type DecoderSURI = typeof DecoderSURI

export const ConstructorSURI = '@principia/schema/Constructor'
export type ConstructorSURI = typeof ConstructorSURI

export const EncoderSURI = '@principia/schema/Encoder'
export type EncoderSURI = typeof EncoderSURI

export const GenSURI = '@principia/schema/Gen'
export type GenSURI = typeof GenSURI

export const EqSURI = '@principia/schema/Eq'
export type EqSURI = typeof EqSURI

export type CoreURIS = DecoderSURI | EncoderSURI | GuardSURI | EqSURI | GenSURI | ConstructorSURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    [DecoderSURI]: Decoder<I, E, A>
    [EncoderSURI]: Encoder<I, A>
  }
}

declare module './Schemable' {
  interface URItoSchemable<I, CI, E, CE, A, O> {
    [DecoderSURI]: Decoder<I, E, A>
    [ConstructorSURI]: Constructor<CI, CE, A>
    [EncoderSURI]: Encoder<A, O>
    [GuardSURI]: Guard<A>
    [EqSURI]: Eq<A>
    [GenSURI]: Gen<Has<Random> & Has<Sized>, A>
  }
  interface URItoIdentity<A> {
    [EqSURI]: Eq<A>
    [GuardSURI]: Guard<A>
    [GenSURI]: Gen<Has<Random> & Has<Sized>, A>
  }

  interface IdentityOmits {
    [DecoderSURI]: any
    [EncoderSURI]: any
    [ConstructorSURI]: any
  }

  interface IdentityRequires {
    [GuardSURI]: any
  }
}
