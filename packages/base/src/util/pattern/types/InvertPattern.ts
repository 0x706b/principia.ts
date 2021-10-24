import type * as symbols from '../symbols'
import type { IsLiteral, IsPlainObject, Primitives } from './helpers'
import type { AnonymousSelectPattern, GuardPattern, NamedSelectPattern, NotPattern } from './Pattern'

/**
 * ### InvertPattern
 * Since patterns have special wildcard values, we need a way
 * to transform a pattern into the type of value it represents
 */
export type InvertPattern<P> = P extends NamedSelectPattern<any> | AnonymousSelectPattern
  ? keyof P extends symbols.PatternKind | symbols.NamedSelect
    ? unknown
    : InvertPattern<Omit<P, symbols.PatternKind | symbols.NamedSelect>>
  : P extends GuardPattern<infer P1, infer P2>
  ? [P2] extends [never]
    ? P1
    : P2
  : P extends NotPattern<infer A1>
  ? NotPattern<InvertPattern<A1>>
  : P extends Primitives
  ? P
  : P extends readonly (infer PP)[]
  ? P extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>, InvertPattern<P4>, InvertPattern<P5>]
    : P extends readonly [infer P1, infer P2, infer P3, infer P4]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>, InvertPattern<P4>]
    : P extends readonly [infer P1, infer P2, infer P3]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>]
    : P extends readonly [infer P1, infer P2]
    ? [InvertPattern<P1>, InvertPattern<P2>]
    : InvertPattern<PP>[]
  : P extends Map<infer PK, infer PV>
  ? Map<PK, InvertPattern<PV>>
  : P extends Set<infer PV>
  ? Set<InvertPattern<PV>>
  : IsPlainObject<P> extends true
  ? { [K in keyof P]: InvertPattern<P[K]> }
  : P

/**
 * ### InvertPatternForExclude
 */
export type InvertPatternForExclude<P, I> = P extends NotPattern<infer P1>
  ? Exclude<I, P1>
  : P extends NamedSelectPattern<any> | AnonymousSelectPattern
  ? keyof P extends symbols.PatternKind | symbols.NamedSelect
    ? unknown
    : InvertPatternForExclude<Omit<P, symbols.PatternKind | symbols.NamedSelect>, I>
  : P extends GuardPattern<any, infer P1>
  ? P1
  : P extends Primitives
  ? IsLiteral<P> extends true
    ? P
    : IsLiteral<I> extends true
    ? P
    : never
  : P extends readonly (infer PP)[]
  ? I extends readonly (infer II)[]
    ? P extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
      ? I extends readonly [infer I1, infer I2, infer I3, infer I4, infer I5]
        ? [
            InvertPatternForExclude<P1, I1>,
            InvertPatternForExclude<P2, I2>,
            InvertPatternForExclude<P3, I3>,
            InvertPatternForExclude<P4, I4>,
            InvertPatternForExclude<P5, I5>
          ]
        : never
      : P extends readonly [infer P1, infer P2, infer P3, infer P4]
      ? I extends readonly [infer I1, infer I2, infer I3, infer I4]
        ? [
            InvertPatternForExclude<P1, I1>,
            InvertPatternForExclude<P2, I2>,
            InvertPatternForExclude<P3, I3>,
            InvertPatternForExclude<P4, I4>
          ]
        : never
      : P extends readonly [infer P1, infer P2, infer P3]
      ? I extends readonly [infer I1, infer I2, infer I3]
        ? [InvertPatternForExclude<P1, I1>, InvertPatternForExclude<P2, I2>, InvertPatternForExclude<P3, I3>]
        : never
      : P extends readonly [infer P1, infer P2]
      ? I extends readonly [infer I1, infer I2]
        ? [InvertPatternForExclude<P1, I1>, InvertPatternForExclude<P2, I2>]
        : never
      : InvertPatternForExclude<PP, II>[]
    : never
  : P extends Map<infer PK, infer PV>
  ? I extends Map<any, infer IV>
    ? Map<PK, InvertPatternForExclude<PV, IV>>
    : never
  : P extends Set<infer PV>
  ? I extends Set<infer IV>
    ? Set<InvertPatternForExclude<PV, IV>>
    : never
  : IsPlainObject<P> extends true
  ? I extends object
    ? [keyof P & keyof I] extends [never]
      ? never
      : {
          [K in keyof P]: K extends keyof I ? InvertPatternForExclude<P[K], I[K]> : P[K]
        }
    : never
  : never
