import type { TimestampProvider } from './timestampProvider'

interface PerformanceTimestampProvider extends TimestampProvider {
  delegate: TimestampProvider | undefined
}

export const performanceTimestampProvider: PerformanceTimestampProvider = {
  now() {
    return (performanceTimestampProvider.delegate || performance).now()
  },
  delegate: undefined
}
