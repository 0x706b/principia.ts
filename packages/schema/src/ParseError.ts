import type { NonEmptyArray } from '@principia/base/collection/immutable/NonEmptyArray'
import type { Eval } from '@principia/base/Eval'
import type { Predicate } from '@principia/base/prelude'
import type { RoseTree } from '@principia/base/RoseTree'
import type { Primitive } from '@principia/base/util/types'

import { CaseClass } from '@principia/base/Case'
import * as A from '@principia/base/collection/immutable/Array'
import * as NA from '@principia/base/collection/immutable/NonEmptyArray'
import * as Ev from '@principia/base/Eval'
import { flow, pipe } from '@principia/base/function'
import * as F from '@principia/base/function'
import * as M from '@principia/base/Maybe'
import * as RT from '@principia/base/RoseTree'
import * as Str from '@principia/base/string'
import { show } from '@principia/base/Structural'
import * as Th from '@principia/base/These'
import { isObject } from '@principia/base/util/predicates'

/*
 * -------------------------------------------
 * error model
 * -------------------------------------------
 */

export type ParseError<E> =
  | LeafE<E>
  | RequiredKeyE<string, ParseError<E>>
  | OptionalKeyE<string, ParseError<E>>
  | OptionalIndexE<number, ParseError<E>>
  | RequiredIndexE<number, ParseError<E>>
  | MemberE<string | number, ParseError<E>>
  | RefinementE<ParseError<E>>
  | ParserE<ParseError<E>>
  | NullableE<ParseError<E>>
  | OptionalE<ParseError<E>>
  | LazyE<ParseError<E>>
  | SumE<ParseError<E>>
  | CompoundE<ParseError<E>>
  | NamedE<string, ParseError<E>>
  | LabeledE<ParseError<E>>
  | MessageE<ParseError<E>>
  | CompositionE<ParseError<E>>

export type BuiltinE =
  | StringE
  | NumberE
  | BooleanE
  | BigIntE
  | UnknownArrayE
  | UnknownRecordE
  | LiteralE<Primitive>
  | NaNE
  | InfinityE
  | EmptyE<{ length: number }>
  | TagE
  | NewtypePrismE<any>
  | UnexpectedIndicesE
  | UnexpectedKeysE
  | MissingIndicesE
  | MissingKeysE<string>

export type AnyError<E = never> = ParseError<BuiltinE | E>

export type AnyDefaultError = ParseError<HasDefaultLeafE>

export const DefaultLeafTypeId = Symbol('@principia/schema/ParseError/DefaultLeaf')
export type DefaultLeafTypeId = typeof DefaultLeafTypeId
export const $toTree = Symbol('$toTree')

export interface HasDefaultLeafE {
  readonly [$toTree]: RoseTree<string>
}

// @ts-expect-error
export abstract class DefaultLeafE<T extends object> extends CaseClass<T> implements HasDefaultLeafE {
  readonly [DefaultLeafTypeId]: DefaultLeafTypeId = DefaultLeafTypeId
  abstract get [$toTree](): RoseTree<string>
}

export function isDefaultLeaf<T extends object>(t: T): t is T & DefaultLeafE<T> {
  return isObject(t) && DefaultLeafTypeId in t
}

/*
 * -------------------------------------------
 * compound errors
 * -------------------------------------------
 */

export const CompositionETypeId = Symbol()
export type CompositionETypeId = typeof CompositionETypeId
export class CompositionE<E> extends CaseClass<{ errors: NonEmptyArray<E> }> {
  readonly _tag = 'CompositionE'

  readonly [CompositionETypeId]: CompositionETypeId = CompositionETypeId
}
export function compositionE<E>(errors: NonEmptyArray<E>): CompositionE<E> {
  return new CompositionE({ errors })
}
export function isCompositionE(u: unknown): u is CompositionE<unknown> {
  return isObject(u) && CompositionETypeId in u
}

export class CompoundE<E> extends CaseClass<{ name: string, errors: NonEmptyArray<E> }> {
  readonly _tag = 'CompoundE'
}
export function compoundE(name: string): <E>(errors: NonEmptyArray<E>) => CompoundE<E> {
  return (errors) => new CompoundE({ name, errors })
}

