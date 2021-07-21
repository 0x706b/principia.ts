import type { ErrorOf, Observable, ObservableInput, TypeOf } from '../core'

import { operate_ } from '../../Operator'
import { raceInit } from '../constructors/race'

export function raceWith_<E, A, O extends ReadonlyArray<ObservableInput<any, any>>>(
  fa: Observable<E, A>,
  ...sources: O
): Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return !sources.length
    ? fa
    : operate_(fa, (source, subscriber) => {
        raceInit([source, ...sources])(subscriber)
      })
}

export function raceWith<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): <E, A>(fa: Observable<E, A>) => Observable<E | ErrorOf<O[number]>, A | TypeOf<O[number]>> {
  return (fa) => raceWith_(fa, ...sources)
}
