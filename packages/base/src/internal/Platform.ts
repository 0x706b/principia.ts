import type { FiberId } from '../Fiber'
import type { Cause, Renderer } from '../IO/Cause'
import type { Supervisor } from '../Supervisor'

export class Platform<A> {
  public executionTraceLength: number
  public stackTraceLength: number
  public traceExecution: boolean
  public traceStack: boolean
  public traceEffects: boolean
  public initialTracingStatus: boolean
  public ancestorExecutionTraceLength: number
  public ancestorStackTraceLength: number
  public ancestryLength: number
  public renderer: Renderer<FiberId>
  public reportFailure: (e: Cause<unknown>) => void
  public maxYieldOp: number
  public supervisor: Supervisor<A>
  constructor(value: {
    executionTraceLength: number
    stackTraceLength: number
    traceExecution: boolean
    traceStack: boolean
    traceEffects: boolean
    initialTracingStatus: boolean
    ancestorExecutionTraceLength: number
    ancestorStackTraceLength: number
    ancestryLength: number
    renderer: Renderer<FiberId>
    reportFailure: (e: Cause<unknown>) => void
    maxYieldOp: number
    supervisor: Supervisor<A>
  }) {
    this.executionTraceLength         = value.executionTraceLength
    this.stackTraceLength             = value.stackTraceLength
    this.traceExecution               = value.traceExecution
    this.traceStack                   = value.traceStack
    this.traceEffects                 = value.traceEffects
    this.initialTracingStatus         = value.initialTracingStatus
    this.ancestorExecutionTraceLength = value.ancestorExecutionTraceLength
    this.ancestorStackTraceLength     = value.ancestorStackTraceLength
    this.ancestryLength               = value.ancestryLength
    this.renderer                     = value.renderer
    this.reportFailure                = value.reportFailure
    this.maxYieldOp                   = value.maxYieldOp
    this.supervisor                   = value.supervisor
  }
}
