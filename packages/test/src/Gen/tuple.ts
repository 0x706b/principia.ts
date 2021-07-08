import type { Gen } from './core'
import type { _A, _R } from '@principia/base/util/types'

import * as A from '@principia/base/Array'

import * as G from './core'

export function tuple<C extends ReadonlyArray<Gen<any, any>>>(
  ...components: C
): Gen<_R<C[number]>, { [K in keyof C]: _A<C[K]> }> {
  return A.foldl_(components, G.constant<Array<any>>([]) as Gen<_R<C[keyof C]>, any>, (b, a) =>
    G.crossWith_(b, a, (bs, x) => [...bs, x])
  )
}
