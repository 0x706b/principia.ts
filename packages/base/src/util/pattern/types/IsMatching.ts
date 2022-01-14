import type { IsPlainObject, Primitives } from './helpers'

export type IsMatching<A, P> =
  // Special case for unknown, because this is the type
  // of the inverted `__` wildcard pattern, which should
  // match everything.
  unknown extends P
    ? true
    : P extends Primitives
    ? P extends A
      ? true
      : false
    : [P, A] extends [readonly any[], readonly any[]]
    ? [P, A] extends [
        readonly [infer P1, infer P2, infer P3, infer P4, infer P5],
        readonly [infer A1, infer A2, infer A3, infer A4, infer A5]
      ]
      ? [IsMatching<A1, P1>, IsMatching<A2, P2>, IsMatching<A3, P3>, IsMatching<A4, P4>, IsMatching<A5, P5>] extends [
          true,
          true,
          true,
          true,
          true
        ]
        ? true
        : false
      : [P, A] extends [
          readonly [infer P1, infer P2, infer P3, infer P4],
          readonly [infer A1, infer A2, infer A3, infer A4]
        ]
      ? [IsMatching<A1, P1>, IsMatching<A2, P2>, IsMatching<A3, P3>, IsMatching<A4, P4>] extends [
          true,
          true,
          true,
          true
        ]
        ? true
        : false
      : [P, A] extends [readonly [infer P1, infer P2, infer P3], readonly [infer A1, infer A2, infer A3]]
      ? [IsMatching<A1, P1>, IsMatching<A2, P2>, IsMatching<A3, P3>] extends [true, true, true]
        ? true
        : false
      : [P, A] extends [readonly [infer P1, infer P2], readonly [infer A1, infer A2]]
      ? [IsMatching<A1, P1>, IsMatching<A2, P2>] extends [true, true]
        ? true
        : false
      : [P, A] extends [readonly [infer P1], readonly [infer A1]]
      ? IsMatching<A1, P1>
      : P extends A
      ? true
      : false
    : IsPlainObject<P> extends true
    ? true extends ( // `true extends union` means "if some cases of the a union are matching"
        A extends any // loop over the `a` union
          ? [keyof P & keyof A] extends [never] // if no common keys
            ? false
            : /**
             * Intentionally not using ValueOf, to avoid reaching the
             * 'type instanciation is too deep error'.
             */
            { [k in keyof P & keyof A]: IsMatching<A[k], P[k]> }[keyof P & keyof A] extends true
            ? true // all values are matching
            : false
          : never
      )
      ? true
      : false
    : P extends A
    ? true
    : false
