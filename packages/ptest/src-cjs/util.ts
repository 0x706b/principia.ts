import * as I from '@principia/base/IO'
import glob_ from 'glob'

export function glob(glob: string, opts: glob_.IOptions = {}): I.FIO<Error, ReadonlyArray<string>> {
  return I.async((k) => {
    glob_(glob, opts, (err, result) => (err == null ? k(I.succeed(result)) : k(I.fail(err))))
  })
}
