export const RuntimeConfigFlag = {
  EnableCurrentFiber: Symbol.for('@principia/base/Fiber/RuntimeConfigFlag/EnableCurrentFiber'),
  LogRuntime: Symbol.for('@principia/base/Fiber/RuntimeConfigFlag/LogRuntime'),
  SuperviseOperations: Symbol.for('@principia/base/Fiber/RuntimeConfigFlag/SuperviseOperations'),
  TrackRuntimeMetrics: Symbol.for('@principia/base/Fiber/RuntimeConfigFlag/TrackRuntimeMetrics'),
  EnableFiberRoots: Symbol.for('@principia/base/Fiber/RuntimeConfigFlag/EnableFiberRoots')
} as const

export type RuntimeConfigFlag = typeof RuntimeConfigFlag[keyof typeof RuntimeConfigFlag]
