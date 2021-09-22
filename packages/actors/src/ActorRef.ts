import type * as A from './Actor'
import type { ActorSystemException } from './exceptions'
import type { IOEnv } from '@principia/base/IO/IOEnv'

import '@principia/base/Operators'

import * as Chunk from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as RT from '@principia/base/RoseTree'
import * as Th from '@principia/base/These'
import * as S from '@principia/schema'
import * as Parser from '@principia/schema/Decoder'
import * as Encoder from '@principia/schema/Encoder'
import * as G from '@principia/schema/Guard'
import * as PE from '@principia/schema/ParseError'
import fetch from 'isomorphic-fetch'

import { ActorSystem, resolvePath } from './ActorSystem'
import * as Envelope from './Envelope'
import { PostOperationException, TimeoutException } from './exceptions'
import * as AM from './Message'

export class ActorRefParserE
  extends PE.DefaultLeafE<{
    readonly actual: unknown
    readonly message: string
  }>
  implements PE.ActualE<unknown> {
  readonly _tag = 'ExtractKey'

  get [PE.$toTree]() {
    return RT.roseTree(`cannot parse ActorRef from ${JSON.stringify(this.actual)} (${this.message})`)
  }
}

let globSys: any = undefined

export function withSystem(s: ActorSystem) {
  return <A>(f: () => A): A => {
    const a = globSys
    globSys = s
    const r = f()
    globSys = a
    return r
  }
}

export function actorRef<F1 extends AM.AnyMessage>() {
  return pipe(
    S.identity<ActorRef<F1>>()({
      [G.GuardSURI]: G.Guard((_): _ is ActorRef<F1> => _ instanceof ActorRefLocal || _ instanceof ActorRefRemote)
    }),
    S.encode((s) => s.path),
    S.decode((u): Th.These<PE.LeafE<ActorRefParserE>, ActorRef<F1>> => {
      if (globSys instanceof ActorSystem) {
        const s = Parser.for(S.string)(u)
        if (s._tag === 'Right' || s._tag === 'Both') {
          return Th.right(new ActorRefRemote(s.right, globSys))
        }
        return Th.left(PE.leafE(new ActorRefParserE({ actual: u, message: 'malformed' })))
      } else {
        return Th.left(PE.leafE(new ActorRefParserE({ actual: u, message: 'system not available' })))
      }
    })
  )
}

export interface ActorRef<F1 extends AM.AnyMessage> {
  readonly _F1: F1

  /**
   * Send a message to an actor as `ask` interaction pattern -
   * caller is blocked until the response is received
   *
   * @param fa message
   * @tparam A return type
   * @return effectful response
   */
  ask<A extends F1>(msg: A): T.IO<IOEnv, AM.ErrorOf<A> | ActorSystemException, AM.ResponseOf<A>>

  /**
   * Send message to an actor as `fire-and-forget` -
   * caller is blocked until message is enqueued in stub's mailbox
   *
   * @param fa message
   * @return lifted unit
   */
  tell(msg: F1): T.IO<IOEnv, ActorSystemException, void>

  /**
   * Get referential absolute actor path
   * @return
   */
  readonly path: T.IO<IOEnv, never, string>

  /**
   * Stops actor and all its children
   */
  readonly stop: T.IO<IOEnv, ActorSystemException, Chunk.Chunk<void>>
}

export class ActorRefLocal<F1 extends AM.AnyMessage> implements ActorRef<F1> {
  readonly _F1!: F1

  constructor(private readonly address: string, private readonly actor: A.Actor<F1>) {}

  ask<A extends F1>(msg: A) {
    return this.actor.ask(msg)
  }
  tell(msg: F1) {
    return this.actor.tell(msg)
  }

  readonly stop = this.actor.stop
  readonly path = T.succeed(this.address)
}

export class ActorRefRemote<F1 extends AM.AnyMessage> implements ActorRef<F1> {
  readonly _F1!: F1

  constructor(private readonly address: string, private readonly system: ActorSystem) {}

  private runEnvelope(envelope: Envelope.Envelope) {
    const envOp   = envelope.command
    const system  = this.system
    const address = this.address
    return T.gen(function* (_) {
      const [, host, port] = yield* _(resolvePath(address))

      // TODO: PROPER CLIENT
      const response = yield* _(
        T.fromPromiseCatch<PostOperationException, any>(
          () =>
            fetch(`http://${host}:${port}/cmd`, {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                _tag: envOp._tag === 'Ask' || envOp._tag === 'Tell' ? envOp.msg['_tag'] : undefined,
                op: envOp._tag,
                path: envelope.recipient,
                request:
                  envOp._tag === 'Ask' || envOp._tag === 'Tell'
                    ? Encoder.for(envOp.msg[AM.RequestSchemaSymbol])(envOp.msg)
                    : undefined
              })
            }).then((r) => r.json()),
          (e) => new PostOperationException({ exception: e })
        )
          ['|>'](T.timeout(15_000))
          ['|>'](T.chain(T.getOrFailWith(() => new TimeoutException({}))))
      )

      return envOp._tag === 'Ask'
        ? yield* _(
            S.condemnHalt((u) =>
              withSystem(system)(() => Parser.for((envOp.msg as AM.AnyMessage)[AM.ResponseSchemaSymbol])(u))
            )(response.response)
          )
        : envOp._tag === 'Stop'
        ? Chunk.from(response.stops)
        : yield* _(T.unit())
    })
  }

  ask<A extends F1>(msg: A): T.IO<IOEnv, AM.ErrorOf<A> | ActorSystemException, AM.ResponseOf<A>>
  ask<A extends F1>(msg: A) {
    return this.runEnvelope({
      command: Envelope.ask(msg),
      recipient: this.address
    })
  }

  tell(msg: F1): T.IO<IOEnv, ActorSystemException, void>
  tell(msg: F1) {
    return this.runEnvelope({
      command: Envelope.tell(msg),
      recipient: this.address
    })
  }

  readonly stop: T.IO<IOEnv, ActorSystemException, Chunk.Chunk<void>> = this.runEnvelope({
    command: Envelope.stop(),
    recipient: this.address
  })

  readonly path: T.UIO<string> = T.succeed(this.address)
}
