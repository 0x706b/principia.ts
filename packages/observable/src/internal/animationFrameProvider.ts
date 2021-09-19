import { Subscription } from '../Subscription'

interface AnimationFrameProvider {
  schedule(callback: FrameRequestCallback): Subscription
  requestAnimationFrame: typeof requestAnimationFrame
  cancelAnimationFrame: typeof cancelAnimationFrame
  delegate:
    | {
        requestAnimationFrame: typeof requestAnimationFrame
        cancelAnimationFrame: typeof cancelAnimationFrame
      }
    | undefined
}

export const animationFrameProvider: AnimationFrameProvider = {
  schedule(callback) {
    let request = requestAnimationFrame
    let cancel: typeof this.cancelAnimationFrame | undefined = cancelAnimationFrame
    const { delegate } = animationFrameProvider
    if (delegate) {
      request = delegate.requestAnimationFrame
      cancel  = delegate.cancelAnimationFrame
    }
    const handle = request((timestamp) => {
      cancel = undefined
      callback(timestamp)
    })
    return new Subscription(() => cancel?.(handle))
  },
  requestAnimationFrame(...args) {
    const { delegate } = animationFrameProvider
    return (delegate?.requestAnimationFrame || requestAnimationFrame)(...args)
  },
  cancelAnimationFrame(...args) {
    const { delegate } = animationFrameProvider
    return (delegate?.cancelAnimationFrame || cancelAnimationFrame)(...args)
  },
  delegate: undefined
}
