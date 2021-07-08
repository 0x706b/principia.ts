import type * as PE from '../ParseError'
import type { Newtype } from '@principia/base/Newtype'
import type { Iso } from '@principia/optics/Iso'
import type { Prism } from '@principia/optics/Prism'

import * as S from './core'

export class NewtypeIsoS<S extends S.AnyS, N extends Newtype<any, S.TypeOf<S>>>
  extends S.Schema<S.URISIn<S>, S.InputOf<S>, S.CInputOf<S>, S.ErrorOf<S>, S.CErrorOf<S>, N, S.OutputOf<S>, S.ApiOf<S>>
  implements S.HasSchemaContinuation {
  readonly _tag = 'NewtypeIso'
  constructor(readonly schema: S, readonly iso: Iso<S.TypeOf<S>, N>) {
    super()
  }
  readonly [S.SchemaContinuation] = this.schema
  get api() {
    return this.schema.api
  }
  clone() {
    return new NewtypeIsoS(this.schema, this.iso)
  }
}

export function newtypeIso<S extends S.AnyS, N extends Newtype<any, S.TypeOf<S>>>(
  schema: S,
  iso: Iso<S.TypeOf<S>, N>
): NewtypeIsoS<S, N> {
  return new NewtypeIsoS(schema, iso)
}

export class NewtypePrismS<S extends S.AnyS, N extends Newtype<any, S.TypeOf<S>>>
  extends S.Schema<
    S.URISIn<S>,
    S.InputOf<S>,
    S.CInputOf<S>,
    PE.CompositionE<S.ErrorOf<S> | PE.NewtypePrismLE<S.TypeOf<S>>>,
    PE.CompositionE<S.CErrorOf<S> | PE.NewtypePrismE<S.TypeOf<S>>>,
    N,
    S.OutputOf<S>,
    S.ApiOf<S>
  >
  implements S.HasSchemaContinuation {
  readonly _tag = 'NewtypePrism'
  constructor(readonly schema: S, readonly prism: Prism<S.TypeOf<S>, N>) {
    super()
  }
  readonly [S.SchemaContinuation] = this.schema
  get api() {
    return this.schema.api
  }
  clone() {
    return new NewtypePrismS(this.schema, this.prism)
  }
}

export function newtypePrism<S extends S.AnyS, N extends Newtype<any, S.TypeOf<S>>>(
  schema: S,
  prism: Prism<S.TypeOf<S>, N>
): NewtypePrismS<S, N> {
  return new NewtypePrismS(schema, prism)
}
