import type * as PE from '../ParseError'
import type { Option } from '@principia/base/Option'
import type { EnforceNonEmptyRecord } from '@principia/base/prelude'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import { tuple } from '@principia/base/tuple'

import * as Eq from '../Eq'
import * as G from '../Guard'
import * as S from './core'
import { to } from './interpreter'
import { isPropertiesS, isPropertyRecord, tagsFromProps } from './properties'

export interface MatchS<Props extends Record<PropertyKey, S.AnyUS>, AS> {
  <
    M extends {
      [K in keyof Props]?: (x0: S.TypeOf<Props[K]>, x1: S.TypeOf<Props[K]>) => Result
    },
    Result
  >(
    mat: M,
    def: (
      x0: { [K in keyof Props]: S.TypeOf<Props[K]> }[Exclude<keyof Props, keyof M>],
      x1: { [K in keyof Props]: S.TypeOf<Props[K]> }[Exclude<keyof Props, keyof M>]
    ) => Result
  ): (ks: AS) => Result
  <Result>(
    mat: {
      [K in keyof Props]: (_: S.TypeOf<Props[K]>, __: S.TypeOf<Props[K]>) => Result
    }
  ): (ks: AS) => Result
}

export interface MatchW<Props extends Record<PropertyKey, S.AnyUS>, AS> {
  <
    M extends {
      [K in keyof Props]?: (_: S.TypeOf<Props[K]>, __: S.TypeOf<Props[K]>) => any
    },
    Result
  >(
    mat: M,
    def: (
      x0: { [K in keyof Props]: S.TypeOf<Props[K]> }[Exclude<keyof Props, keyof M>],
      x1: { [K in keyof Props]: S.TypeOf<Props[K]> }[Exclude<keyof Props, keyof M>]
    ) => Result
  ): (ks: AS) =>
    | {
        [K in keyof M]: M[K] extends (_: S.TypeOf<Props[K]>, __: S.TypeOf<Props[K]>) => any ? ReturnType<M[K]> : never
      }[keyof M]
    | Result
  <
    M extends {
      [K in keyof Props]: (_: S.TypeOf<Props[K]>, __: S.TypeOf<Props[K]>) => any
    }
  >(
    _: M
  ): (ks: AS) => {
    [K in keyof M]: ReturnType<M[K]>
  }[keyof M]
}

export interface TagInfo {
  key: string
  index: Record<string, string>
  values: ReadonlyArray<string>
}

export interface TaggedUnionApi<P extends Record<PropertyKey, S.AnyUS>> {
  readonly matchS: MatchS<P, S.TypeOf<P[keyof P]>>
  readonly matchW: MatchW<P, S.TypeOf<P[keyof P]>>
}

export class TaggedUnionS<M extends Record<PropertyKey, S.AnyUS>> extends S.Schema<
  S.URISIn<M[keyof M]>,
  unknown,
  S.CInputOf<M[keyof M]>,
  PE.UnknownRecordLE | PE.TagLE | PE.CompoundE<{ [K in keyof M]: PE.MemberE<K, S.ErrorOf<M[K]>> }[keyof M]>,
  PE.TagLE | PE.CompoundE<{ [K in keyof M]: PE.MemberE<K, S.CErrorOf<M[K]>> }[keyof M]>,
  S.TypeOf<M[keyof M]>,
  S.OutputOf<M[keyof M]>,
  TaggedUnionApi<M>
> {
  readonly _tag = 'TaggedUnion'
  readonly tag: Option<TagInfo>
  readonly entries: ReadonlyArray<readonly [string, S.AnyUS]>
  readonly entriesTags: ReadonlyArray<readonly [string, Record<string, string>]>
  readonly guards = R.map_(this.members, to(G.Schemable))
  constructor(readonly members: M) {
    super()
    this.entries     = R.collect_(members, (k, v) => tuple(k, v))
    this.entriesTags = A.map_(this.entries, ([k, s]) =>
      tuple(
        k,
        isPropertiesS(s) || ('properties' in s.api && isPropertyRecord(s.api['properties']))
          ? tagsFromProps(s.api.properties)
          : {}
      )
    )
    const firstMemberTags = this.entriesTags[0]![1]

    this.tag = A.findMap_(Object.keys(firstMemberTags), (tagField) => {
      const tags = pipe(
        this.entriesTags,
        A.filterMap(([member, tags]) => {
          if (tagField in tags) {
            return O.some(tuple(tags[tagField], member))
          }
          return O.none()
        }),
        A.uniq(Eq.Eq((x, y) => x[0] === y[0]))
      )
      if (tags.length === this.entries.length) {
        return O.some({
          key: tagField,
          index: A.foldl_(tags, {}, (b, [tagValue, memberField]) => {
            b[tagValue] = memberField
            return b
          }),
          values: A.map_(tags, ([tagValue]) => tagValue)
        })
      }
      return O.none()
    })
  }
  get api() {
    return {
      matchS: (matcher, def) => (ks) => {
        if (O.isSome(this.tag)) {
          return (matcher[ks[this.tag.value.key]] ?? def)(ks, ks)
        }
        for (const k in this.members) {
          if (this.guards[k].is(ks)) {
            return (matcher[k] ?? def)(ks, ks)
          }
        }
        throw new Error("bug: can't find any valid matcher")
      },
      matchW: (matcher, def) => (ks) => {
        if (O.isSome(this.tag)) {
          return (matcher[ks[this.tag.value.key]] ?? def)(ks, ks)
        }
        for (const k in this.members) {
          if (this.guards[k].is(ks)) {
            return (matcher[k] ?? def)(ks, ks)
          }
        }
        throw new Error("bug: can't find any valid matcher")
      }
    } as TaggedUnionApi<M>
  }

  clone(): TaggedUnionS<M> {
    return new TaggedUnionS(this.members)
  }
}

export function taggedUnion<M extends Record<PropertyKey, S.AnyUS>>(
  members: S.EnsureStructURIS<M & EnforceNonEmptyRecord<M>>
): TaggedUnionS<M> {
  return new TaggedUnionS(members as M)
}
