export const SinkEndReasonTypeId = Symbol.for('@principia/base/IO/Stream/SinkEndReason')

export const SinkEndTypeId = Symbol.for('@principia/base/IO/Stream/SinkEndReason/SinkEnd')
export class SinkEnd {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof SinkEndTypeId                    = SinkEndTypeId
}

export const ScheduleTimeoutTypeId = Symbol.for('@principia/base/IO/Stream/SinkEndReason/ScheduleTimeout')
export class ScheduleTimeout {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof ScheduleTimeoutTypeId            = ScheduleTimeoutTypeId
}

export const ScheduleEndTypeId = Symbol.for('@principia/base/IO/Stream/SinkEndReason/ScheduleEnd')
export class ScheduleEnd<C> {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof ScheduleEndTypeId                = ScheduleEndTypeId

  constructor(readonly c: C) {}
}

export const UpstreamEndTypeId = Symbol.for('@principia/base/IO/Stream/SinkEndReason/UpstreamEnd')
export class UpstreamEnd {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof UpstreamEndTypeId                = UpstreamEndTypeId
}

export type SinkEndReason<C> = SinkEnd | ScheduleTimeout | ScheduleEnd<C> | UpstreamEnd
