import type { CastToNumber } from './util'
import type { Chunk } from '@principia/base/Chunk'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Predicate } from '@principia/base/Predicate'
import type { Primitive, Refinement } from '@principia/base/prelude'
import type { RoseTree } from '@principia/base/RoseTree'
import type { FSync } from '@principia/base/Sync'
import type { These } from '@principia/base/These'
import type { UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as Ev from '@principia/base/Eval'
import { memoize } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as HR from '@principia/base/HeterogeneousRecord'
import * as NA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import { flow, isArray, isIterable, isObject, pipe } from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import * as RT from '@principia/base/RoseTree'
import { show } from '@principia/base/Structural'
import * as Sy from '@principia/base/Sync'
import * as Th from '@principia/base/These'

import * as Pa from './internal/Parse'
import * as PE from './ParseError'

export const ParserContinuation = Symbol()
export type ParserContinuation = typeof ParserContinuation

export interface Parser<I, E, A> {
  readonly label: string
  readonly parse: (i: I) => These<E, A>
}

export interface HasParserContinuation {
  readonly [ParserContinuation]: AnyParser
}

export function hasParserContinuation<P extends AnyParser>(parser: P): parser is P & HasParserContinuation {
  return ParserContinuation in parser
}

export type AnyParser = Parser<any, any, any>
export type AnyUParser = Parser<unknown, any, any>

export type InputOf<P> = P extends Parser<infer I, any, any> ? I : never
export type ErrorOf<P> = P extends Parser<any, infer E, any> ? E : never
export type TypeOf<P> = P extends Parser<any, any, infer A> ? A : never

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export function parser<I, E, A>(parse: (i: I) => These<E, A>, label: string): Parser<I, E, A> {
  return {
    label,
    parse
  }
}

export interface FromRefinementP<I, W, E, A extends I> extends Parser<I, PE.RefinementE<E | W>, A> {
  readonly _tag: 'FromRefinement'
  readonly error: (i: I) => E
  readonly warn: (a: A) => O.Option<W>
}

/**
 * Creates a `Parser` from a `Refinement`
 *
 * @category contructors
 * @since 1.0.0
 */
export function fromRefinement<I, W, E, A extends I>(
  refinement: Refinement<I, A>,
  error: (a: I) => E,
  warn: (b: A) => O.Option<W>,
  label: string
): FromRefinementP<I, W, E, A> {
  return {
    _tag: 'FromRefinement',
    error,
    warn,
    label,
    parse: pipe(Pa.fromPredicate(refinement, error, warn), Pa.mapLeft(PE.refinementE))
  }
}

export interface FromPredicateP<I, W, E> extends Parser<I, PE.RefinementE<E | W>, I> {
  readonly _tag: 'FromPredicate'
  readonly error: (i: I) => E
  readonly warn: (a: I) => O.Option<W>
}

export function fromPredicate<I, W, E>(
  predicate: Predicate<I>,
  error: (a: I) => E,
  warn: (b: I) => O.Option<W>,
  label: string
): FromPredicateP<I, W, E> {
  return {
    _tag: 'FromPredicate',
    error,
    warn,
    label,
    parse: pipe(Pa.fromPredicate(predicate, error, warn), Pa.mapLeft(PE.refinementE))
  }
}

export interface FromParseP<I, E, A> extends Parser<I, PE.ParserE<E>, A> {
  readonly _tag: 'FromParse'
  readonly f: (i: I) => These<E, A>
}

export function fromParse<I, E, A>(f: (i: I) => These<E, A>, label: string): FromParseP<I, E, A> {
  return {
    _tag: 'FromParse',
    f,
    label,
    parse: Pa.mapLeft_(f, PE.parserE)
  }
}

/*
 * -------------------------------------------
 * refine
 * -------------------------------------------
 */

export interface RefineP<From extends AnyParser, W, E, A extends TypeOf<From>>
  extends AndThenP<From, FromRefinementP<TypeOf<From>, W, E, A>> {}

/**
 * Refines a Parser with the given type predicate
 *
 * @category combinators
 * @since 1.0.0
 */
export function refine_<From extends AnyParser, W, E, B extends TypeOf<From>>(
  from: From,
  refinement: Refinement<TypeOf<From>, B>,
  error: (a: TypeOf<From>) => E,
  warn: (b: B) => O.Option<W>,
  label: string
): RefineP<From, W, E, B> {
  return andThen_(from, fromRefinement(refinement, error, warn, label))
}

/**
 * Refines a Parser with the given type predicate
 *
 * @category combinators
 * @since 1.0.0
 */
export function refine<From extends AnyParser, W, E, B extends TypeOf<From>>(
  refinement: Refinement<TypeOf<From>, B>,
  error: (a: TypeOf<From>) => E,
  warn: (a: TypeOf<From>) => O.Option<W>,
  label: string
): (from: From) => RefineP<From, W, E, B> {
  return (from) => refine_(from, refinement, error, warn, label)
}

export interface ConstrainP<From extends AnyParser, W, E> extends AndThenP<From, FromPredicateP<TypeOf<From>, W, E>> {}

export function constrain_<From extends AnyParser, W, E>(
  from: From,
  predicate: Predicate<TypeOf<From>>,
  error: (a: TypeOf<From>) => E,
  warn: (b: TypeOf<From>) => O.Option<W>,
  label: string
): ConstrainP<From, W, E> {
  return andThen_(from, fromPredicate(predicate, error, warn, label))
}

export function constrain<From extends AnyParser, W, E>(
  predicate: Predicate<TypeOf<From>>,
  error: (a: TypeOf<From>) => E,
  warn: (b: TypeOf<From>) => O.Option<W>,
  label: string
): (from: From) => ConstrainP<From, W, E> {
  return (from) => constrain_(from, predicate, error, warn, label)
}

/*
 * -------------------------------------------
 * parse
 * -------------------------------------------
 */

export interface ParseP<From extends AnyParser, E, A> extends AndThenP<From, FromParseP<TypeOf<From>, E, A>> {}

/**
 * Feeds the output of a Parser into a parsing function
 *
 * @category combinators
 * @since 1.0.0
 */
export function parse_<D extends AnyParser, E, B>(
  from: D,
  parse: (a: TypeOf<D>) => These<E, B>,
  label: string
): ParseP<D, E, B>
export function parse_<I, E, A, E1, B>(
  from: Parser<I, E, A>,
  parse: (a: A) => These<E1, B>,
  label: string
): Parser<I, AndThenE<E, PE.ParserE<E1>>, B> {
  return andThen_(from, fromParse(parse, label))
}

/**
 * Feeds the output of a Parser into a parsing function
 *
 * @category combinators
 * @since 1.0.0
 */
export function parse<D extends Parser<any, any, any>, E, B>(
  parse: (a: TypeOf<D>) => These<E, B>,
  label: string
): (from: D) => ParseP<D, E, B>
export function parse<A, E1, B>(
  parse: (a: A) => These<E1, B>,
  label: string
): <I, E>(from: Parser<I, E, A>) => ParseP<typeof from, E1, B> {
  return (from) => parse_(from, parse, label)
}

/*
 * -------------------------------------------
 * literal
 * -------------------------------------------
 */

export interface FromLiteralP<A extends NonEmptyArray<Primitive>> extends Parser<A[number], never, A[number]> {
  readonly _tag: 'FromLiteral'
  readonly literals: A
}

export function fromLiteral<L extends NonEmptyArray<Primitive>>(...literals: L): FromLiteralP<L> {
  return {
    _tag: 'FromLiteral',
    label: pipe(
      literals,
      A.map((l) => show(l)),
      A.join(' | ')
    ),
    literals,
    parse: Th.right
  }
}

export interface LiteralP<A extends NonEmptyArray<Primitive>>
  extends Parser<unknown, PE.LiteralLE<A[number]>, A[number]> {
  readonly _tag: 'Literal'
  readonly literals: A
}

/**
 * Constructs a Parser strictly matching one or more literals
 *
 * @category constructors
 * @since 1.0.0
 */
export function literal<L extends NonEmptyArray<Primitive>>(...literals: L): LiteralP<L> {
  // @ts-expect-error
  const literalsGuard = G.literal(...literals)
  return {
    _tag: 'Literal',
    label: pipe(
      literals,
      A.map((l) => String(l)),
      A.join(' | ')
    ),
    literals,
    parse: Pa.fromPredicateFail(literalsGuard.is, (i) => PE.leafE(PE.literalE(i, literals)))
  }
}

/*
 * -------------------------------------------
 * union
 * -------------------------------------------
 */

export interface UnionE<Members extends NonEmptyArray<AnyParser>>
  extends PE.CompoundE<{ [K in keyof Members]: PE.MemberE<CastToNumber<K>, ErrorOf<Members[K]>> }[number]> {}

export interface UnionP<Members extends NonEmptyArray<AnyParser>>
  extends Parser<InputOf<Members[number]>, UnionE<Members>, TypeOf<Members[number]>> {
  readonly _tag: 'Union'
  readonly members: Members
}

/**
 * Constructs a Parser that can parse a union of given members, succeeding with the first successful member
 *
 * @category union
 * @since 1.0.0
 */
export function union<M extends NonEmptyArray<AnyParser>>(...members: M): UnionP<M> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' | ')
  )
  return {
    _tag: 'Union',
    label,
    members,
    parse: (i) => {
      const errors: Array<PE.MemberE<number, any>> = [] as any

      let res: any
      let isBoth = false
      for (let index = 0; index < members.length; index++) {
        const de = members[index].parse(i)
        if (Th.isRight(de)) {
          res = de.right
          break
        } else if (Th.isBoth(de)) {
          isBoth = true
          res    = de.right
          errors.push(PE.memberE(index, de.left))
          break
        } else {
          errors.push(PE.memberE(index, de.left))
        }
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.both(PE.unionE(errors), res)
          : Th.left(PE.unionE(errors))
        : Th.right(res)
    }
  }
}

