type SetIntervalFunction = (handler: () => void, timeout?: number, ...args: any[]) => number
type ClearIntervalFunction = (handle: number) => void

interface IntervalProvider {
  setInterval: SetIntervalFunction
  clearInterval: ClearIntervalFunction
  delegate:
    | {
        setInterval: SetIntervalFunction
        clearInterval: ClearIntervalFunction
      }
    | undefined
}

export const intervalProvider: IntervalProvider = {
  // When accessing the delegate, use the variable rather than `this` so that
  // the functions can be called without being bound to the provider.
  // @ts-expect-error
  setInterval(...args) {
    const { delegate } = intervalProvider
    return (delegate?.setInterval || setInterval)(...args)
  },
  clearInterval(handle) {
    const { delegate } = intervalProvider
    // @ts-expect-error
    return (delegate?.clearInterval || clearInterval)(handle)
  },
  delegate: undefined
}