export const structE = compoundE('struct')

export const partialE = compoundE('partial')

export const arrayE = compoundE('array')

export const recordE = compoundE('record')

export const unionE = compoundE('union')

export const intersectionE = compoundE('intersection')

/*
 * -------------------------------------------
 * leaf errors
 * -------------------------------------------
 */

export interface ActualE<I> {
  readonly actual: I
}

export class StringE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'StringE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a string'))
  }
}
export interface StringLE extends LeafE<StringE> {}
export function stringE(actual: unknown): StringE {
  return new StringE({ actual })
}

export class NumberE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'NumberE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a number'))
  }
}
export interface NumberLE extends LeafE<NumberE> {}
export function numberE(actual: unknown): NumberE {
  return new NumberE({ actual })
}

export class NaNE extends DefaultLeafE<{}> {
  readonly _tag = 'NaNE'
  get [$toTree]() {
    return RT.roseTree('value is NaN')
  }
}
export interface NaNLE extends LeafE<NaNE> {}
export const nanE: NaNE = new NaNE()

export class InfinityE extends DefaultLeafE<{}> {
  readonly _tag = 'InfinityE'
  get [$toTree]() {
    return RT.roseTree('value is Infinity')
  }
}
export interface InfinityLE extends LeafE<InfinityE> {}
export const infinityE: InfinityE = new InfinityE()

export class BooleanE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'BooleanE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a boolean'))
  }
}
export interface BooleanLE extends LeafE<BooleanE> {}
export function booleanE(actual: unknown): BooleanE {
  return new BooleanE({ actual })
}

export class LiteralE<A extends Primitive> extends DefaultLeafE<
  ActualE<unknown> & { readonly literals: NonEmptyArray<A> }
> {
  readonly _tag = 'LiteralE'
  get [$toTree]() {
    return RT.roseTree(
      cannotDecode(
        this.actual,
        `one of ${pipe(
          this.literals,
          A.map((literal) => JSON.stringify(literal)),
          A.join(', ')
        )}`
      )
    )
  }
}
export interface LiteralLE<A extends Primitive> extends LeafE<LiteralE<A>> {}
export function literalE<A extends Primitive>(actual: unknown, literals: NonEmptyArray<A>): LiteralE<A> {
  return new LiteralE({ actual, literals })
}

export class UnknownArrayE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'UnknownArrayE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'an array'))
  }
}
export interface UnknownArrayLE extends LeafE<UnknownArrayE> {}
export function unknownArrayE(actual: unknown): UnknownArrayE {
  return new UnknownArrayE({ actual })
}

export class UnknownIterableE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'UnknownIterableE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'an iterable'))
  }
}
export interface UnknownIterableLE extends LeafE<UnknownIterableE> {}
export function unknownIterableE(actual: unknown): UnknownIterableE {
  return new UnknownIterableE({ actual })
}

export class EmptyE<A> extends DefaultLeafE<ActualE<A>> {
  readonly _tag = 'EmptyE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a collection containing at least one element'))
  }
}
export interface EmptyLE<A> extends LeafE<EmptyE<A>> {}
export function emptyE<A>(actual: A): EmptyE<A> {
  return new EmptyE({ actual })
}

export class PositiveE<A> extends DefaultLeafE<ActualE<A>> {
  readonly _tag = 'PositiveE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a positive number'))
  }
}
export interface PositiveLE<A> extends LeafE<PositiveE<A>> {}
export function positiveE<A>(actual: A): PositiveE<A> {
  return new PositiveE({ actual })
}

export class UnknownRecordE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'UnknownRecordE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'an object'))
  }
}
export interface UnknownRecordLE extends LeafE<UnknownRecordE> {}
export function unknownRecordE(actual: unknown): UnknownRecordE {
  return new UnknownRecordE({ actual })
}

export class BigIntE extends DefaultLeafE<ActualE<unknown>> {
  readonly _tag = 'BigIntE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a string coercable into a bigint'))
  }
}
export interface BigIntLE extends LeafE<BigIntE> {}
export function bigIntE(actual: unknown): BigIntE {
  return new BigIntE({ actual })
}

