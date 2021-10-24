/* eslint-disable @typescript-eslint/no-empty-function */
import type { InvertPattern } from './types/InvertPattern'
import type { Match, MatchedValue, PickReturnValue, Unset } from './types/Match'
import type {
  AnonymousSelectPattern,
  GuardPattern,
  GuardValue,
  NamedSelectPattern,
  NotPattern,
  Pattern
} from './types/Pattern'

import { ANONYMOUS_SELECT_KEY, instanceOf, not, select, when } from './guards'
import * as symbols from './symbols'
import { __ } from './wildcards'

/**
 * # Pattern matching
 **/

export { __, instanceOf, not, Pattern, select, when }

/**
 * #### match
 *
 * Entry point to create a pattern matching expression.
 *
 * It returns a `Match` builder, on which you can chain
 * several `.with(pattern, handler)` clauses.
 */
export const match = <I, O = Unset>(value: I): Match<I, O> => builder(value, []) as any

/**
 * ### builder
 * This is the implementation of our pattern matching, using the
 * builder pattern.
 */
const builder = <I, O>(
  value: I,
  cases: {
    test: (value: I) => unknown
    select: (value: I) => any
    handler: (...args: any) => any
  }[]
) => {
  const run = () => {
    const entry = cases.find(({ test }) => test(value))
    if (!entry) {
      let displayedValue
      try {
        displayedValue = JSON.stringify(value)
      } catch (e) {
        displayedValue = value
      }
      throw new Error(`Pattern matching error: no pattern matches value ${displayedValue}`)
    }
    return entry.handler(entry.select(value), value)
  }

  return {
    with(...args: any[]) {
      const handler = args[args.length - 1]

      const patterns: Pattern<I>[]                = []
      const predicates: ((value: I) => unknown)[] = []
      for (let i = 0; i < args.length - 1; i++) {
        const arg = args[i]
        if (typeof arg === 'function') {
          predicates.push(arg)
        } else {
          patterns.push(arg)
        }
      }

      let selected: Record<string, unknown> = {}

      const doesMatch = (value: I) =>
        Boolean(
          patterns.some((pattern) =>
            matchPattern(pattern, value, (key, value) => {
              selected[key] = value
            })
          ) && predicates.every((predicate) => predicate(value as any))
        )

      return builder(
        value,
        cases.concat([
          {
            test: doesMatch,
            handler,
            select: (value) =>
              Object.keys(selected).length
                ? selected[ANONYMOUS_SELECT_KEY] !== undefined
                  ? selected[ANONYMOUS_SELECT_KEY]
                  : selected
                : value
          }
        ])
      )
    },

    when: <P extends (value: I) => unknown, C>(
      predicate: P,
      handler: (value: GuardValue<P>) => PickReturnValue<O, C>
    ) =>
      builder<I, PickReturnValue<O, C>>(
        value,
        cases.concat([
          {
            test: predicate,
            handler,
            select: (value) => value
          }
        ])
      ),

    otherwise: <C>(handler: (value: I) => PickReturnValue<O, C>): PickReturnValue<O, C> =>
      builder<I, PickReturnValue<O, C>>(
        value,
        cases.concat([
          {
            test: () => true,
            handler,
            select: (value) => value
          }
        ])
      ).run(),

    exhaustive: () => run(),

    run
  }
}

const isObject = (value: unknown): value is Object => Boolean(value && typeof value === 'object')

const isGuardPattern = (x: unknown): x is GuardPattern<unknown> => {
  const pattern = x as GuardPattern<unknown>
  return pattern && pattern[symbols.PatternKind] === symbols.Guard
}

const isNotPattern = (x: unknown): x is NotPattern<unknown> => {
  const pattern = x as NotPattern<unknown>
  return pattern && pattern[symbols.PatternKind] === symbols.Not
}

const isNamedSelectPattern = (x: unknown): x is NamedSelectPattern<string> => {
  const pattern = x as NamedSelectPattern<string>
  return pattern && pattern[symbols.PatternKind] === symbols.NamedSelect
}