/*
 * -------------------------------------------
 * intersect
 * -------------------------------------------
 */

export interface IntersectE<M extends NonEmptyArray<AnyParser>>
  extends PE.CompoundE<{ [K in keyof M]: PE.MemberE<CastToNumber<K>, ErrorOf<M[K]>> }[number]> {}

export interface IntersectP<M extends NonEmptyArray<AnyParser>>
  extends Parser<UnionToIntersection<InputOf<M[number]>>, IntersectE<M>, UnionToIntersection<TypeOf<M[number]>>> {
  readonly _tag: 'Intersect'
  readonly members: M
}

/**
 * Constructs a Parser that can parse an intersection of given members, failing at the first failed member
 *
 * @category intersection
 * @since 1.0.0
 */
export function intersectAll<M extends NonEmptyArray<Parser<any, any, Record<string, any>>>>(
  members: M
): IntersectP<M> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' & ')
  )
  return {
    _tag: 'Intersect',
    label,
    members,
    parse: (i) => {
      const errors: Array<PE.MemberE<number, any>> = [] as any

      const ms: Array<any> = []
      let isBoth           = true
      for (let index = 0; index < members.length; index++) {
        const de = members[index].parse(i)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(PE.memberE(index, error))
          },
          (a) => {
            ms.push(a)
          },
          (w, a) => {
            ms.push(a)
            errors.push(PE.memberE(index, w))
          }
        )
      }
      const error = A.isNonEmpty(errors)
        ? errors.length === 1
          ? PE.pruneAllUnexpected(errors[0])
          : PE.pruneDifference(errors)
        : null
      return error ? (isBoth ? Th.both(error, HR.intersect(...ms)) : Th.left(error)) : Th.right(HR.intersect(...ms))
    }
  }
}