export class DateFromMsE extends DefaultLeafE<ActualE<number>> {
  readonly _tag = 'DateFromMsE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a number on milliseconds coercable into a Date'))
  }
}
export interface DateFromMsLE extends LeafE<DateFromMsE> {}
export function dateFromMsE(actual: number): DateFromMsE {
  return new DateFromMsE({ actual })
}

export class DateFromStringE extends DefaultLeafE<ActualE<string>> {
  readonly _tag = 'DateFromStringE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'an ISO date string'))
  }
}
export interface DateFromStringLE extends LeafE<DateFromStringE> {}
export function dateFromStringE(actual: string): DateFromStringE {
  return new DateFromStringE({ actual })
}

export class NewtypePrismE<A> extends DefaultLeafE<ActualE<A>> {
  readonly _tag = 'NewtypePrismE'
  get [$toTree]() {
    return RT.roseTree(cannotDecode(this.actual, 'a value conforming to the prism'))
  }
}
export interface NewtypePrismLE<A> extends LeafE<NewtypePrismE<A>> {}
export function newtypePrismE<A>(actual: A): NewtypePrismE<A> {
  return new NewtypePrismE({ actual })
}

export class TagE extends DefaultLeafE<{ readonly tag: string, readonly literals: ReadonlyArray<string> }> {
  readonly _tag = 'TagE'
  get [$toTree]() {
    return RT.roseTree(
      cannotDecode(
        `the sum tag ${this.tag}`,
        `one of ${pipe(
          this.literals,
          A.map((literal) => JSON.stringify(literal)),
          A.join(', ')
        )}`
      )
    )
  }
}
export interface TagLE extends LeafE<TagE> {}
export function tagE(tag: string, literals: ReadonlyArray<string>): TagE {
  return new TagE({ tag, literals })
}

export class UnexpectedKeysE extends DefaultLeafE<{ readonly keys: NonEmptyArray<string> }> {
  readonly _tag = 'UnexpectedKeysE'
  get [$toTree]() {
    return RT.roseTree(
      `${this.keys.length} error(s) found while checking keys`,
      A.map_(this.keys, (key) => RT.roseTree(`unexpected key ${key}`))
    )
  }
}
export interface UnexpectedKeysLE extends LeafE<UnexpectedKeysE> {}
export function unexpectedKeysE(keys: NonEmptyArray<string>): UnexpectedKeysE {
  return new UnexpectedKeysE({ keys })
}
export function isUnexpectedKeysE(u: unknown): u is UnexpectedKeysE {
  return isObject(u) && '_tag' in u && u['_tag'] === 'UnexpectedKeysE'
}

export class UnexpectedIndicesE extends DefaultLeafE<{ readonly indices: NonEmptyArray<number> }> {
  readonly _tag = 'UnexpectedIndicesE'
  get [$toTree]() {
    return RT.roseTree(
      `${this.indices.length} error(s) found while checking indices`,
      A.map_(this.indices, (index) => RT.roseTree(`unexpected index ${index}`))
    )
  }
}
export interface UnexpectedIndicesLE extends LeafE<UnexpectedIndicesE> {}
export function unexpectedIndicesE(indices: NonEmptyArray<number>): UnexpectedIndicesE {
  return new UnexpectedIndicesE({ indices })
}
export function isUnexpectedIndicesE(u: unknown): u is UnexpectedIndicesE {
  return isObject(u) && '_tag' in u && u['_tag'] === 'UnexpectedIndicesE'
}

export class MissingKeysE<K> extends DefaultLeafE<{ readonly keys: NonEmptyArray<K> }> {
  readonly _tag = 'MissingKeysE'
  get [$toTree]() {
    return RT.roseTree(
      `${this.keys.length} error(s) found while checking keys`,
      A.map_(this.keys, (key) => RT.roseTree(`missing required key ${key}`))
    )
  }
}
export interface MissingKeysLE<K> extends LeafE<MissingKeysE<K>> {}
export function missingKeysE<K>(keys: NonEmptyArray<K>): MissingKeysE<K> {
  return new MissingKeysE({ keys })
}

