import chalk from 'chalk'
import { parseJSON } from 'fp-ts/lib/Either'
import { flow, pipe } from 'fp-ts/lib/function'
import * as R from 'fp-ts/lib/ReadonlyRecord'
import * as TE from 'fp-ts/lib/TaskEither'
import * as Path from 'path'

import { onLeft, onRight, readFile, writeFile } from './common'

const esmJSON = (sideEffects: string[]) =>
  JSON.stringify({ type: 'module', sideEffects: sideEffects.length === 0 ? false : sideEffects })
const cjsJSON = JSON.stringify({ type: 'commonjs' })

const getSideEffects = flow(
  (content: any) => content?.config?.sideEffects,
  (x): string[] => (Array.isArray(x) && x.every((y) => typeof y === 'string') ? x : [])
)

const loadPackageJson: TE.TaskEither<Error, any> = pipe(
  readFile(Path.resolve(process.cwd(), 'package.json'), 'utf8'),
  TE.chainEitherK((content) => parseJSON(content, (err) => err as Error))
)

pipe(
  loadPackageJson,
  TE.bindTo('content'),
  TE.bind('exports', ({ content }) => {
    if (content['exports']) {
      return TE.of(
        pipe(
          content['exports'],
          R.map((ex: any) => {
            const mut_ex = { ...ex }

            let esm          = (ex['import'] as string).split('/')
            esm              = [...esm.slice(0, 1), ...esm.slice(2)]
            mut_ex['import'] = esm.join('/')

            let cjs           = (ex['require'] as string).split('/')
            cjs               = [...cjs.slice(0, 1), ...cjs.slice(2)]
            mut_ex['require'] = cjs.join('/')

            if (ex['traced']) {
              let esm                    = (ex['traced']['import'] as string).split('/')
              esm                        = [...esm.slice(0, 1), ...esm.slice(2)]
              mut_ex['traced']['import'] = esm.join('/')

              let cjs                     = (ex['traced']['require'] as string).split('/')
              cjs                         = [...cjs.slice(0, 1), ...cjs.slice(2)]
              mut_ex['traced']['require'] = cjs.join('/')
            }

            return mut_ex
          })
        )
      )
    } else {
      return TE.of({})
    }
  }),
  TE.bind('sideEffects', ({ content }) => TE.of(getSideEffects(content))),
  TE.chainFirst(({ content, exports }) =>
    writeFile(
      Path.resolve(process.cwd(), 'dist/package.json'),
      JSON.stringify({
        author: content['author'],
        dependencies: content['dependencies'],
        description: content['description'],
        exports,
        license: content['license'],
        name: content['name'],
        main: 'dist/cjs/index.js',
        module: 'dist/esm/index.js',
        peerDependencies: content['peerDependencies'],
        private: false,
        publishConfig: {
          access: 'public'
        },
        repository: content['repository'],
        typings: './index.d.ts',
        version: content['version']
      })
    )
  ),
  TE.chainFirst(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/cjs/package.json'), cjsJSON)),
  TE.chainFirst(({ sideEffects }) =>
    writeFile(Path.resolve(process.cwd(), 'dist/dist/esm/package.json'), esmJSON(sideEffects))
  ),
  TE.chainFirst(({ content }) =>
    content?.exports?.traced
      ? writeFile(Path.resolve(process.cwd(), 'dist/dist-traced/cjs/package.json'), cjsJSON)
      : TE.of(undefined)
  ),
  TE.chainFirst(({ content, sideEffects }) =>
    content?.exports?.traced
      ? writeFile(Path.resolve(process.cwd(), 'dist/dist-traced/esm/package.json'), esmJSON(sideEffects))
      : TE.of(undefined)
  ),
  TE.fold(onLeft, onRight('Package copy succeeded!'))
)().catch((e) => console.log(chalk.red.bold(`unexpected error ${e}`)))