export function intersect<M extends NonEmptyArray<Parser<any, any, Record<string, any>>>>(
  ...members: M
): IntersectP<M> {
  return intersectAll(members)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export interface IdP<A> extends Parser<A, never, A> {
  readonly _tag: 'Id'
}

export function id<A>(): IdP<A> {
  return {
    _tag: 'Id',
    label: 'Id',
    parse: Th.right
  }
}

export type AndThenE<E1, E2> = [E1] extends [never]
  ? [E2] extends [never]
    ? never
    : AndThenE<E2, E2>
  : [E2] extends [never]
  ? AndThenE<E1, E1>
  : E1 extends PE.CompositionE<infer A>
  ? E2 extends PE.CompositionE<infer B>
    ? PE.CompositionE<A | B>
    : PE.CompositionE<A | E2>
  : E2 extends PE.CompositionE<infer B>
  ? PE.CompositionE<E1 | B>
  : PE.CompositionE<E1 | E2>

export interface AndThenP<From, To>
  extends Parser<InputOf<From>, AndThenE<ErrorOf<From>, ErrorOf<To>>, TypeOf<To>>,
    HasParserContinuation {
  readonly _tag: 'AndThen'
  readonly from: From
  readonly to: To
}

/**
 * Composes two Parsers, feeding the output of the first into the input of the second
 *
 * @category Category
 * @since 1.0.0
 */
export function andThen_<From extends AnyParser, To extends Parser<TypeOf<From>, any, any>>(
  from: From,
  to: To
): AndThenP<From, To>
export function andThen_<I, E, A, E1, B>(ia: Parser<I, E, A>, ab: Parser<A, E1, B>): Parser<I, AndThenE<E, E1>, B>
export function andThen_<From extends Parser<any, any, any>, To extends Parser<TypeOf<From>, any, any>>(
  from: From,
  to: To
): AndThenP<From, To> {
  return {
    _tag: 'AndThen',
    label: `(${from.label} >>> ${to.label})`,
    from,
    to,
    parse: pipe(
      from.parse,
      Pa.composeCollect(to.parse),
      Pa.mapLeft((es) => {
        const e0 = es[0]
        const e1 = es[1]
        if (!e1) {
          return (PE.isCompositionE(e0) ? e0 : PE.compositionE([e0])) as AndThenE<ErrorOf<From>, ErrorOf<To>>
        }
        const errors = PE.isCompositionE(e0)
          ? PE.isCompositionE(e1)
            ? NA.concat_(e0.errors, e1.errors)
            : NA.append_(e0.errors, e1)
          : PE.isCompositionE(e1)
          ? NA.prepend_(e1.errors, e0)
          : NA.make(e0, e1)
        return PE.compositionE(errors) as AndThenE<ErrorOf<From>, ErrorOf<To>>
      })
    ),
    [ParserContinuation]: to
  }
}

/**
 * Composes two Parsers, feeding the output of the first into the input of the second
 *
 * @category Category
 * @since 1.0.0
 */
export function andThen<From extends Parser<any, any, any>, To extends Parser<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => AndThenP<From, To>
export function andThen<A, E1, B>(ab: Parser<A, E1, B>): <I, E>(ia: Parser<I, E, A>) => Parser<I, AndThenE<E, E1>, B>
export function andThen<From extends Parser<any, any, any>, To extends Parser<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => AndThenP<From, To> {
  return (ia) => andThen_(ia, ab)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export interface MapP<P extends AnyParser, A> extends Parser<InputOf<P>, ErrorOf<P>, A>, HasParserContinuation {
  readonly _tag: 'Map'
  readonly fa: P
  readonly f: (a: TypeOf<P>) => A
}

export function map_<P extends AnyParser, B>(fa: P, f: (a: TypeOf<P>) => B): MapP<P, B>
export function map_<I, E, A, B>(fa: Parser<I, E, A>, f: (a: A) => B): Parser<I, E, B>
export function map_<P extends AnyParser, B>(fa: P, f: (a: TypeOf<P>) => B): MapP<P, B> {
  return {
    _tag: 'Map',
    fa,
    f,
    label: fa.label,
    parse: pipe(fa.parse, Pa.map(f)),
    [ParserContinuation]: fa
  }
}

export function map<D extends AnyParser, B>(f: (a: TypeOf<D>) => B): (fa: D) => MapP<D, B>
export function map<I, E, A, B>(f: (a: A) => B): (fa: Parser<I, E, A>) => Parser<I, E, B>
export function map<D extends AnyParser, B>(f: (a: TypeOf<D>) => B): (fa: D) => MapP<D, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export interface MapLeftP<P extends AnyParser, E> extends Parser<InputOf<P>, E, TypeOf<P>>, HasParserContinuation {
  readonly _tag: 'MapLeft'
  readonly fa: P
  readonly f: (e: ErrorOf<P>) => E
}

export function mapLeft_<P extends AnyParser, G>(fa: P, f: (e: ErrorOf<P>) => G): MapLeftP<P, G>
export function mapLeft_<I, E, A, E1>(fa: Parser<I, E, A>, f: (e: E) => E1): Parser<I, E1, A>
export function mapLeft_<P extends AnyParser, G>(fa: P, f: (e: ErrorOf<P>) => G): MapLeftP<P, G> {
  return {
    _tag: 'MapLeft',
    fa,
    f,
    label: fa.label,
    parse: pipe(fa.parse, Pa.mapLeft(f)),
    [ParserContinuation]: fa
  }
}

export function mapLeft<P extends AnyParser, E1>(f: (e: ErrorOf<P>) => E1): (fa: P) => MapLeftP<P, E1>
export function mapLeft<I, E, A, E1>(f: (e: E) => E1): (fa: Parser<I, E, A>) => Parser<I, E1, A>
export function mapLeft<P extends AnyParser, E1>(f: (e: ErrorOf<P>) => E1): (fa: P) => MapLeftP<P, E1> {
  return (fa) => mapLeft_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

export interface ContramapP<P extends AnyParser, I0> extends Parser<I0, ErrorOf<P>, TypeOf<P>>, HasParserContinuation {
  readonly _tag: 'Contramap'
  readonly fa: P
  readonly f: (i0: I0) => InputOf<P>
}

export function contramap_<P extends AnyParser, I0>(fa: P, f: (i0: I0) => InputOf<P>): ContramapP<P, I0> {
  return {
    _tag: 'Contramap',
    fa,
    f,
    label: fa.label,
    parse: Pa.contramap_(fa.parse, f),
    [ParserContinuation]: fa
  }
}

export function contramap<P extends AnyParser, I0>(f: (i0: I0) => InputOf<P>): (fa: P) => ContramapP<P, I0> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export interface NullableP<P extends AnyParser>
  extends Parser<InputOf<P> | undefined | null, PE.NullableE<ErrorOf<P>>, O.Option<TypeOf<P>>>,
    HasParserContinuation {
  readonly _tag: 'Nullable'
  readonly or: P
}

/**
 * Converts a Parser into one can can decode values that may be null or undefined
 *
 * @category combinators
 * @since 1.0.0
 */
export function nullable<P extends AnyParser>(or: P): NullableP<P> {
  return {
    _tag: 'Nullable',
    label: `${or.label} | null | undefined`,
    or,
    parse: (i) => (i == null ? Th.right(O.none()) : pipe(or.parse(i), Th.bimap(PE.nullableE, O.some))),
    [ParserContinuation]: or
  }
}

export interface OptionalP<P extends AnyParser>
  extends Parser<O.Option<InputOf<P>>, PE.OptionalE<ErrorOf<P>>, O.Option<TypeOf<P>>>,
    HasParserContinuation {
  readonly _tag: 'Optional'
  readonly or: P
}

export function optional<P extends AnyParser>(or: P): OptionalP<P> {
  return {
    _tag: 'Optional',
    label: `Option<${or.label}>`,
    or,
    parse: O.match(() => Th.right(O.none()), flow(or.parse, Th.bimap(PE.optionalE, O.some))),
    [ParserContinuation]: or
  }
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export interface StructE<P> extends PE.CompoundE<{ [K in keyof P]: PE.RequiredKeyE<K, ErrorOf<P[K]>> }[keyof P]> {}

export interface FromStructP<P>
  extends Parser<{ [K in keyof P]: InputOf<P[K]> }, StructE<P>, { [K in keyof P]: TypeOf<P[K]> }> {
  readonly _tag: 'FromStruct'
  readonly properties: P
}

/**
 * Returns a Parser that can parse an object with the given properties
 *
 * @category struct
 * @since 1.0.0
 */
export function fromStruct<P extends Record<string, AnyParser>>(properties: P): FromStructP<P> {
  const label = `{ ${pipe(
    properties,
    R.foldl([] as string[], (b, a, k) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'FromStruct',
    properties,
    label,
    parse: (ur) => {
      const es: Array<PE.RequiredKeyE<string, any>> = []
      const r: any = {}

      let isBoth = true
      for (const k in properties) {
        const de = properties[k].parse(ur[k])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            es.push(PE.requiredKeyE(k, error))
          },
          (a) => {
            r[k] = a
          },
          (w, a) => {
            es.push(PE.requiredKeyE(k, w))
            r[k] = a
          }
        )
      }

      return A.isNonEmpty(es) ? (isBoth ? Th.both(PE.structE(es), r) : Th.left(PE.structE(es))) : Th.right(r)
    }
  }
}

export interface UnexpectedKeysP<P>
  extends Parser<{ [K in keyof P]: InputOf<P[K]> }, PE.UnexpectedKeysLE, { [K in keyof P]: InputOf<P[K]> }> {
  readonly _tag: 'UnexpectedKeys'
  readonly properties: P
}
/**
 * Constructs a Parser that emits warnings for unexpected keys in a Struct
 *
 * @category struct
 * @since 1.0.0
 */
export function unexpectedKeys<P extends Record<string, unknown>>(properties: P): UnexpectedKeysP<P> {
  return {
    _tag: 'UnexpectedKeys',
    label: 'UnexpectedKeys',
    properties,
    parse: (ur) => {
      const ws: Array<string> = []
      const out: any          = {}
      for (const key in properties) {
        if (key in ur) {
          out[key] = ur[key]
        }
      }
      for (const key in ur) {
        if (!(key in out)) {
          ws.push(key)
        }
      }
      return A.isNonEmpty(ws) ? Th.both(PE.leafE(PE.unexpectedKeysE(ws)), out) : Th.right(out)
    }
  }
}

export interface RequireKeysP<P>
  extends Parser<Record<PropertyKey, unknown>, PE.MissingKeysLE<keyof P>, Record<keyof P, unknown>> {
  readonly _tag: 'RequireKeys'
  readonly properties: P
}

/**
 * Constructs a Parser that emits errors for missing keys in a Struct
 *
 * @category struct
 * @since 1.0.0
 */
export function requireKeys<P extends Record<PropertyKey, unknown>>(properties: P): RequireKeysP<P> {
  return {
    _tag: 'RequireKeys',
    label: pipe(
      properties,
      R.foldl([] as string[], (b, _, k) => {
        b.push(`${k}: unknown`)
        return b
      }),
      A.join(', ')
    ),
    properties,
    parse: (ur) => {
      const es: Array<string> = []
      for (const key in properties) {
        if (!(key in ur)) {
          es.push(key)
        }
      }
      return A.isNonEmpty(es) ? Th.left(PE.leafE(PE.missingKeysE(es))) : Th.right(ur)
    }
  }
}

interface InjectDefaults<D extends AnyParser> extends Endo<D> {}
function injectDefaults<E, P extends Record<PropertyKey, AnyParser>>(
  properties: P
): <D extends Parser<any, E, Record<PropertyKey, unknown>>>(decoder: D) => InjectDefaults<D> {
  return endo((result: These<E, Record<PropertyKey, unknown>>) => {
    return Th.map_(result, (i) => {
      const out = i
      for (const key in properties) {
        if (!out[key]) {
          const od = extractDefault(properties[key])
          if (od._tag === 'Some') {
            out[key] = od.value()
          }
        }
      }
      return out
    })
  })
}

export interface StructP<P>
  extends Parser<
    unknown,
    PE.CompositionE<PE.UnknownRecordLE | PE.UnexpectedKeysLE | PE.MissingKeysLE<keyof P> | StructE<P>>,
    { readonly [K in keyof P]: TypeOf<P[K]> }
  > {
  readonly _tag: 'Struct'
  readonly properties: P
}

export function struct<P extends Record<string, AnyUParser>>(properties: P): StructP<P> {
  const label = `{ ${pipe(
    properties,
    R.foldl([] as string[], (b, a, k) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'Struct',
    properties,
    label,
    parse: (ur) => {
      // UnknownRecord
      if (!isObject(ur)) {
        return Th.left(PE.compositionE([PE.leafE(PE.unknownRecordE(ur))]))
      }
      // RequireKeys
      const missingKeys: Array<string> = []
      for (const k in properties) {
        if (!(k in ur)) {
          missingKeys.push(k)
        }
      }
      if (A.isNonEmpty(missingKeys)) {
        return Th.left(PE.compositionE([PE.leafE(PE.missingKeysE(missingKeys))]))
      }
      // UnexpectedKeys
      const unexpectedKeys: Array<string> = []
      for (const k in ur) {
        if (!(k in properties)) {
          unexpectedKeys.push(k)
        }
      }
      // FromStruct
      const result = fromStruct(properties).parse(ur as any)
      return Th.match_(
        result,
        (e) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.left(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys)), e]))
            : Th.left(PE.compositionE([e])),
        (a) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys))]), a)
            : Th.right(a),
        (w, a) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys)), w]), a)
            : Th.both(PE.compositionE([w]), a)
      )
    }
  }
}

