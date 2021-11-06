import { withSystem } from '@principia/actors/ActorRef'
import { ActorSystem, ActorSystemTag, RemoteConfig } from '@principia/actors/ActorSystem'
import { Tagged } from '@principia/base/Case'
import * as Chunk from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Ma from '@principia/base/Managed'
import * as M from '@principia/base/Maybe'
import * as Ex from '@principia/express'
import * as S from '@principia/schema'
import * as Parser from '@principia/schema/Decoder'
import * as Encoder from '@principia/schema/Encoder'
import * as exp from 'express'

export const CallPayload = S.properties({
  _tag: S.prop(S.string),
  op: S.prop(S.literal('Ask', 'Tell', 'Stop')).opt(),
  path: S.prop(S.string),
  request: S.prop(S.unknown).opt()
})

export const decodePayload = Parser.for(CallPayload)['|>'](S.condemnException)
export const encodePayload = Encoder.for(CallPayload)

export class ActorError extends Tagged('ActorError')<{
  readonly message: string
}> {}

export const RemotingExpressConfigSym = Symbol()

export interface RemotingExpressConfig {
  [RemotingExpressConfigSym]: typeof RemotingExpressConfigSym
  host: string
  port: number
  bindAddr?: string | undefined
}

export const makeRemotingExpressConfig = (_: {
  host: string
  port: number
  bindAddr?: string
}): RemotingExpressConfig => ({
  [RemotingExpressConfigSym]: RemotingExpressConfigSym,
  host: _.host,
  port: _.port,
  bindAddr: _.bindAddr
})

export const RemotingExpressConfig = tag<RemotingExpressConfig>()

export function StaticRemotingExpressConfig(_: { host: string, port: number, bindAddr?: string }) {
  return L.fromIO(RemotingExpressConfig)(T.succeed(makeRemotingExpressConfig(_)))
}

export const RemotingExpress = L.fresh(
  Ex.LiveExpressApp['<+<'](
    L.fromIO(Ex.ExpressAppConfig)(
      T.asksService(RemotingExpressConfig)(({ bindAddr, port }) => ({
        _tag: Ex.ExpressAppConfigTag,
        exitHandler: Ex.defaultExitHandler,
        host: bindAddr ?? '0.0.0.0',
        port
      }))
    )
  )
)['>>>'](
  L.fresh(
    L.fromRawManaged(
      Ma.gen(function* (_) {
        const { host, port } = yield* _(RemotingExpressConfig)
        const system         = yield* _(ActorSystemTag)

        yield* _(
          Ex.post('/cmd', Ex.classic(exp.json()), (req, res) =>
            pipe(
              T.gen(function* (_) {
                const payload = yield* _(decodePayload(req.body))
                const actor   = yield* _(system.local(payload.path))

                switch (payload.op) {
                  case 'Ask': {
                    const msgArgs = yield* _(
                      S.condemnException((u) =>
                        withSystem(system)(() => Parser.for(actor.messages[payload._tag].RequestSchema)(u))
                      )(payload.request)
                    )

                    const msg = new actor.messages[payload._tag](msgArgs)

                    const resp = yield* _(
                      actor.ask(msg)['|>'](
                        T.mapError(
                          (s) =>
                            new ActorError({
                              message: `actor error: ${JSON.stringify(s)}`
                            })
                        )
                      )
                    )

                    res.send(
                      JSON.stringify({
                        response: Encoder.for(actor.messages[payload._tag].ResponseSchema)(resp)
                      })
                    )

                    break
                  }
                  case 'Tell': {
                    const msgArgs = yield* _(
                      S.condemnException((u) =>
                        withSystem(system)(() => Parser.for(actor.messages[payload._tag].RequestSchema)(u))
                      )(payload.request)
                    )

                    const msg = new actor.messages[payload._tag](msgArgs)

                    yield* _(
                      actor.tell(msg)['|>'](
                        T.mapError(
                          (s) =>
                            new ActorError({
                              message: `actor error: ${JSON.stringify(s)}`
                            })
                        )
                      )
                    )

                    res.send(JSON.stringify({ tell: true }))

                    break
                  }
                  case 'Stop': {
                    const stops = yield* _(
                      actor.stop['|>'](
                        T.mapError(
                          (s) =>
                            new ActorError({
                              message: `actor error: ${JSON.stringify(s)}`
                            })
                        )
                      )
                    )

                    res.send(JSON.stringify({ stops: Chunk.toArray(stops) }))

                    break
                  }
                }
              }),
              T.catchTag('CondemnException', (s) =>
                T.succeedLazy(() => {
                  res.status(500).send({ message: s.message })
                })
              ),
              T.catchTag('NoSuchActorException', () =>
                T.succeedLazy(() => {
                  res.status(500).send({ message: 'actor not found' })
                })
              ),
              T.catchTag('InvalidActorPathException', () =>
                T.succeedLazy(() => {
                  res.status(500).send({ message: 'malformed actor path' })
                })
              ),
              T.catchTag('ActorError', (s) =>
                T.succeedLazy(() => {
                  res.status(500).send({ message: s.message })
                })
              )
            )
          )
        )

        return ActorSystemTag.of(
          new ActorSystem(
            system.actorSystemName,
            M.just(new RemoteConfig({ host, port })),
            system.refActorMap,
            system.parentActor
          )
        )
      })
    )
  )
)
