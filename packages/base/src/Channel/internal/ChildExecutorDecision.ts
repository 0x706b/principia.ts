export interface Continue {
  readonly _tag: 'Continue'
}

export const Continue: ChildExecutorDecision = {
  _tag: 'Continue'
}

export interface Close {
  readonly _tag: 'Close'
  readonly value: any
}

export function Close(value: any): ChildExecutorDecision {
  return {
    _tag: 'Close',
    value
  }
}

export interface Yield {
  readonly _tag: 'Yield'
}

export const Yield: ChildExecutorDecision = {
  _tag: 'Yield'
}

export type ChildExecutorDecision = Continue | Close | Yield

export function match_<A, B, C>(
  d: ChildExecutorDecision,
  onContinue: () => A,
  onClose: (value: any) => B,
  onYield: () => C
): A | B | C {
  switch (d._tag) {
    case 'Continue': {
      return onContinue()
    }
    case 'Close': {
      return onClose(d.value)
    }
    case 'Yield': {
      return onYield()
    }
  }
}

export function match<A, B, C>(
  onContinue: () => A,
  onClose: (value: any) => B,
  onYield: () => C
): (d: ChildExecutorDecision) => A | B | C {
  return (d) => match_(d, onContinue, onClose, onYield)
}
