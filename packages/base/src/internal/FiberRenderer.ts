import type { Chunk } from '../Chunk/core'
import type { FiberStatus, RuntimeFiber } from '../Fiber/core'
import type { UIO } from '../IO/core'

import { FiberDump, fiberName } from '../Fiber/core'
import { constant } from '../function'
import { crossPar_ } from '../IO/combinators/apply-par'
import * as T from '../IO/core'
import * as IT from '../Iterable'
import * as O from '../Option'
import { tuple } from '../tuple'
import { parseMs } from '../util/parse-ms'

export function dump<E, A>(fiber: RuntimeFiber<E, A>): T.UIO<FiberDump> {
  return T.map_(crossPar_(fiber.getRef(fiberName), fiber.status), ([name, status]) => FiberDump(fiber.id, name, status))
}

export function dumpFibers(fibers: Iterable<RuntimeFiber<any, any>>): UIO<Chunk<FiberDump>> {
  return T.foreach_(fibers, dump)
}

export function dumpStr(fibers: Iterable<RuntimeFiber<any, any>>, withTrace: false): UIO<string> {
  const du  = T.foreach_(fibers, dump)
  const now = T.succeedLazy(() => new Date().getTime())
  return T.map_(T.crossWith_(du, now, tuple), ([dumps, now]) => {
    const tree        = renderHierarchy(dumps)
    const dumpStrings = withTrace ? collectTraces(dumps, now) : []
    return IT.foldl_(dumpStrings, tree, (acc, v) => acc + '\n' + v)
  })
}

export function prettyPrintM(dump: FiberDump): UIO<string> {
  return T.succeed(prettyPrint(dump, new Date().getTime()))
}

/**
 * @internal
 */
export function prettyPrint(dump: FiberDump, now: number): string {
  const { days, hours, milliseconds, minutes, seconds } = parseMs(now - dump.fiberId.startTime)

  const name    = O.match_(dump.fiberName, constant(''), (n) => `"${n}" `)
  const lifeMsg =
    (days === 0 ? '' : `${days}d`) +
    (days === 0 && hours === 0 ? '' : `${hours}h`) +
    (days === 0 && hours === 0 && minutes === 0 ? '' : `${minutes}m`) +
    (days === 0 && hours === 0 && minutes === 0 && seconds === 0 ? '' : `${seconds}s`) +
    `${milliseconds}ms`
  const waitMsg = (function (status: FiberStatus) {
    switch (status._tag) {
      case 'Suspended':
        return status.blockingOn.length > 0
          ? 'waiting on ' + status.blockingOn.map((id) => `${id.seqNumber}`).join(', ')
          : ''
      default:
        return ''
    }
  })(dump.status)
  const statMsg = renderStatus(dump.status)

  return [`${name}#${dump.fiberId.seqNumber} (${lifeMsg}) ${waitMsg}`, `   Status: ${statMsg}`].join('\n')
}

/**
 * @internal
 */
export function renderOne(tree: FiberDump): string {
  const prefix = ''

  const name      = O.match_(tree.fiberName, constant(''), (n) => '"' + n + '" ')
  const statusMsg = renderStatus(tree.status)
  return `${prefix}+---${name}#${tree.fiberId.seqNumber} Status: ${statusMsg}\n`
}

/**
 * @internal
 */
export function renderStatus(status: FiberStatus): string {
  switch (status._tag) {
    case 'Done':
      return 'Done'
    case 'Finishing':
      return `Finishing(${status.interrupting ? 'interrupting' : ''})`
    case 'Running':
      return `Running(${status.interrupting ? 'interrupting' : ''})`
    case 'Suspended': {
      const inter = status.interruptible ? 'interruptible' : 'uninterruptible'
      const ep    = `${status.epoch} asyncs`
      return `Suspended(${inter}, ${ep})`
    }
  }
}

/**
 * @internal
 */
export function renderHierarchy(trees: Iterable<FiberDump>): string {
  return IT.foldl_(IT.map_(trees, renderOne), '', (acc, str) => acc + str)
}

export function collectTraces(dumps: Iterable<FiberDump>, now: number): Iterable<string> {
  return IT.map_(dumps, (d) => prettyPrint(d, now))
}
