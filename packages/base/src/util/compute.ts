/**
 * Forked from ts-toolbelt
 * https://github.com/millsp/ts-toolbelt/blob/9c27a61b39eae7f2794c349973e78023894885c3/sources/Any/Compute.ts#L1
 */

/**
 * @hidden
 */
export type ComputeRaw<A extends any> = A extends Function ? A : { [K in keyof A]: A[K] } & unknown

/**
 * @hidden
 */
type ComputeFlat<A extends any> = A extends BuiltIn
  ? A
  : A extends Array<any>
  ? A extends Array<Record<Key, any>>
    ? Array<{ [K in keyof A[number]]: A[number][K] } & unknown>
    : A
  : A extends ReadonlyArray<any>
  ? A extends ReadonlyArray<Record<Key, any>>
    ? ReadonlyArray<{ [K in keyof A[number]]: A[number][K] } & unknown>
    : A
  : { [K in keyof A]: A[K] } & unknown

/**
 * @hidden
 */
type ComputeDeep<A extends any, Seen = never> = A extends BuiltIn
  ? A
  : If<
      Has<Seen, A>,
      A,
      A extends Array<any>
        ? A extends Array<Record<Key, any>>
          ? Array<{ [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen> } & unknown>
          : A
        : A extends ReadonlyArray<any>
        ? A extends ReadonlyArray<Record<Key, any>>
          ? ReadonlyArray<{ [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen> } & unknown>
          : A
        : { [K in keyof A]: ComputeDeep<A[K], A | Seen> } & unknown
    >

/**
 * Force TS to load a type that has not been computed (to resolve composed
 * types that TS haven't fully resolved, for display purposes mostly).
 * @param A to compute
 * @returns `A`
 * @example
 */
export type Compute<A extends any, depth extends Depth = 'deep'> = {
  flat: ComputeFlat<A>
  deep: ComputeDeep<A>
}[depth]

type Depth = 'flat' | 'deep'

export type Boolean = 0 | 1

type Key = string | number | symbol

/**
 * Check whether `U` contains `U1`
 * @param U to be inspected
 * @param U1 to check within
 * @returns [[Boolean]]
 * @example
 */
type Has<U extends any, U1 extends any> = [U1] extends [U] ? 1 : 0

type BuiltIn = Function | Error | Date | { readonly [Symbol.toStringTag]: string } | RegExp | Generator

export type If<B extends Boolean, Then, Else = never> = {
  0: Else
  1: Then
}[B]
