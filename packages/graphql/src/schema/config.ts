import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

export interface InputTypeConfig<A> {
  defaultValue?: A
  description?: string
  list?: boolean | [boolean]
  nullable?: boolean
}
export interface OutputTypeConfig {
  deprecation?: string
  description?: string
  list?: boolean | [boolean]
  nullable?: boolean
}

export type EvaluateConfig<Config extends OutputTypeConfig | InputTypeConfig<A>, A> = OutputTypeConfig extends Config
  ? A
  : InputTypeConfig<A> extends Config
  ? A
  : EvaluateNullableConfig<Config, EvaluateListConfig<Config, A>>

export type EvaluateListConfig<Config extends OutputTypeConfig | InputTypeConfig<A>, A> = true extends Config['list']
  ? Array<A>
  : [true] extends Config['list']
  ? NonEmptyArray<A>
  : [false] extends Config['list']
  ? Array<A>
  : A

export type EvaluateNullableConfig<Config extends OutputTypeConfig, A> = Config['nullable'] extends true
  ? A | undefined
  : A