export class MissingIndicesE extends DefaultLeafE<{ readonly indices: NonEmptyArray<number> }> {
  readonly _tag = 'MissingIndicesE'
  get [$toTree]() {
    return RT.roseTree(
      `${this.indices.length} error(s) found while checking indices`,
      A.map_(this.indices, (index) => RT.roseTree(`missing required index ${index}`))
    )
  }
}
export interface MissingIndicesLE extends LeafE<MissingIndicesE> {}
export function missingIndicesE(indices: NonEmptyArray<number>): MissingIndicesE {
  return new MissingIndicesE({ indices })
}

/*
 * -------------------------------------------
 * single errors
 * -------------------------------------------
 */

export interface SingleE<E> {
  readonly error: E
}

export class LeafE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'LeafE'
}
export function leafE<E>(error: E): LeafE<E> {
  return new LeafE({ error })
}

export class NullableE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'NullableE'
}
export function nullableE<E>(error: E): NullableE<E> {
  return new NullableE({ error })
}

export class OptionalE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'OptionalE'
}
export function optionalE<E>(error: E): OptionalE<E> {
  return new OptionalE({ error })
}

export class RequiredKeyE<K, E> extends CaseClass<SingleE<E> & { readonly key: K }> {
  readonly _tag = 'RequiredKeyE'
}
export function requiredKeyE<K, E>(key: K, error: E): RequiredKeyE<K, E> {
  return new RequiredKeyE({ error, key })
}

export class OptionalKeyE<K, E> extends CaseClass<SingleE<E> & { readonly key: K }> {
  readonly _tag = 'OptionalKeyE'
}
export function optionalKeyE<K, E>(key: K, error: E): OptionalKeyE<K, E> {
  return new OptionalKeyE({ error, key })
}

export class RequiredIndexE<I, E> extends CaseClass<SingleE<E> & { readonly index: I }> {
  readonly _tag = 'RequiredIndexE'
}
export function requiredIndexE<I, E>(index: I, error: E): RequiredIndexE<I, E> {
  return new RequiredIndexE({ index, error })
}

export const tupleE = compoundE('tuple')

export class OptionalIndexE<I, E> extends CaseClass<SingleE<E> & { readonly index: I }> {
  readonly _tag = 'OptionalIndexE'
}
export function optionalIndexE<I, E>(index: I, error: E): OptionalIndexE<I, E> {
  return new OptionalIndexE({ error, index })
}

export class RefinementE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'RefinementE'
}
export function refinementE<E>(error: E): RefinementE<E> {
  return new RefinementE({ error })
}

export class ParserE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'ParserE'
}
export function parserE<E>(error: E): ParserE<E> {
  return new ParserE({ error })
}

export class LazyE<E> extends CaseClass<SingleE<E> & { readonly id: string }> {
  readonly _tag = 'LazyE'
}
export function lazyE<E>(id: string, error: E): LazyE<E> {
  return new LazyE({ error, id })
}

export class MemberE<M, E> extends CaseClass<SingleE<E> & { readonly member: M }> {
  readonly _tag = 'MemberE'
}
export function memberE<M, E>(member: M, error: E): MemberE<M, E> {
  return new MemberE({ error, member })
}

export class SumE<E> extends CaseClass<SingleE<E>> {
  readonly _tag = 'SumE'
}
export function sumE<E>(error: E): SumE<E> {
  return new SumE({ error })
}

export class LabeledE<E> extends CaseClass<SingleE<E> & { readonly label: string }> {
  readonly _tag = 'LabeledE'
}
export function labeledE<E>(label: string, error: E): LabeledE<E> {
  return new LabeledE({ error, label })
}

export class MessageE<E> extends CaseClass<SingleE<E> & { readonly message: string }> {
  readonly _tag = 'MessageE'
}
export function messageE<E>(message: string, error: E): MessageE<E> {
  return new MessageE({ error, message })
}

export class NamedE<N extends string, E> extends CaseClass<SingleE<E> & { readonly name: N }> {
  readonly _tag = 'NamedE'
}
export function namedE<N extends string, E>(name: N, error: E): NamedE<N, E> {
  return new NamedE({ error, name })
}

export type DecodeErrorPaths<E> =
  | { actual: unknown, expected: unknown }
  | {
      [k: string]: DecodeErrorPaths<E>
    }

