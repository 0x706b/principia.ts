import type { Narrowable } from './Generic'

export type Exact<A, B> = B extends unknown
  ? A extends B
    ? A extends Narrowable
      ? A
      : {
          [K in keyof A]: K extends keyof B ? Exact<A[K], B[K]> : never
        }
    : B
  : never
