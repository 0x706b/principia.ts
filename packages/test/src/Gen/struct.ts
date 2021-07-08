import type { Gen } from './core'
import type { _A, _R } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import { Random } from '@principia/base/Random'

import * as G from './core'

export function struct<P extends Record<string, Gen<any, any>>>(
  properties: P
): Gen<_R<P[keyof P]>, { readonly [K in keyof P]: _A<P[K]> }> {
  const entries = Object.entries(properties)
  return A.foldl_(entries, G.constant({}) as Gen<any, any>, (b, [k, genV]) =>
    G.crossWith_(b, genV, (out, v) => ({ ...out, [k]: v }))
  )
}

export function partial<P extends Record<string, Gen<any, any>>>(
  properties: P
): Gen<_R<P[keyof P]>, Partial<{ [K in keyof P]: _A<P[K]> }>> {
  const entries = Object.entries(properties)
  return A.foldl_(entries, G.constant({}) as Gen<any, any>, (b, [k, genV]) =>
    pipe(
      Random.next,
      I.map((n) => n > 0.5),
      I.ifIO(
        I.succeed(G.crossWith_(b, genV, (r, v) => ({ ...r, [k]: v }))),
        I.succeed(b)
      ),
      G.unwrap
    )
  )
}
