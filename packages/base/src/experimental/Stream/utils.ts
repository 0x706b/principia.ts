import * as C from '../../Chunk'
import * as E from '../../Either'
import { tuple } from '../../tuple'

export function zipChunks_<A, B, C>(
  fa: C.Chunk<A>,
  fb: C.Chunk<B>,
  f: (a: A, b: B) => C
): readonly [C.Chunk<C>, E.Either<C.Chunk<A>, C.Chunk<B>>] {
  let fc    = C.empty<C>()
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc = C.append_(fc, f(C.unsafeGet_(fa, i), C.unsafeGet_(fb, i)))
  }

  if (fa.length > fb.length) {
    return tuple(fc, E.left(C.drop_(fa, fb.length)))
  }

  return tuple(fc, E.right(C.drop_(fb, fa.length)))
}
