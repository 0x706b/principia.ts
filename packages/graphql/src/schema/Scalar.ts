import type { GQLException } from './GQLException'
import type { FunctionN } from '@principia/base/function'
import type * as Sy from '@principia/base/Sync'
import type * as U from '@principia/base/util/types'
import type { DirectiveNode, ValueNode } from 'graphql'

export interface ScalarConfig {
  readonly description?: string
  readonly directives?: Array<DirectiveNode>
}

export type SerializeF<R, A> = (u: unknown) => Sy.Sync<R, GQLException, A>
export type ParseValueF<R, E> = (u: unknown) => Sy.Sync<R, GQLException, E>
export type ParseLiteralF<R, E> = (valueNode: ValueNode) => Sy.Sync<R, GQLException, E>

export interface ScalarFunctions<I, O> {
  parseLiteral: ParseLiteralF<any, I>
  parseValue: ParseValueF<any, I>
  serialize: SerializeF<any, O>
}

export type Scalar<Name, E, A> = {
  functions: ScalarFunctions<E, A>
  name: Name
}

export type _I<Fs> = Fs extends ScalarFunctions<infer I, any> ? I : never
export type _O<Fs> = Fs extends ScalarFunctions<any, infer O> ? O : never

export type ScalarEnv<S extends Scalar<any, any, any>> = U.UnionToIntersection<
  {
    [k in keyof S['functions']]: S['functions'][k] extends FunctionN<any, infer Ret>
      ? Ret extends Sy.Sync<infer R, any, any>
        ? R
        : never
      : never
  }[keyof S['functions']]
>

export type SchemaScalars = {
  [n: string]: Scalar<any, any, any>
}

export type SchemaScalarsEnv<S extends SchemaScalars> = U.UnionToIntersection<
  {
    [k in keyof S]: ScalarEnv<S[k]>
  }[keyof S]
>
