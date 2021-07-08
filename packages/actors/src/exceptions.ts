import * as S from '@principia/schema'

export class ActorAlreadyExistsException extends S.Model<ActorAlreadyExistsException>()(
  S.properties({
    _tag: S.prop(S.tag('ActorAlreadyExistsException')),
    actorName: S.prop(S.string)
  })
) {}

export class NoSuchActorException extends S.Model<NoSuchActorException>()(
  S.properties({
    _tag: S.prop(S.tag('NoSuchActorException')),
    path: S.prop(S.string)
  })
) {}

export class NoRemoteSupportException extends S.Model<NoRemoteSupportException>()(
  S.properties({
    _tag: S.prop(S.tag('NoRemoteSupportException'))
  })
) {}

export class InvalidActorNameException extends S.Model<InvalidActorNameException>()(
  S.properties({
    _tag: S.prop(S.tag('InvalidActorNameException')),
    name: S.prop(S.string)
  })
) {}

export class InvalidActorPathException extends S.Model<InvalidActorPathException>()(
  S.properties({
    _tag: S.prop(S.tag('InvalidActorPathException')),
    path: S.prop(S.string)
  })
) {}

export class ErrorMakingActorException extends S.Model<ErrorMakingActorException>()(
  S.properties({
    _tag: S.prop(S.tag('ErrorMakingActorException')),
    exception: S.prop(S.unknown)
  })
) {}

export class CommandParserException extends S.Model<CommandParserException>()(
  S.properties({
    _tag: S.prop(S.tag('CommandParserException')),
    exception: S.prop(S.unknown)
  })
) {}

export class PostOperationException extends S.Model<PostOperationException>()(
  S.properties({
    _tag: S.prop(S.tag('PostOperationException')),
    exception: S.prop(S.unknown)
  })
) {}

export class TimeoutException extends S.Model<TimeoutException>()(
  S.properties({
    _tag: S.prop(S.tag('TimeoutException'))
  })
) {}

export const ActorSystemException = S.taggedUnion({
  ActorAlreadyExistsException,
  NoSuchActorException,
  NoRemoteSupportException,
  InvalidActorNameException,
  InvalidActorPathException,
  ErrorMakingActorException,
  CommandParserException,
  PostOperationException,
  TimeoutException
})
export type ActorSystemException = S.TypeOf<typeof ActorSystemException>