/*
 * -------------------------------------------
 * partial
 * -------------------------------------------
 */

export interface PartialE<P> extends PE.CompoundE<{ [K in keyof P]: PE.OptionalKeyE<K, ErrorOf<P[K]>> }[keyof P]> {}

export interface FromPartialP<P>
  extends Parser<{ [K in keyof P]?: InputOf<P[K]> }, PartialE<P>, { readonly [K in keyof P]?: TypeOf<P[K]> }> {
  readonly _tag: 'FromPartial'
  readonly properties: P
}

/**
 * Returns a Parser that can parse an object with the given optional properties
 *
 * @category struct
 * @since 1.0.0
 */
export function fromPartial<P extends Record<string, AnyParser>>(properties: P): FromPartialP<P> {
  const label = `{ ${pipe(
    properties,
    R.foldl([] as string[], (b, a, k) => {
      b.push(`${k}?: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`
  return {
    _tag: 'FromPartial',
    properties,
    label,
    parse: (ur) => {
      const es: Array<PE.OptionalKeyE<string, any>> = []
      const r: any = {}

      let isBoth = true
      for (const key in properties) {
        if (!(key in ur)) {
          continue
        }
        if (ur[key as string] === undefined) {
          r[key] = undefined
          continue
        }
        const de = properties[key].parse(ur[key as string])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            es.push(PE.optionalKeyE(key, error))
          },
          (a) => {
            r[key] = a
          },
          (w, a) => {
            es.push(PE.optionalKeyE(key, w))
            r[key] = a
          }
        )
      }
      return A.isNonEmpty(es) ? (isBoth ? Th.both(PE.partialE(es), r) : Th.left(PE.partialE(es))) : Th.right(r)
    }
  }
}

export interface PartialP<P>
  extends Parser<
    unknown,
    PE.CompositionE<PE.UnknownRecordLE | PE.UnexpectedKeysLE | PartialE<P>>,
    { readonly [K in keyof P]?: TypeOf<P[K]> }
  > {
  readonly _tag: 'Partial'
  readonly properties: P
}

export function partial<P extends Record<PropertyKey, AnyUParser>>(properties: P): PartialP<P> {
  const label = `{ ${pipe(
    properties,
    R.foldl([] as string[], (b, a, k) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'Partial',
    properties,
    label,
    parse: (ur) => {
      // UnknownRecord
      if (!isObject(ur)) {
        return Th.left(PE.compositionE([PE.leafE(PE.unknownRecordE(ur))]))
      }
      // UnexpectedKeys
      const unexpectedKeys: Array<string> = []
      for (const k in ur) {
        if (!(k in properties)) {
          unexpectedKeys.push(k)
        }
      }
      // FromPartial
      const result = fromPartial(properties).parse(ur as any)
      return Th.match_(
        result,
        (e) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.left(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys)), e]))
            : Th.left(PE.compositionE([e])),
        (a) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys))]), a)
            : Th.right(a),
        (w, a) =>
          A.isNonEmpty(unexpectedKeys)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedKeysE(unexpectedKeys)), w]), a)
            : Th.both(PE.compositionE([w]), a)
      )
    }
  }
}

