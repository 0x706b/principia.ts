import type { IsEqualTo } from '@principia/base/util/types'

import * as D from '@principia/base/collection/immutable/Record'
import { identity, pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as TH from '@principia/base/These'
import { tuple } from '@principia/base/tuple'
import * as S from '@principia/schema'
import * as PARS from '@principia/schema/Decoder'
import * as ENC from '@principia/schema/Encoder'

import { ActorSystemException, CommandParserException } from './exceptions'

export const RequestSchemaSymbol  = Symbol('@principia/actors/Message/RequestSchema')
export const ResponseSchemaSymbol = Symbol('@principia/actors/Message/ResponseSchema')
export const ErrorSchemaSymbol    = Symbol('@principia/actors/Message/ErrorSchema')

export interface Message<Tag extends string, Req extends S.AnyUS, Err extends S.AnyUS, Res extends S.AnyUS> {
  readonly _tag: Tag
  readonly _Response: () => S.TypeOf<Res>
  readonly _Error: () => S.TypeOf<Err>

  readonly [ResponseSchemaSymbol]: Res
  readonly [RequestSchemaSymbol]: Req
  readonly [ErrorSchemaSymbol]: M.Maybe<Err>
}

export type TypedMessage<
  Tag extends string,
  Req extends S.AnyUS,
  Err extends S.AnyUS,
  Res extends S.AnyUS
> = S.TypeOf<Req> & Message<Tag, Req, Err, Res>

export type AnyMessage = Message<any, S.AnyS, S.AnyS, S.AnyS>

export type ResponseOf<A extends AnyMessage> = [A] extends [Message<any, any, any, infer Res>] ? S.TypeOf<Res> : never

export type ErrorOf<A extends AnyMessage> = [A] extends [Message<any, any, infer Err, any>] ? S.TypeOf<Err> : never

export type RequestOf<A extends AnyMessage> = [A] extends [Message<any, infer Req, any, any>] ? S.TypeOf<Req> : never

export type TagsOf<A extends AnyMessage> = A['_tag']
export type ExtractTagged<A extends AnyMessage, Tag extends string> = Extract<A, TypedMessage<Tag, any, any, any>>

type MessageFactoryOf<A extends AnyMessage> = [A] extends [Message<infer Tag, infer Req, infer Err, infer Res>]
  ? MessageFactory<Tag, Req, Err, Res>
  : never

export interface MessageRegistry<F1> extends Record<string, [F1] extends [AnyMessage] ? MessageFactoryOf<F1> : never> {}

export type InstanceOf<A> = [A] extends [{ new (...any: any[]): infer B }] ? B : never

export interface MessageFactory<Tag extends string, Req extends S.AnyUS, Err extends S.AnyUS, Res extends S.AnyUS> {
  readonly Tag: Tag
  readonly RequestSchema: Req
  readonly ErrorSchema: M.Maybe<Err>
  readonly ResponseSchema: Res

  new (_: IsEqualTo<S.TypeOf<Req>, {}> extends true ? void : S.TypeOf<Req>): TypedMessage<Tag, Req, Err, Res>
}

export type AnyMessageFactory = MessageFactory<any, S.AnyS, S.AnyS, S.AnyS>

export type TypeOf<A extends MessageRegistry<any>> = [A] extends [MessageRegistry<infer B>] ? B : never

export function Message<Tag extends string, Req extends S.AnyUS, Res extends S.AnyUS, Err extends S.AnyUS = never>(
  Tag: Tag,
  Req: Req,
  Res: Res,
  Err?: Err
): MessageFactory<Tag, Req, Err, Res> {
  // @ts-expect-error
  return class {
    static RequestSchema = Req
    static ResponseSchema = Res
    static ErrorSchema = M.fromNullable(Err)
    static Tag = Tag

    readonly _tag = Tag;

    readonly [ResponseSchemaSymbol] = Res;
    readonly [RequestSchemaSymbol] = Req;
    readonly [ErrorSchemaSymbol] = M.fromNullable(Err)

    constructor(ps?: any) {
      if (ps) {
        for (const k of Object.keys(ps)) {
          Object.defineProperty(this, k, { value: ps[k] })
        }
      }
    }
  }
}

export function messages<Messages extends AnyMessageFactory[]>(
  ...messages: Messages
): MessageRegistry<InstanceOf<Messages[number]>> {
  return messages.reduce((obj, entry) => ({ ...obj, [entry.Tag]: entry }), {} as MessageRegistry<any>)
}

export function decodeCommand<F1 extends AnyMessage>(
  registry: MessageRegistry<F1>
): (
  msg: unknown
) => T.IO<
  unknown,
  ActorSystemException,
  readonly [F1, (response: ResponseOf<F1>) => unknown, (error: ErrorOf<F1> | ActorSystemException) => unknown]
> {
  const parser = pipe(
    registry,
    D.map((entry) => S.intersect(entry.RequestSchema, S.properties({ _tag: S.prop(S.tag(entry.Tag)) }))),
    S.taggedUnion,
    PARS.for
  )

  return (msg) =>
    pipe(
      parser(msg),
      TH.match(
        (e) => T.fail(e),
        (a) => T.succeed(a),
        (_, a) => T.succeed(a)
      ),
      T.map((t: any) =>
        tuple(
          new registry[t._tag](t),
          ENC.for(registry[t._tag].ResponseSchema),
          ENC.for(
            S.union(
              M.match_(registry[t._tag].ErrorSchema, () => S.unknown, identity),
              ActorSystemException
            )
          )
        )
      ),
      T.mapError((e) => new CommandParserException({ exception: e }))
    )
}