const isAnonymousSelectPattern = (x: unknown): x is AnonymousSelectPattern => {
  const pattern = x as AnonymousSelectPattern
  return pattern && pattern[symbols.PatternKind] === symbols.AnonymousSelect
}

// tells us if the value matches a given pattern.
const matchPattern = <I, P extends Pattern<I>>(
  pattern: P,
  value: I,
  select: (key: string, value: unknown) => void
): boolean => {
  if (isObject(pattern)) {
    if (isGuardPattern(pattern)) return Boolean(pattern[symbols.Guard](value))

    if (isNamedSelectPattern(pattern)) {
      select(pattern[symbols.NamedSelect], value)
      return true
    }

    if (isAnonymousSelectPattern(pattern)) {
      select(ANONYMOUS_SELECT_KEY, value)
      return true
    }

    if (isNotPattern(pattern)) {
      return !matchPattern(pattern[symbols.Not] as Pattern<I>, value, select)
    }

    if (!isObject(value)) return false

    if (Array.isArray(pattern)) {
      if (!Array.isArray(value)) return false

      // List pattern
      if (pattern.length === 1) {
        const selected: Record<string, unknown[]> = {}

        const listSelect = (key: string, value: unknown) => {
          selected[key] = (selected[key] || []).concat([value])
        }

        const doesMatch = value.every((v) => matchPattern(pattern[0], v, listSelect))

        if (doesMatch) {
          Object.keys(selected).forEach((key) => select(key, selected[key]))
        }

        return doesMatch
      }

      // Tuple pattern
      return pattern.length === value.length
        ? pattern.every((subPattern, i) => matchPattern(subPattern, value[i], select))
        : false
    }

    if (pattern instanceof Map) {
      if (!(value instanceof Map)) return false
      return [...pattern.keys()].every((key) => matchPattern(pattern.get(key), value.get(key), select))
    }

    if (pattern instanceof Set) {
      if (!(value instanceof Set)) return false

      if (pattern.size === 0) return value.size === 0

      if (pattern.size === 1) {
        const [subPattern] = [...pattern.values()]
        return Object.values(__).includes(subPattern)
          ? matchPattern([subPattern], [...value.values()], select)
          : value.has(subPattern)
      }

      return [...pattern.values()].every((subPattern) => value.has(subPattern))
    }

    return Object.keys(pattern).every(
      (k: string): boolean =>
        k in value &&
        matchPattern(
          // @ts-ignore
          pattern[k],
          // @ts-ignore
          value[k],
          select
        )
    )
  }

  return value === pattern
}

/**
 * Helper function taking a pattern and returning a **type guard** function telling
 * us whether or not a value matches the pattern.
 *
 * @param pattern the Pattern the value should match
 * @returns a function taking the value and returning whether or not it matches the pattern.
 */
export function isMatching<P extends Pattern<any>>(
  pattern: P
): (value: any) => value is MatchedValue<any, InvertPattern<P>>
/**
 * **type guard** function taking a pattern and a value and returning a boolean telling
 * us whether or not the value matches the pattern.
 *
 * @param pattern the Pattern the value should match
 * @param value
 * @returns a boolean telling whether or not the value matches the pattern.
 */
export function isMatching<P extends Pattern<any>>(pattern: P, value: any): value is MatchedValue<any, InvertPattern<P>>
export function isMatching<P extends Pattern<any>>(
  ...args: [pattern: P, value?: any]
): boolean | ((vale: any) => boolean) {
  if (args.length === 1) {
    const [pattern] = args
    return (value: any): value is MatchedValue<any, InvertPattern<P>> => matchPattern(pattern, value, () => {})
  }
  if (args.length === 2) {
    const [pattern, value] = args
    return matchPattern(pattern, value, () => {})
  }

  throw new Error(`isMatching wasn't given enough arguments: expected 1 or 2, received ${args.length}.`)
}