/*
 * -------------------------------------------
 * array
 * -------------------------------------------
 */

export interface ArrayE<I> extends PE.CompoundE<PE.OptionalIndexE<number, ErrorOf<I>>> {}

export interface FromArrayP<I> extends Parser<ReadonlyArray<InputOf<I>>, ArrayE<I>, ReadonlyArray<TypeOf<I>>> {
  readonly _tag: 'FromArray'
  readonly item: I
}

/**
 * Returns a Parser that can parse a homogeneous Array of the given item
 *
 * @category array
 * @since 1.0.0
 */
export function fromArray<I extends AnyParser>(item: I): FromArrayP<I> {
  return {
    _tag: 'FromArray',
    label: `Array<${item.label}>`,
    item,
    parse: (i) => {
      const errors: Array<PE.OptionalIndexE<number, any>> = []
      const result: Array<TypeOf<I>> = []

      let isBoth = true
      for (let index = 0; index < i.length; index++) {
        const de = item.parse(i[index])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(PE.optionalIndexE(index, error))
          },
          (a) => {
            result.push(a)
          },
          (w, a) => {
            errors.push(PE.optionalIndexE(index, w))
            result.push(a)
          }
        )
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.both(PE.arrayE(errors), result)
          : Th.left(PE.arrayE(errors))
        : Th.right(result)
    }
  }
}

export interface ArrayP<I> extends Parser<unknown, PE.UnknownArrayLE | ArrayE<I>, ReadonlyArray<TypeOf<I>>> {
  readonly _tag: 'Array'
  readonly item: I
}

/**
 * Constructs a Parser that can decode a homogeneous Array of the given item from an unknown
 *
 * @category array
 * @since 1.0.0
 */
export function array<Item extends AnyUParser>(item: Item): ArrayP<Item> {
  return {
    _tag: 'Array',
    label: `Array<${item.label}>`,
    item,
    parse: (u) => {
      if (!isArray(u)) {
        return Th.left(PE.leafE(PE.unknownArrayE(u)))
      }
      return fromArray(item).parse(u as Array<any>)
    }
  }
}

/*
 * -------------------------------------------
 * chunk
 * -------------------------------------------
 */

export interface FromChunkP<I> extends Parser<Iterable<InputOf<I>>, ArrayE<I>, Chunk<TypeOf<I>>> {
  readonly _tag: 'FromChunk'
  readonly item: I
}

export function fromChunk<I extends AnyParser>(item: I): FromChunkP<I> {
  return {
    _tag: 'FromChunk',
    item,
    label: `Chunk<${item.label}>`,
    parse: (is) => {
      const errors: Array<PE.OptionalIndexE<number, any>> = []
      const builder: C.ChunkBuilder<TypeOf<I>>            = C.builder()

      let isBoth = true
      let i      = 0
      for (const a of is) {
        const de = item.parse(a)
        Th.match_(
          de,
          (e) => {
            isBoth = false
            errors.push(PE.optionalIndexE(i, e))
          },
          (a) => {
            builder.append(a)
          },
          (w, a) => {
            errors.push(PE.optionalIndexE(i, w))
            builder.append(a)
          }
        )
        i++
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.both(PE.arrayE(errors), builder.result())
          : Th.left(PE.arrayE(errors))
        : Th.right(builder.result())
    }
  }
}

export interface ChunkP<I> extends Parser<unknown, PE.UnknownIterableLE | ArrayE<I>, Chunk<TypeOf<I>>> {
  readonly _tag: 'Chunk'
  readonly item: I
}

export function chunk<I extends AnyParser>(item: I): ChunkP<I> {
  return {
    _tag: 'Chunk',
    item,
    label: `(UnknownIterable >>> Chunk<${item.label}>)`,
    parse: (u) => {
      if (!isIterable(u)) {
        return Th.left(PE.leafE(PE.unknownIterableE(u)))
      }
      return fromChunk(item).parse(u as Iterable<any>)
    }
  }
}

/*
 * -------------------------------------------
 * tuple
 * -------------------------------------------
 */

export interface TupleE<C extends ReadonlyArray<AnyParser>>
  extends PE.CompoundE<{ [K in keyof C]: PE.RequiredIndexE<CastToNumber<K>, ErrorOf<C[K]>> }[number]> {}

export interface FromTupleP<C extends ReadonlyArray<AnyParser>>
  extends Parser<{ readonly [K in keyof C]: InputOf<C[K]> }, TupleE<C>, { [K in keyof C]: TypeOf<C[K]> }> {
  readonly _tag: 'FromTuple'
  readonly components: C
}

/**
 * Construts a Parser that can parse a tuple of given comonents
 *
 * @category tuple
 * @since 1.0.0
 */
export function fromTuple<C extends ReadonlyArray<AnyParser>>(...components: C): FromTupleP<C> {
  const label = `[ ${pipe(
    components,
    A.map((d) => d.label),
    A.join(', ')
  )} ]`
  return {
    _tag: 'FromTuple',
    label,
    components,
    parse: (is) => {
      const errors: Array<PE.RequiredIndexE<number, any>> = []

      const r: any = []

      let isBoth = true
      for (let index = 0; index < components.length; index++) {
        const i  = is[index]
        const de = components[index].parse(i)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(PE.requiredIndexE(index, error))
          },
          (a) => {
            r[index] = a
          },
          (w, a) => {
            r[index] = a
            errors.push(PE.requiredIndexE(index, w))
          }
        )
      }
      return A.isNonEmpty(errors) ? (isBoth ? Th.both(PE.tupleE(errors), r) : Th.left(PE.tupleE(errors))) : Th.right(r)
    }
  }
}

