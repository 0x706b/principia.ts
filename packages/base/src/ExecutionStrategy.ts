export interface Sequential {
  readonly _tag: 'Sequential'
}

export interface Concurrent {
  readonly _tag: 'Concurrent'
}

export interface ConcurrentBounded {
  readonly _tag: 'ConcurrentBounded'
  readonly fiberBound: number
}

export const sequential: Sequential = {
  _tag: 'Sequential'
}

export const concurrent: Concurrent = {
  _tag: 'Concurrent'
}

export function concurrentBounded(fiberBound: number): ConcurrentBounded {
  return {
    _tag: 'ConcurrentBounded',
    fiberBound
  }
}

export type ExecutionStrategy = Sequential | Concurrent | ConcurrentBounded

export function match_<A, B, C>(
  strategy: ExecutionStrategy,
  sequential: () => A,
  concurrent: () => B,
  concurrentBounded: (fiberBound: number) => C
): A | B | C {
  switch (strategy._tag) {
    case 'Sequential': {
      return sequential()
    }
    case 'Concurrent': {
      return concurrent()
    }
    case 'ConcurrentBounded': {
      return concurrentBounded(strategy.fiberBound)
    }
  }
}

export function match<A, B, C>(
  sequential: () => A,
  concurrent: () => B,
  concurrentBounded: (fiberBound: number) => C
): (strategy: ExecutionStrategy) => A | B | C {
  return (strategy) => match_(strategy, sequential, concurrent, concurrentBounded)
}
