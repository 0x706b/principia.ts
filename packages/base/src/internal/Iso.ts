import type { PIso, PIsoMin } from '../Iso'

import * as E from '../Either'
import { flow } from '../function'
import { makePLens } from './Lens'
import { makePPrism } from './Prism'

export function makePIso<S, T, A, B>(I: PIsoMin<S, T, A, B>): PIso<S, T, A, B> {
  return {
    ...makePPrism({ getOrModify: flow(I.get, E.right), reverseGet: I.reverseGet }),
    ...makePLens({ get: I.get, replace_: (_s, b) => I.reverseGet(b) }),
    reverse: () =>
      makePIso({
        get: I.reverseGet,
        reverseGet: I.get
      })
  }
}
