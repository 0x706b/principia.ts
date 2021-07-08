export interface Sequential {
  readonly _tag: 'Sequential'
}

export interface Parallel {
  readonly _tag: 'Parallel'
}

export interface ParallelN {
  readonly _tag: 'ParallelN'
  readonly n: number
}

export const sequential: Sequential = {
  _tag: 'Sequential'
}

export const parallel: Parallel = {
  _tag: 'Parallel'
}

export function parallelN(n: number): ParallelN {
  return {
    _tag: 'ParallelN',
    n
  }
}

export type ExecutionStrategy = Sequential | Parallel | ParallelN