/*
 * -------------------------------------------
 * fold
 * -------------------------------------------
 */

function foldEval<E, B>(
  de: ParseError<E>,
  leaf: (e: E) => B,
  patterns: {
    CompoundE: (name: string, bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    SumE: (b: B) => B
    NamedE: (name: string, b: B) => B
    LabeledE: (label: string, b: B) => B
    MessageE: (message: string, b: B) => B
  }
): Eval<B> {
  return Ev.defer(() => {
    switch (de._tag) {
      case 'CompoundE': {
        return pipe(
          de.errors,
          NA.traverse(Ev.Applicative)((e) => foldEval(e, leaf, patterns)),
          Ev.map((bs) => patterns.CompoundE(de.name, bs))
        )
      }
      case 'CompositionE': {
        return pipe(
          de.errors,
          NA.traverse(Ev.Applicative)((e) => foldEval(e, leaf, patterns)),
          Ev.map((bs) => patterns.CompositionE(bs))
        )
      }
      case 'LazyE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.LazyE(de.id, b))
        )
      }
      case 'MemberE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.MemberE(de.member, b))
        )
      }
      case 'SumE':
      case 'NullableE':
      case 'OptionalE':
      case 'RefinementE':
      case 'ParserE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](b))
        )
      }
      case 'RequiredIndexE':
      case 'OptionalIndexE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](de.index, b))
        )
      }
      case 'RequiredKeyE':
      case 'OptionalKeyE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](de.key, b))
        )
      }
      case 'LabeledE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.LabeledE(de.label, b))
        )
      }
      case 'MessageE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.MessageE(de.message, b))
        )
      }
      case 'NamedE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.NamedE(de.name, b))
        )
      }
      case 'LeafE': {
        return Ev.now(leaf(de.error))
      }
    }
  })
}