export interface UnexpectedIndicesP<C>
  extends Parser<
    { readonly [K in keyof C]: InputOf<C[K]> },
    PE.UnexpectedIndicesLE,
    { [K in keyof C]: InputOf<C[K]> }
  > {
  readonly _tag: 'UnexpectedIndices'
  readonly components: C
}

/**
 * Constructs a Parser that warns on unexpected indices of a tuple
 *
 * @category tuple
 * @since 1.0.0
 */
export function unexpectedIndices<C extends ReadonlyArray<unknown>>(...components: C): UnexpectedIndicesP<C> {
  return {
    _tag: 'UnexpectedIndices',
    label: 'UnexpectedIndices',
    components,
    parse: (us) => {
      const ws: Array<number> = []
      for (let index = components.length; index < us.length; index++) {
        ws.push(index)
      }
      return A.isNonEmpty(ws)
        ? Th.both(PE.leafE(PE.unexpectedIndicesE(ws)), us.slice(0, components.length) as any)
        : Th.right(us)
    }
  }
}

export interface MissingIndicesP<C> extends Parser<Array<unknown>, PE.MissingIndicesLE, { [K in keyof C]: unknown }> {
  readonly _tag: 'MissingIndices'
  readonly components: C
}

/**
 * Constructs a parser that fails on missing indices of a tuple
 *
 * @category tuple
 * @since 1.0.0
 */
export function missingIndices<C extends ReadonlyArray<unknown>>(...components: C): MissingIndicesP<C> {
  return {
    _tag: 'MissingIndices',
    label: 'MissingIndices',
    components,
    parse: (us) => {
      const es: Array<number> = []
      const len               = us.length
      for (let index = 0; index < components.length; index++) {
        if (len < index) {
          es.push(index)
        }
      }
      return A.isNonEmpty(es) ? Th.left(PE.leafE(PE.missingIndicesE(es))) : Th.right(us as any)
    }
  }
}

export interface TupleP<C extends ReadonlyArray<AnyUParser>>
  extends Parser<
    unknown,
    PE.CompositionE<PE.UnknownArrayLE | PE.UnexpectedIndicesLE | PE.MissingIndicesLE | TupleE<C>>,
    { [K in keyof C]: TypeOf<C[K]> }
  > {
  readonly _tag: 'Tuple'
  readonly components: C
}

export function tuple<C extends ReadonlyArray<AnyUParser>>(...components: C): TupleP<C> {
  const label = `[ ${pipe(
    components,
    A.map((d) => d.label),
    A.join(', ')
  )} ]`
  return {
    _tag: 'Tuple',
    label,
    components,
    parse: (u) => {
      if (!isArray(u)) {
        return Th.left(PE.compositionE([PE.leafE(PE.unknownArrayE(u))]))
      }
      const missingIndices: Array<number> = []
      const len = u.length
      for (let index = 0; index < components.length; index++) {
        if (len < index) {
          missingIndices.push(index)
        }
      }
      if (A.isNonEmpty(missingIndices)) {
        return Th.left(PE.compositionE([PE.leafE(PE.missingIndicesE(missingIndices))]))
      }
      const unexpectedIndices: Array<number> = []
      for (let index = components.length; index < u.length; index++) {
        unexpectedIndices.push(index)
      }
      // @ts-expect-error
      const result: These<TupleE<C>, Readonly<{ [K in keyof C]: TypeOf<C[K]> }>> = fromTuple(...components).parse(u)
      return Th.match_(
        result,
        (e) =>
          A.isNonEmpty(unexpectedIndices)
            ? Th.left(PE.compositionE([PE.leafE(PE.unexpectedIndicesE(unexpectedIndices)), e]))
            : Th.left(PE.compositionE([e])),
        (a) =>
          A.isNonEmpty(unexpectedIndices)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedIndicesE(unexpectedIndices))]), a)
            : Th.right(a),
        (w, a) =>
          A.isNonEmpty(unexpectedIndices)
            ? Th.both(PE.compositionE([PE.leafE(PE.unexpectedIndicesE(unexpectedIndices)), w]), a)
            : Th.both(PE.compositionE([w]), a)
      )
    }
  }
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export interface RecordE<C> extends PE.CompoundE<PE.OptionalKeyE<string, ErrorOf<C>>> {}

export interface FromRecordP<C> extends Parser<Record<string, InputOf<C>>, RecordE<C>, Record<string, TypeOf<C>>> {
  readonly _tag: 'Record'
  readonly codomain: C
}

/**
 * Constructs a Deocder that can strictly decode a homogeneous Record of a given codomain
 *
 * @category record
 * @since 1.0.0
 */
export function fromRecord<C extends AnyParser>(codomain: C): FromRecordP<C> {
  return {
    _tag: 'Record',
    label: `Record<string, ${codomain.label}>`,
    codomain,
    parse: (i) => {
      const errors: Array<PE.OptionalKeyE<string, any>> = []
      const res: Record<string, any>                    = {}

      let isBoth = true
      for (const key in i) {
        const value = i[key]
        const de    = codomain.parse(value)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(PE.optionalKeyE(key, error))
          },
          (a) => {
            res[key] = a
          },
          (w, a) => {
            res[key] = a
            errors.push(PE.optionalKeyE(key, w))
          }
        )
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.both(PE.recordE(errors), res)
          : Th.left(PE.recordE(errors))
        : Th.right(res)
    }
  }
}

export interface RecordP<C> extends Parser<unknown, PE.UnknownRecordLE | RecordE<C>, Record<string, TypeOf<C>>> {
  readonly _tag: 'Record'
  readonly codomain: C
}

export function record<C extends AnyUParser>(codomain: C): RecordP<C> {
  return {
    _tag: 'Record',
    label: `(UnknownRecord >>> Record<string, ${codomain.label}>)`,
    codomain,
    parse: (u) => {
      if (!isObject(u)) {
        return Th.left(PE.leafE(PE.unknownRecordE(u)))
      }
      // @ts-expect-error
      return fromRecord(codomain).parse(u)
    }
  }
}

/*
 * -------------------------------------------
 * lazy
 * -------------------------------------------
 */

