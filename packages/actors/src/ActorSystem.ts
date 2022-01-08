import type * as A from './Actor'
import type { ActorSystemException } from './exceptions'
import type * as Msg from './Message'
import type * as Su from './Supervisor'
import type { IOEnv } from '@principia/base/IOEnv'

import { Tagged } from '@principia/base/Case'
import * as HM from '@principia/base/collection/immutable/HashMap'
import * as HS from '@principia/base/collection/immutable/HashSet'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import * as St from '@principia/base/Structural'

import * as AR from './ActorRef'
import {
  ActorAlreadyExistsException,
  ErrorMakingActorException,
  InvalidActorNameException,
  InvalidActorPathException,
  NoSuchActorException
} from './exceptions'

/**
 * Context for actor used inside Stateful which provides self actor reference and actor creation/selection API
 */
export class Context<FC extends Msg.AnyMessage> {
  constructor(
    readonly address: string,
    readonly actorSystem: ActorSystem,
    readonly childrenRef: Ref.URef<HS.HashSet<AR.ActorRef<any>>>
  ) {}

  /**
   * Accessor for self actor reference
   */
  self = this.actorSystem.select<FC>(this.address)

  /**
   * Creates actor and registers it to dependent actor system
   */
  make<R, S, F1 extends Msg.AnyMessage>(
    actorName: string,
    sup: Su.Supervisor<R, ActorSystemException | Msg.ErrorOf<F1>>,
    stateful: A.AbstractStateful<R, S, F1>,
    init: S
  ): I.IO<
    R & IOEnv,
    ActorAlreadyExistsException | InvalidActorNameException | ErrorMakingActorException,
    AR.ActorRef<F1>
  > {
    const self = this
    return I.gen(function* (_) {
      const actorRef = yield* _(self.actorSystem.make(actorName, sup, stateful, init))
      const children = yield* _(Ref.get(self.childrenRef))
      yield* _(Ref.set_(self.childrenRef, HS.add_(children, actorRef)))
      return actorRef
    })
  }

  /**
   * Looks up for actor on local actor system, and in case of its absence - delegates it to remote internal module.
   * If remote configuration was not provided for ActorSystem (so the remoting is disabled) the search will
   * fail with ActorNotFoundException.
   * Otherwise it will always create remote actor stub internally and return ActorRef as if it was found.
   */
  select<F1 extends Msg.AnyMessage>(address: string) {
    return this.actorSystem.select<F1>(address)
  }
}

export class RemoteConfig extends Tagged('RemoteConfig')<{
  host: string
  port: number
}> {}

export class ActorSystem {
  constructor(
    readonly actorSystemName: string,
    readonly remoteConfig: M.Maybe<RemoteConfig>,
    readonly refActorMap: Ref.URef<HM.HashMap<string, A.Actor<any>>>,
    readonly parentActor: M.Maybe<string>
  ) {}

  /**
   * Creates actor and registers it to dependent actor system
   */
  make<R, S, F1 extends Msg.AnyMessage>(
    actorName: string,
    sup: Su.Supervisor<R, ActorSystemException | Msg.ErrorOf<F1>>,
    stateful: A.AbstractStateful<R, S, F1>,
    init: S
  ): I.IO<
    R & IOEnv,
    ActorAlreadyExistsException | InvalidActorNameException | ErrorMakingActorException,
    AR.ActorRef<F1>
  > {
    const self = this
    return I.gen(function* (_) {
      const map       = yield* _(Ref.get(self.refActorMap))
      const finalName = yield* _(
        buildFinalName(
          M.getOrElse_(self.parentActor, () => ''),
          actorName
        )
      )
      yield* _(
        M.match_(
          HM.get_(map, finalName),
          () => I.unit(),
          () => I.fail(new ActorAlreadyExistsException({ actorName }))
        )
      )
      const path          = buildPath(self.actorSystemName, finalName, self.remoteConfig)
      const derivedSystem = new ActorSystem(
        self.actorSystemName,
        self.remoteConfig,
        self.refActorMap,
        M.just(finalName)
      )
      const childrenSet = yield* _(Ref.make(HS.makeDefault<AR.ActorRef<any>>()))
      const actor       = yield* _(
        pipe(
          stateful.makeActor(sup, new Context(path, derivedSystem, childrenSet), () =>
            self.dropFromActorMap(path, childrenSet)
          )(init),
          I.catchAll((e) => I.fail(new ErrorMakingActorException({ exception: e })))
        )
      )
      yield* _(Ref.set_(self.refActorMap, HM.set_(map, finalName, actor)))
      return new AR.ActorRefLocal(path, actor)
    })
  }

