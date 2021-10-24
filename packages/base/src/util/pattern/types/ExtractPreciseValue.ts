import type { ExcludeObjectIfContainsNever, IsAny, IsPlainObject, LeastUpperBound } from './helpers'
import type { NotPattern } from './Pattern'

export type ExtractPreciseValue<A, B> = unknown extends B
  ? A
  : IsAny<A> extends true
  ? B
  : B extends readonly []
  ? []
  : B extends NotPattern<infer B1>
  ? Exclude<A, B1>
  : B extends readonly (infer BItem)[]
  ? A extends readonly (infer AItem)[]
    ? B extends readonly [infer B1, infer B2, infer B3, infer B4, infer B5]
      ? A extends readonly [infer A1, infer A2, infer A3, infer A4, infer A5]
        ? ExcludeObjectIfContainsNever<
            [
              ExtractPreciseValue<A1, B1>,
              ExtractPreciseValue<A2, B2>,
              ExtractPreciseValue<A3, B3>,
              ExtractPreciseValue<A4, B4>,
              ExtractPreciseValue<A5, B5>
            ],
            '0' | '1' | '2' | '3' | '4'
          >
        : LeastUpperBound<A, B>
      : B extends readonly [infer B1, infer B2, infer B3, infer B4]
      ? A extends readonly [infer A1, infer A2, infer A3, infer A4]
        ? ExcludeObjectIfContainsNever<
            [
              ExtractPreciseValue<A1, B1>,
              ExtractPreciseValue<A2, B2>,
              ExtractPreciseValue<A3, B3>,
              ExtractPreciseValue<A4, B4>
            ],
            '0' | '1' | '2' | '3'
          >
        : LeastUpperBound<A, B>
      : B extends readonly [infer B1, infer B2, infer B3]
      ? A extends readonly [infer A1, infer A2, infer A3]
        ? ExcludeObjectIfContainsNever<
            [ExtractPreciseValue<A1, B1>, ExtractPreciseValue<A2, B2>, ExtractPreciseValue<A3, B3>],
            '0' | '1' | '2'
          >
        : LeastUpperBound<A, B>
      : B extends readonly [infer B1, infer B2]
      ? A extends readonly [infer A1, infer A2]
        ? ExcludeObjectIfContainsNever<[ExtractPreciseValue<A1, B1>, ExtractPreciseValue<A2, B2>], '0' | '1'>
        : LeastUpperBound<A, B>
      : ExtractPreciseValue<AItem, BItem> extends infer preciseValue
      ? [preciseValue] extends [never]
        ? never
        : preciseValue[]
      : never
    : LeastUpperBound<A, B>
  : B extends Map<infer BK, infer BV>
  ? A extends Map<infer AK, infer AV>
    ? Map<ExtractPreciseValue<AK, BK>, ExtractPreciseValue<AV, BV>>
    : LeastUpperBound<A, B>
  : B extends Set<infer BV>
  ? A extends Set<infer AV>
    ? Set<ExtractPreciseValue<AV, BV>>
    : LeastUpperBound<A, B>
  : IsPlainObject<B> extends true
  ? A extends object
    ? A extends B
      ? A
      : B extends A
      ? B
      : [keyof A & keyof B] extends [never]
      ? never
      : ExcludeObjectIfContainsNever<
          {
            // we use Required to remove the optional property modifier (?:).
            // since we use a[k] after that, optional properties will stay
            // optional if no pattern was more precise.
            [K in keyof Required<A>]: K extends keyof B ? ExtractPreciseValue<A[K], B[K]> : A[K]
          },
          keyof B & string
        >
    : LeastUpperBound<A, B>
  : LeastUpperBound<A, B>
