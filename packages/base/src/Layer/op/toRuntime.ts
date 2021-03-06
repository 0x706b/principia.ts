import type { Layer } from '../core'

import { Runtime } from '../../IO/runtime'
import { build } from '../core'
import * as I from '../internal/io'
import * as M from '../internal/managed'


/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, Runtime<A>> {
  return M.chain_(build(_), (a) => M.fromIO(I.runtimeConfig((p) => I.succeedLazy(() => new Runtime(a, p)))))
}
