import * as S from '@principia/base/Show'

export interface GenFailureDetails {
  readonly initialInput: any
  readonly shrunkenInput: any
  readonly iterations: number
  readonly show: S.Show<any>['show']
}

export function GenFailureDetails<A>(
  initialInput: A,
  shrunkenInput: A,
  iterations: number,
  show?: S.Show<A>
): GenFailureDetails {
  return {
    initialInput,
    shrunkenInput,
    iterations,
    show: show ? show.show : S.any.show
  }
}
