export interface ExecutionMetrics {
  readonly concurrency: number
  readonly capacity: number
  readonly size: number
  readonly enqueuedCount: number
  readonly dequeuedCount: number
  readonly workersCount: number
}
