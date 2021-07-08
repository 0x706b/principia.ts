import * as A from '@principia/base/Array'
import * as C from '@principia/base/Cause'
import * as Ex from '@principia/base/Exit'
import { constVoid, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as O from '@principia/base/Option'
import { isRunnableSpec } from '@principia/test/RunnableSpec'
import { TestArgs } from '@principia/test/TestArgs'
import { createRequire } from 'module'
import path from 'path'
import yargs from 'yargs'

import { glob } from './util'

const _require = createRequire(import.meta.url)

_require('ts-node').register({
  compilerOptions: {
    plugins: [
      {
        after: true,
        transform: '@0x706b/ts-transform-fix-esm',
        createRequire: false
      }
    ]
  },
  compiler: 'ttypescript'
})

const argv = yargs(process.argv.slice(2))
  .options({
    path: { string: true },
    tests: { alias: 't', array: true, string: true },
    tags: { array: true, string: true },
    policy: { string: true }
  })
  .help()
  .parseSync()

const testArgs = new TestArgs(argv.tests || [], argv.tags || [], O.fromNullable(argv.policy))

const program = pipe(
  glob(argv.path ?? './**/test/*Spec.ts'),
  I.map(
    A.map((s) => {
      const parsed = path.parse(s)
      return `${process.cwd()}/${parsed.dir}/${parsed.name}`
    })
  ),
  I.chain(I.foreach((path) => I.try(() => _require(path).default))),
  I.chain(I.foreach((test) => (isRunnableSpec(test) ? I.succeedLazy(() => test.main(testArgs)) : I.unit())))
)

I.run_(
  program,
  Ex.match(
    C.squash((e) => {
      if (e instanceof Error) {
        console.log(e)
      } else {
        console.log(`ptest encountered an error: ${JSON.stringify(e)}`)
      }
    }),
    constVoid
  )
)
