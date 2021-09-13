import { isTracingEnabled } from './global'

export const tracingSymbol = '$trace'

let currentTraceCall: string | undefined

/**
 * @untrace traceCall
 */
export function traceCall<F extends Function>(f: F, trace: string | undefined): F {
  if (!isTracingEnabled() || !trace) {
    return f
  }
  // @ts-expect-error
  return (...args: any[]) => {
    currentTraceCall = trace
    const res        = f(...args)
    currentTraceCall = undefined
    return res
  }
}

/**
 * @untrace accessCallTrace
 */
export function accessCallTrace(): string | undefined {
  if (!isTracingEnabled() || !currentTraceCall) {
    return undefined
  }
  const callTrace: any = currentTraceCall
  currentTraceCall     = undefined
  return callTrace
}

/**
 * @untrace traceFrom
 */
export function traceFrom<F extends Function>(g: string | undefined, f: F): F {
  if (!f[tracingSymbol]) {
    if (g && isTracingEnabled()) {
      const h          = (...args: any[]) => f(...args)
      h[tracingSymbol] = g
      return h as any
    }
  }
  return f
}

/**
 * @untrace traceAs
 */
export function traceAs<F extends Function>(g: any, f: F): F {
  if (g && g[tracingSymbol] && isTracingEnabled()) {
    const h          = (...args: any[]) => f(...args)
    h[tracingSymbol] = g[tracingSymbol]
    return h as any
  }
  return f
}


export * from './global'
