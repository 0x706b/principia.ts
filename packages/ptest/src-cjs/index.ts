/* eslint-disable @typescript-eslint/no-var-requires */
import * as A from '@principia/base/collection/immutable/Array'
import { showFiberId } from '@principia/base/Fiber'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as C from '@principia/base/IO/Cause'
import * as Ex from '@principia/base/IO/Exit'
import * as Mb from '@principia/base/Maybe'
import { isRunnableSpec } from '@principia/test/RunnableSpec'
import * as S from '@principia/test/Spec'
import { TestArgs } from '@principia/test/TestArgs'
import path from 'path'
import yargs from 'yargs'

import { glob } from './util'

require('ts-node').register()

const argv = yargs(process.argv.slice(2))
  .options({
    path: { string: true },
    tests: { alias: 't', array: true, string: true },
    tags: { array: true, string: true },
    policy: { string: true }
  })
  .help()
  .parseSync()

const testArgs = new TestArgs(argv.tests || [], argv.tags || [], Mb.fromNullable(argv.policy))

const program = pipe(
  glob(argv.path ?? './!(node_modules)/**/test/*Spec.ts'),
  I.map(
    A.map((s) => {
      const parsed = path.parse(s)
      return `${process.cwd()}/${parsed.dir}/${parsed.name}`
    })
  ),
  I.chain(I.foreach((path) => I.try(() => require(path).default))),
  I.chain(
    I.foreachC((test) => {
      if (isRunnableSpec(test)) {
        const filteredSpec = S.filterByArgs_(test.spec, testArgs)
        return I.giveLayer_(test.run(filteredSpec), test.runner.bootstrap)
      } else {
        return I.succeed(0)
      }
    })
  )
)

I.unsafeRunWith_(
  program,
  Ex.match(
    C.squash(showFiberId)((e) => {
      if (e instanceof Error) {
        console.log(e)
      } else {
        console.log(`ptest encountered an error: ${JSON.stringify(e)}`)
      }
      process.exit(1)
    }),
    (exitCodes) => {
      for (const code of exitCodes) {
        if (code > 0) {
          process.exit(1)
        }
        process.exit(0)
      }
    }
  )
)
