import type { Sized } from '../Sized'
import type { Gen, LengthConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as C from '@principia/base/collection/immutable/Conc'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'
import * as Str from '@principia/base/string'

import { uniqueConc } from './conc'
import * as G from './core'
import { tuple } from './tuple'

export function dictionary<R, R1, V>(
  key: Gen<R, string>,
  value: Gen<R1, V>,
  constraints?: LengthConstraints
): Gen<Has<Random> & Has<Sized> & R & R1, Record<string, V>> {
  return pipe(
    tuple(key, value),
    uniqueConc({ eq: Eq.contramap_(Str.Eq, ([k]) => k), ...constraints }),
    G.map(C.foldl({} as Record<string, V>, (b, [k, v]) => ({ ...b, [k]: v })))
  )
}
