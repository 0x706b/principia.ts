import type { Cause, Renderer } from '../../IO/Cause'
import type { Supervisor } from '../../Supervisor'
import type { FiberId } from '../FiberId'
import type { RuntimeConfigFlags } from './RuntimeConfigFlags'

import { CaseClass } from '../../Case'

export class RuntimeConfig extends CaseClass<{
  readonly reportFailure: (e: Cause<unknown>) => void
  readonly supervisor: Supervisor<any>
  readonly flags: RuntimeConfigFlags
  readonly executionTraceLength: number
  readonly stackTraceLength: number
  readonly traceExecution: boolean
  readonly traceStack: boolean
  readonly traceEffects: boolean
  readonly initialTracingStatus: boolean
  readonly ancestorExecutionTraceLength: number
  readonly ancestorStackTraceLength: number
  readonly ancestryLength: number
  readonly renderer: Renderer<FiberId>
  readonly yieldOpCount: number
}> {}