export interface LazyP<P> extends Parser<InputOf<P>, ErrorOf<P>, TypeOf<P>> {
  readonly _tag: 'Lazy'
  readonly id: string
  readonly parser: () => P
}

/**
 * Constructs a lazy Parser, allowing for recursive definition
 *
 * @category lazy
 * @since 1.0.0
 */
export function lazy<P extends AnyParser>(parser: () => P, id: string): LazyP<P> {
  const get = memoize<void, Parser<InputOf<P>, ErrorOf<P>, TypeOf<P>>>(parser)
  return {
    _tag: 'Lazy',
    label: id,
    id,
    parser,
    parse: (i) => get().parse(i)
  }
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

export interface SumE<M> extends PE.SumE<{ [K in keyof M]: PE.MemberE<K, ErrorOf<M[K]>> }[keyof M]> {}

export interface FromSumP<T, M> extends Parser<InputOf<M[keyof M]>, PE.TagLE | SumE<M>, TypeOf<M[keyof M]>> {
  readonly _tag: 'FromSum'
  readonly tag: T
  readonly members: M
}

export type EnsureTag<T extends string, Members extends Record<string, AnyParser>> = Members &
  {
    [K in keyof Members]: Parser<any, any, { [tag in T]: K }>
  }

/**
 * Constructs a Parser that can strictly decode a disjoint union of members based on a discriminating "tag",
 * succeeding with the member with the discriminant corresponding to the input
 *
 * @category sum
 * @since 1.0.0
 */
export function fromSum<T extends string>(
  tag: T
): <M extends Record<string, AnyParser>>(members: EnsureTag<T, M>) => FromSumP<T, M> {
  return (members) => {
    const tags: NonEmptyArray<string> = R.keys(members) as NonEmptyArray<string>

    const label = pipe(
      members,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return {
      _tag: 'FromSum',
      tag,
      members,
      label,
      parse: (ir) => {
        const v      = ir[tag]
        const member = members[v]
        if (member) {
          return pipe(
            member.parse(ir),
            Th.mapLeft((error) => PE.sumE(PE.memberE(v, error)))
          )
        }
        return Th.left(PE.leafE(PE.tagE(tag, tags)))
      }
    }
  }
}

export interface SumP<T, M> extends Parser<unknown, PE.UnknownRecordLE | PE.TagLE | SumE<M>, TypeOf<M[keyof M]>> {
  readonly _tag: 'Sum'
  readonly tag: T
  readonly members: M
}

export function sum<T extends string>(
  tag: T
): <M extends Record<string, AnyUParser>>(members: EnsureTag<T, M>) => SumP<T, M> {
  return (members) => {
    const label = pipe(
      members,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return {
      _tag: 'Sum',
      tag,
      members,
      label: `(UnknownRecord >>> ${label})`,
      parse: (u) => {
        if (!isObject(u)) {
          return Th.left(PE.leafE(PE.unknownRecordE(u)))
        }

        // @ts-expect-error
        return fromSum(tag)(members).parse(u)
      }
    }
  }
}

/*
 * -------------------------------------------
 * labeled
 * -------------------------------------------
 */

export interface LabeledP<P> extends Parser<InputOf<P>, PE.LabeledE<ErrorOf<P>>, TypeOf<P>>, HasParserContinuation {
  readonly _tag: 'Labeled'
  readonly parser: P
}

/**
 * Wraps errors and warnings in an error type including the builtin label of the Parser
 *
 * @category utils
 * @since 1.0.0
 */
export function labeled<P extends AnyParser>(parser: P): LabeledP<P> {
  return {
    _tag: 'Labeled',
    parser,
    label: parser.label,
    parse: flow(
      parser.parse,
      Th.mapLeft((error) => PE.labeledE(parser.label, error))
    ),
    [ParserContinuation]: parser
  }
}

/*
 * -------------------------------------------
 * message
 * -------------------------------------------
 */

export interface MessageP<P> extends Parser<InputOf<P>, PE.MessageE<ErrorOf<P>>, TypeOf<P>>, HasParserContinuation {
  readonly _tag: 'Message'
  readonly parser: P
  readonly message: string
}

/**
 * Wraps errors and warnings in an error type including a custom message
 *
 * @category utils
 * @since 1.0.0
 */
export function message_<P extends AnyParser>(parser: P, message: string): MessageP<P> {
  return {
    _tag: 'Message',
    message,
    parser,
    label: parser.label,
    parse: flow(
      parser.parse,
      Th.mapLeft((error) => PE.messageE(message, error))
    ),
    [ParserContinuation]: parser
  }
}

/**
 * Wraps errors and warnings in an error type including a custom message
 *
 * @category utils
 * @since 1.0.0
 */
export function message(message: string): <P extends AnyParser>(parser: P) => MessageP<P> {
  return (parser) => message_(parser, message)
}

/*
 * -------------------------------------------
 * named
 * -------------------------------------------
 */

export interface NamedP<N extends string, P> extends Parser<InputOf<P>, PE.NamedE<N, ErrorOf<P>>, TypeOf<P>> {
  readonly _tag: 'Named'
  readonly parser: P
  readonly name: N
}

export function named_<P extends AnyParser, N extends string>(parser: P, name: N): NamedP<N, P> {
  return {
    _tag: 'Named',
    parser,
    name,
    label: name,
    parse: pipe(
      parser.parse,
      Pa.mapLeft((e) => PE.namedE(name, e))
    )
  }
}

export function named<N extends string>(name: N): <P extends AnyParser>(parser: P) => NamedP<N, P> {
  return (parser) => named_(parser, name)
}

/*
 * -------------------------------------------
 * util
 * -------------------------------------------
 */

export function withLabel_<P extends AnyParser>(parser: P, label: string): P {
  return Object.assign({}, parser, { label })
}

export function withLabel(label: string): <P extends AnyParser>(parser: P) => P {
  return (parser) => withLabel_(parser, label)
}

/**
 * Converts all warnings into errors
 */
export function condemn<P extends AnyParser>(parser: P): P {
  return {
    ...parser,
    parse: flow(parser.parse, Th.condemn)
  }
}

export interface Endo<P> extends Parser<InputOf<P>, ErrorOf<P>, TypeOf<P>> {
  readonly _tag: 'Endo'
  readonly parser: P
  readonly endo: (result: These<ErrorOf<P>, TypeOf<P>>) => These<ErrorOf<P>, TypeOf<P>>
}

export function endo_<P extends AnyParser>(
  parser: P,
  endo: (result: These<ErrorOf<P>, TypeOf<P>>) => These<ErrorOf<P>, TypeOf<P>>
): Endo<P> {
  return {
    _tag: 'Endo',
    label: parser.label,
    parser,
    endo,
    parse: flow(parser.parse, endo)
  }
}

export function endo<E, A>(
  endo: (result: These<E, A>) => These<E, A>
): <P extends Parser<any, E, A>>(parser: P) => Endo<P>
export function endo<E, A>(
  endo: (result: These<E, A>) => These<E, A>
): <I>(parser: Parser<I, E, A>) => Endo<typeof parser> {
  return (parser) => endo_(parser, endo)
}

export interface WithDefaultP<P extends AnyParser>
  extends Parser<InputOf<P> | null | undefined, ErrorOf<P>, TypeOf<P>> {
  readonly _tag: 'WithDefault'
  readonly parser: P
  readonly def: () => TypeOf<P>
}

export function withDefault_<P extends AnyParser>(parser: P, def: () => TypeOf<P>): WithDefaultP<P> {
  return {
    _tag: 'WithDefault',
    label: parser.label,
    parser,
    def,
    parse: (i) => (i == null ? Th.right(def()) : parser.parse(i))
  }
}

export function withDefault<P extends AnyParser>(def: () => TypeOf<P>): (parser: P) => WithDefaultP<P> {
  return (parser) => withDefault_(parser, def)
}

export function extractDefault<P extends AnyParser>(parser: P): O.Option<() => any> {
  concrete(parser)
  if (parser._tag === 'WithDefault') {
    return O.some(parser.def)
  }
  if (hasParserContinuation(parser)) {
    return extractDefault(parser[ParserContinuation])
  }
  return O.none()
}

export function concrete(_: AnyParser): asserts _ is Concrete {
  //
}

export type Concrete =
  | LiteralP<NonEmptyArray<string>>
  | FromLiteralP<NonEmptyArray<string>>
  | FromRefinementP<any, any, any, any>
  | FromParseP<any, any, any>
  | MapP<AnyParser, any>
  | MapLeftP<AnyParser, any>
  | IdP<any>
  | AndThenP<AnyParser, AnyParser>
  | UnionP<NonEmptyArray<AnyParser>>
  | IntersectP<NonEmptyArray<AnyParser>>
  | FromStructP<Record<string, AnyParser>>
  | StructP<Record<string, AnyUParser>>
  | FromPartialP<Record<string, AnyParser>>
  | PartialP<Record<string, AnyParser>>
  | FromArrayP<AnyParser>
  | ArrayP<AnyUParser>
  | FromTupleP<ReadonlyArray<AnyParser>>
  | TupleP<ReadonlyArray<AnyUParser>>
  | FromRecordP<AnyParser>
  | RecordP<AnyUParser>
  | LazyP<AnyParser>
  | FromSumP<string, Record<string, AnyParser>>
  | SumP<string, Record<string, AnyUParser>>
  | WithDefaultP<AnyParser>
  | NullableP<AnyParser>
  | OptionalP<AnyParser>
  | LabeledP<AnyParser>
  | MessageP<AnyParser>
  | Endo<AnyParser>

/**
 * @optimize identity
 */
function asConcrete(d: AnyParser): Concrete {
  return d as any
}

function keyOfEval<P extends AnyParser>(parser: P): Ev.Eval<ReadonlyArray<RoseTree<string | number>>> {
  const d = asConcrete(parser)
  switch (d._tag) {
    case 'AndThen': {
      return Ev.defer(() => pipe(keyOfEval(d.from), Ev.crossWith(keyOfEval(d.to), A.concat_)))
    }
    case 'FromPartial':
    case 'FromStruct':
    case 'Partial':
    case 'Struct': {
      return pipe(
        d.properties,
        R.mapA(Ev.Applicative)((d: AnyParser) => Ev.defer(() => keyOfEval(d))),
        Ev.map(
          R.foldl([] as Array<RoseTree<string | number>>, (b, a, k) => {
            b.push(RT.roseTree(k, a))
            return b
          })
        )
      )
    }
    case 'FromTuple':
    case 'Tuple': {
      return pipe(
        d.components,
        A.mapA(Ev.Applicative)((d: AnyParser) => Ev.defer(() => keyOfEval(d))),
        Ev.map(
          A.foldl([] as Array<RoseTree<string | number>>, (b, a, i) => {
            b.push(RT.roseTree(i, a))
            return b
          })
        )
      )
    }
    case 'Intersect':
    case 'Union': {
      return pipe(
        d.members,
        A.mapA(Ev.Applicative)((d: AnyParser) => Ev.defer(() => keyOfEval(d))),
        Ev.map(A.flatten)
      )
    }
    default: {
      return Ev.now([])
    }
  }
}

export function keyOf<P extends AnyParser>(decoder: P): ReadonlyArray<RoseTree<string | number>> {
  return keyOfEval(decoder).value
}

export type Pick<D, Prop extends PropertyKey> = D extends FromStructP<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends FromStructP<infer P> | StructP<infer P> | FromPartialP<infer P> | PartialP<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends IntersectP<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends UnionP<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends Parser<infer I, infer E, infer A>
  ? Prop extends keyof A
    ? Prop extends keyof I
      ? Parser<I[Prop], E, A[Prop]>
      : unknown extends I
      ? Parser<unknown, E, A[Prop]>
      : never
    : never
  : never

export function pick_<P extends AnyParser, Prop extends keyof TypeOf<P>>(
  parser: P,
  prop: Prop
): FSync<void, Pick<P, Prop>>
export function pick_(decoder: AnyParser, prop: string): FSync<void, AnyParser> {
  return Sy.defer(() => {
    const d = asConcrete(decoder)
    switch (d._tag) {
      case 'FromStruct':
      case 'FromPartial':
      case 'Struct':
      case 'Partial': {
        return prop in d.properties ? Sy.succeed(d.properties[prop]) : Sy.fail(undefined)
      }
      case 'Union':
      case 'Intersect': {
        return pipe(
          d.members,
          Sy.foreachArray((d: AnyParser) =>
            Sy.matchSync_(
              pick_(d, prop),
              (_) => Sy.unit(),
              (a: AnyParser) => Sy.succeed(a)
            )
          ),
          Sy.map(A.filter((a): a is AnyParser => a !== undefined)),
          Sy.chain((as) => (as.length === 0 ? Sy.fail(undefined) : Sy.succeed(as[0])))
        )
      }
      case 'Lazy': {
        return pick_(d.parser() as AnyParser, prop)
      }
      case 'AndThen': {
        return pick_(d.to as AnyParser, prop)
      }
      default: {
        return Sy.fail(undefined)
      }
    }
  })
}

export function pick<D extends AnyParser, Prop extends keyof TypeOf<D>>(
  prop: Prop
): (decoder: D) => FSync<void, Pick<D, Prop>> {
  return (decoder) => pick_(decoder, prop)
}
