import type { TimestampProvider } from '../../internal/timestampProvider'

import { animationFrameProvider } from '../../internal/animationFrameProvider'
import { performanceTimestampProvider } from '../../internal/performanceTimestampProvider'
import { Subscription } from '../../Subscription'
import { Observable } from '../core'

export function animationFrames(
  timestampProvider?: TimestampProvider
): Observable<never, { timestamp: number, elapsed: number }> {
  return timestampProvider ? animationFramesInternal(timestampProvider) : DEFAULT_ANIMATION_FRAMES
}

function animationFramesInternal(
  timestampProvider?: TimestampProvider
): Observable<never, { timestamp: number, elapsed: number }> {
  const { schedule } = animationFrameProvider
  return new Observable((subscriber) => {
    const subscription = new Subscription()
    const provider     = timestampProvider || performanceTimestampProvider
    const start        = provider.now()
    const run          = (timestamp: DOMHighResTimeStamp | number) => {
      const now = provider.now()
      subscriber.next({
        timestamp: timestampProvider ? now : timestamp,
        elapsed: now - start
      })
      if (!subscriber.closed) {
        subscription.add(schedule(run))
      }
    }
    subscription.add(schedule(run))
    return subscription
  })
}

const DEFAULT_ANIMATION_FRAMES = animationFramesInternal()
