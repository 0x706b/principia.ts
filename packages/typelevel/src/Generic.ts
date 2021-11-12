export type Narrowable = string | number | boolean | bigint

export type NoInfer<A> = [A][A extends any ? 0 : never]