export function fold_<E, B>(
  de: ParseError<E>,
  leaf: (e: E) => B,
  patterns: {
    CompoundE: (name: string, bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    NamedE: (name: string, b: B) => B
    LabeledE: (label: string, b: B) => B
    MessageE: (message: string, b: B) => B
    SumE: (b: B) => B
  }
): B {
  return Ev.run(foldEval(de, leaf, patterns))
}

export function fold<E, B>(
  leaf: (e: E) => B,
  patterns: {
    CompoundE: (name: string, bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    NamedE: (name: string, b: B) => B
    LabeledE: (label: string, b: B) => B
    MessageE: (message: string, b: B) => B
    SumE: (b: B) => B
  }
): (de: ParseError<E>) => B {
  return (de) => fold_(de, leaf, patterns)
}

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

type ConstrainDecodeError<E> = E extends ParseError<any> ? E : never
type InnerErrorOf<E> = E extends ParseError<infer U> ? U : never

const vowels = ['a', 'e', 'i', 'o', 'u', 'y']

const startsWithVowel = (s: string): boolean => {
  for (let i = 0; i < vowels.length; i++) {
    if (s.startsWith(vowels[i])) return true
  }
  return false
}

export function toTreeWith_<E>(
  de: ConstrainDecodeError<E>,
  toTree: (e: InnerErrorOf<E>) => RoseTree<string>
): RoseTree<string> {
  return fold_(de, toTree, {
    CompoundE: (name, bs) =>
      name === 'composition' && bs.length === 1
        ? bs[0]
        : RT.roseTree(`${bs.length} error(s) found while decoding ${startsWithVowel(name) ? 'an' : 'a'} ${name}`, bs),
    CompositionE: (bs) =>
      bs.length === 1 ? bs[0] : RT.roseTree(`${bs.length} error(s) found while decoding a composition`, bs),
    SumE: (b) => RT.roseTree('1 error found while decoding a sum', [b]),
    LazyE: (id, b) => RT.roseTree(`1 error found while decoding the lazy decoder ${id}`, [b]),
    NamedE: (name, b) => RT.roseTree(`with the name: ${name}`, [b]),
    MessageE: (message, b) => RT.roseTree(`with the message: ${message}`, [b]),
    LabeledE: (label, b) => RT.roseTree(`with the label: ${label}`, [b]),
    MemberE: (member, b) => RT.roseTree(`on member ${member}`, [b]),
    OptionalIndexE: (index, b) => RT.roseTree(`on index ${index}`, [b]),
    RequiredIndexE: (index, b) => RT.roseTree(`on component ${index}`, [b]),
    OptionalKeyE: (key, b) => RT.roseTree(`on optional key ${key}`, [b]),
    RequiredKeyE: (key, b) => RT.roseTree(`on required key ${key}`, [b]),
    NullableE: (b) => RT.roseTree('1 error found while decoding a nullable', [b]),
    OptionalE: (b) => RT.roseTree('1 error found while decoding an optional', [b]),
    RefinementE: (b) => RT.roseTree('1 error found while decoding a refinement', [b]),
    ParserE: (b) => RT.roseTree('1 error found while decoding a parser', [b])
  })
}

export function toTreeWith<E>(
  toTree: (e: InnerErrorOf<E>) => RoseTree<string>
): (de: ConstrainDecodeError<E>) => RoseTree<string> {
  return (de) => toTreeWith_(de, toTree)
}

export function toTreeWithP_<E>(de: ParseError<E>, toTree: (e: E) => RoseTree<string>): RoseTree<string> {
  return toTreeWith_(de, toTree as any)
}

export function toTreeWithP<E>(toTree: (e: E) => RoseTree<string>): (de: ParseError<E>) => RoseTree<string> {
  return toTreeWith(toTree as any)
}

const format = (u: unknown): string => (typeof u === 'string' ? JSON.stringify(u) : show(u))

export function cannotDecode(u: unknown, expected: string): string {
  return `cannot decode ${format(u)}, expected ${expected}`
}

export function toTreeBuiltin(de: BuiltinE): RoseTree<string> {
  switch (de._tag) {
    case 'StringE':
      return RT.roseTree(cannotDecode(de.actual, 'a string'))
    case 'NumberE':
      return RT.roseTree(cannotDecode(de.actual, 'a number'))
    case 'BooleanE':
      return RT.roseTree(cannotDecode(de.actual, 'a boolean'))
    case 'UnknownArrayE':
      return RT.roseTree(cannotDecode(de.actual, 'an array'))
    case 'UnknownRecordE':
      return RT.roseTree(cannotDecode(de.actual, 'an object'))
    case 'NaNE':
      return RT.roseTree('value is NaN')
    case 'InfinityE':
      return RT.roseTree('value is Infinity')
    case 'BigIntE':
      return RT.roseTree(cannotDecode(de.actual, 'a string coercable into a bigint'))
    case 'EmptyE':
      return RT.roseTree('array contains no elements')
    case 'NewtypePrismE':
      return RT.roseTree(cannotDecode(de.actual, 'a value conforming to the prism'))
    case 'LiteralE':
      return RT.roseTree(
        cannotDecode(
          de.actual,
          `one of ${pipe(
            de.literals,
            A.map((literal) => JSON.stringify(literal)),
            A.join(', ')
          )}`
        )
      )
    case 'TagE':
      return RT.roseTree(
        cannotDecode(
          `the sum tag ${de.tag}`,
          `one of ${pipe(
            de.literals,
            A.map((literal) => JSON.stringify(literal)),
            A.join(', ')
          )}`
        )
      )
    case 'UnexpectedIndicesE':
      return RT.roseTree(
        `${de.indices.length} error(s) found while checking indices`,
        A.map_(de.indices, (index) => RT.roseTree(`unexpected index ${index}`))
      )
    case 'UnexpectedKeysE':
      return RT.roseTree(
        `${de.keys.length} error(s) found while checking keys`,
        A.map_(de.keys, (key) => RT.roseTree(`unexpected key ${key}`))
      )
    case 'MissingIndicesE':
      return RT.roseTree(
        `${de.indices.length} error(s) found while checking indices`,
        A.map_(de.indices, (index) => RT.roseTree(`missing required index ${index}`))
      )
    case 'MissingKeysE':
      return RT.roseTree(
        `${de.keys.length} error(s) found while checking keys`,
        A.map_(de.keys, (key) => RT.roseTree(`missing required key ${key}`))
      )
  }
}

export const toTree    = toTreeWithP((e: HasDefaultLeafE) => e[$toTree])
export const drawError = flow(toTree, RT.drawTree(Str.Show))
export const draw      = Th.mapLeft(drawError)

const printValue    = <A>(a: A): string => 'Value:\n' + format(a)
const printErrors   = (s: string): string => (s === '' ? s : 'Errors:\n' + s)
const printWarnings = (s: string): string => (s === '' ? s : 'Warnings:\n' + s)

export const print = Th.match(printErrors, printValue, (e, a) => printValue(a) + '\n' + printWarnings(e))
export const debug = flow(draw, print, console.log)

export function some_<E>(de: ParseError<E>, predicate: Predicate<E>): boolean {
  const go = (de: ParseError<E>): boolean => {
    switch (de._tag) {
      case 'CompoundE':
      case 'CompositionE':
        return de.errors.some(go)
      case 'RequiredKeyE':
      case 'RequiredIndexE':
      case 'OptionalKeyE':
      case 'OptionalIndexE':
      case 'MemberE':
      case 'NullableE':
      case 'RefinementE':
      case 'ParserE':
      case 'LazyE':
      case 'SumE':
      case 'OptionalE':
      case 'NamedE':
      case 'MessageE':
      case 'LabeledE':
        return go(de.error)
      case 'LeafE':
        return predicate(de.error)
    }
  }
  return go(de)
}

export function some<E>(predicate: Predicate<E>): (de: ParseError<E>) => boolean {
  return (de) => some_(de, predicate)
}

export type Prunable = ReadonlyArray<string>

function collectPrunable<E>(de: ParseError<E>): Prunable {
  const go = (de: ParseError<E>): Prunable => {
    switch (de._tag) {
      case 'CompoundE':
      case 'CompositionE':
        return pipe(de.errors, A.chain(go))
      case 'SumE':
      case 'LazyE':
      case 'MemberE':
      case 'NullableE':
      case 'ParserE':
      case 'RefinementE':
      case 'OptionalE':
      case 'NamedE':
      case 'LabeledE':
      case 'MessageE':
        return go(de.error)
      case 'OptionalIndexE':
        return go(de.error).map((s) => String(de.index) + '.' + s)
      case 'OptionalKeyE':
        return go(de.error).map((s) => de.key + '.' + s)
      case 'RequiredIndexE':
        return go(de.error).map((s) => String(de.index) + '.' + s)
      case 'RequiredKeyE':
        return go(de.error).map((s) => de.key + '.' + s)
      case 'LeafE':
        return isUnexpectedIndicesE(de.error)
          ? de.error.indices.map(String)
          : isUnexpectedKeysE(de.error)
          ? de.error.keys
          : A.empty()
    }
  }
  return go(de)
}

function make<E>(
  constructor: (error: NonEmptyArray<ParseError<E>>) => ParseError<E>
): (pdes: ReadonlyArray<ParseError<E>>) => M.Maybe<ParseError<E>> {
  return (pdes) => (A.isNonEmpty(pdes) ? M.just(constructor(pdes)) : M.nothing())
}

function prune(prunable: Prunable, anticollision: string): (de: AnyError) => M.Maybe<AnyError> {
  const go = (de: AnyError): M.Maybe<AnyError> => {
    switch (de._tag) {
      case 'CompoundE':
        return pipe(de.errors, A.filterMap(prune(prunable, anticollision)), make(compoundE(de.name)))
      case 'CompositionE':
        return pipe(de.errors, A.filterMap(prune(prunable, anticollision)), make(compositionE))
      case 'SumE':
        return pipe(de.error, prune(prunable, anticollision), M.map(sumE))
      case 'NullableE':
        return pipe(de.error, prune(prunable, anticollision), M.map(nullableE))
      case 'OptionalE':
        return pipe(de.error, prune(prunable, anticollision), M.map(optionalE))
      case 'ParserE':
        return pipe(de.error, prune(prunable, anticollision), M.map(parserE))
      case 'RefinementE':
        return pipe(de.error, prune(prunable, anticollision), M.map(refinementE))
      case 'LazyE':
        return pipe(
          de.error,
          prune(prunable, anticollision),
          M.map((pde) => lazyE(de.id, pde))
        )
      case 'MemberE':
        return pipe(
          de.error,
          prune(prunable, anticollision),
          M.map((pde) => memberE(de.member, pde))
        )
      case 'OptionalIndexE':
        return pipe(
          de.error,
          prune(prunable, anticollision + de.index + '.'),
          M.map((pde) => optionalIndexE(de.index, pde))
        )
      case 'OptionalKeyE':
        return pipe(
          de.error,
          prune(prunable, anticollision + de.key + '.'),
          M.map((pde) => optionalKeyE(de.key, pde))
        )
      case 'RequiredIndexE':
        return pipe(
          de.error,
          prune(prunable, anticollision + de.index + '.'),
          M.map((pde) => requiredIndexE(de.index, pde))
        )
      case 'RequiredKeyE':
        return pipe(
          de.error,
          prune(prunable, anticollision + de.key + '.'),
          M.map((pde) => requiredKeyE(de.key, pde))
        )
      case 'LeafE':
        return isUnexpectedIndicesE(de.error)
          ? pipe(
              de.error.indices,
              A.filter((index) => prunable.indexOf(anticollision + String(index)) !== -1),
              F.if(A.isNonEmpty, () => M.nothing(), flow(unexpectedIndicesE, leafE, M.just))
            )
          : isUnexpectedKeysE(de.error)
          ? pipe(
              de.error.keys,
              A.filter((key) => prunable.indexOf(anticollision + key) !== -1),
              F.if(A.isNonEmpty, () => M.nothing(), flow(unexpectedKeysE, leafE, M.just))
            )
          : M.just(de)
      case 'NamedE':
        return pipe(
          de.error,
          prune(prunable, anticollision),
          M.map((pde) => namedE(de.name, pde))
        )
      case 'LabeledE':
        return pipe(
          de.error,
          prune(prunable, anticollision),
          M.map((pde) => labeledE(de.label, pde))
        )
      case 'MessageE':
        return pipe(
          de.error,
          prune(prunable, anticollision),
          M.map((pde) => messageE(de.message, pde))
        )
    }
  }
  return go
}

export function pruneAllUnexpected(de: MemberE<number, any>): CompoundE<MemberE<number, any>> | null {
  const e = prune([], '')(de) as M.Maybe<MemberE<number, any>>
  return M.isJust(e) ? intersectionE([e.value]) : null
}

export function pruneDifference(des: NonEmptyArray<MemberE<number, any>>): CompoundE<MemberE<number, any>> | null {
  if (des.length === 1) {
    return intersectionE([memberE(0, des[0])])
  } else {
    let errors: Array<MemberE<number, ParseError<any>>> = []

    const de0  = des[0].error
    const de1  = des[1].error
    const pde0 = prune(collectPrunable(de1), '')(de0)
    const pde1 = prune(collectPrunable(de0), '')(de1)
    M.isJust(pde0) && errors.push(memberE(0, pde0.value))
    M.isJust(pde1) && errors.push(memberE(1, pde1.value))
    const rest = des.slice(2)
    if (A.isNonEmpty(rest)) {
      for (let i = 0; i < rest.length; i++) {
        const dei      = rest[i].error
        const prunable = A.chain_(errors, collectPrunable)
        if (A.isNonEmpty(errors)) {
          errors = pipe(errors, A.filterMap(prune(collectPrunable(dei), ''))) as typeof errors

          const pdei = prune(prunable, '')(dei)
          M.isJust(pdei) && errors.push(memberE(i + 2, pdei.value))
        } else if (rest[i + 1]) {
          const dei1  = rest[i + 1].error
          const pdei  = prune(collectPrunable(dei1), '')(dei)
          const pdei1 = prune(collectPrunable(dei), '')(dei1)
          M.isJust(pdei) && errors.push(memberE(i + 2, pdei.value))
          M.isJust(pdei1) && errors.push(memberE(i + 3, pdei1.value))
          i++
        } else {
          errors.push(memberE(i + 2, dei))
        }
      }
    }
    return A.isNonEmpty(errors) ? intersectionE(errors) : null
  }
}