  dropFromActorMap(path: string, childrenRef: Ref.URef<HS.HashSet<AR.ActorRef<any>>>) {
    const self = this
    return I.gen(function* (_) {
      const [, , , actorName] = yield* _(resolvePath(path))
      yield* _(Ref.update_(self.refActorMap, HM.remove(actorName)))
      const children = yield* _(Ref.get(childrenRef))
      yield* _(I.foreach_(children, (r) => r.stop))
      yield* _(Ref.set_(childrenRef, HS.makeDefault()))
    })
  }

  /**
   * Looks up for actor on local actor system, and in case of its absence - delegates it to remote internal module.
   * If remote configuration was not provided for ActorSystem (so the remoting is disabled) the search will
   * fail with ActorNotFoundException.
   * Otherwise it will always create remote actor stub internally and return ActorRef as if it was found.
   */
  select<F1 extends Msg.AnyMessage>(
    address: string
  ): I.IO<unknown, NoSuchActorException | InvalidActorPathException, AR.ActorRef<F1>> {
    const self = this
    return I.gen(function* (_) {
      const [, addr, port, actorName] = yield* _(resolvePath(address))

      const rc       = `${addr}:${port}` === '0.0.0.0:0000' ? M.nothing() : M.just(new RemoteConfig({ host: addr, port }))
      const actorMap = yield* _(Ref.get(self.refActorMap))
      const actorRef = HM.get_(actorMap, actorName)
      return yield* _(
        M.match_(
          actorRef,
          () =>
            St.equals(rc, self.remoteConfig)
              ? I.fail(new NoSuchActorException({ path: address }))
              : I.succeed(new AR.ActorRefRemote(address, self) as AR.ActorRef<F1>),
          (actor) => I.succeed(new AR.ActorRefLocal(address, actor))
        )
      )
    })
  }

  local<F1 extends Msg.AnyMessage>(
    address: string
  ): I.IO<unknown, InvalidActorPathException | NoSuchActorException, A.Actor<F1>> {
    const self = this
    return I.gen(function* (_) {
      const [, , , actorName] = yield* _(resolvePath(address))
      const actorMap          = yield* _(Ref.get(self.refActorMap))
      return yield* _(HM.get_(actorMap, actorName), () => new NoSuchActorException({ path: address }))
    })
  }
}

function buildFinalName(parentActorName: string, actorName: string): I.FIO<InvalidActorNameException, string> {
  return actorName.length === 0
    ? I.fail(new InvalidActorNameException({ name: actorName }))
    : I.succeed(parentActorName + '/' + actorName)
}

function buildPath(actorSystemName: string, actorPath: string, remoteConfig: M.Maybe<RemoteConfig>): string {
  return `zio://${actorSystemName}@${pipe(
    remoteConfig,
    M.map(({ host, port }) => `${host}:${port}`),
    M.getOrElse(() => '0.0.0.0:0000')
  )}${actorPath}`
}

const regexFullPath = /^(?:zio:\/\/)(\w+)[@](\d+\.\d+\.\d+\.\d+)[:](\d+)[/]([\w+|\d+|\-_.*$+:@&=,!~';.|/]+)$/i

export function resolvePath(
  path: string
): I.IO<unknown, InvalidActorPathException, readonly [sysName: string, host: string, port: number, actor: string]> {
  const match = path.match(regexFullPath)
  if (match) {
    return I.succeed([match[1], match[2], parseInt(match[3], 10), '/' + match[4]])
  }
  return I.fail(new InvalidActorPathException({ path }))
}

export function make(sysName: string, remoteConfig: M.Maybe<RemoteConfig> = M.nothing()) {
  return I.gen(function* (_) {
    const initActorRefMap = yield* _(Ref.make(HM.makeDefault<string, A.Actor<any>>()))
    return new ActorSystem(sysName, remoteConfig, initActorRefMap, M.nothing())
  })
}

export const ActorSystemTag = tag<ActorSystem>()

export const LiveActorSystem = (sysName: string) => L.fromIO(ActorSystemTag)(make(sysName, M.nothing()))
