import { fromNullable } from '@principia/base/Option'
import { RunnableSpec } from '@principia/test/RunnableSpec'
import { TestArgs } from '@principia/test/TestArgs'
import chalk from 'chalk'
import { constant, flow, pipe } from 'fp-ts/function'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import path from 'path'
import yargs from 'yargs/yargs'

import { glob, onLeft } from './common'

/*
 * This is a very hacky POC test runner. Will be revised soon
 */

const argv = yargs(process.argv.slice(2))
  .options({
    path: { string: true },
    tests: { alias: 't', array: true, string: true },
    tags: { array: true, string: true },
    policy: { string: true }
  })
  .help().argv

const testArgs = new TestArgs(argv.tests || [], argv.tags || [], fromNullable(argv.policy))

const program = pipe(
  glob(argv.path || 'packages/**/test/*Spec.ts'),
  TE.map(
    A.map((s) => {
      const parsed = path.parse(s)
      return `../${parsed.dir}/${parsed.name}`
    })
  ),
  TE.chain((paths) =>
    pipe(
      paths,
      IOE.traverseArray((path) =>
        IOE.tryCatch(
          () => require(path).default as any,
          (err) => err as Error
        )
      ),
      TE.fromIOEither
    )
  ),
  TE.chainW(
    flow(
      IO.traverseArray((test) => (test instanceof RunnableSpec ? () => test.main(testArgs) : () => undefined)),
      (io) => TE.fromIO<never, readonly void[]>(io)
    )
  ),
  TE.fold(
    onLeft,
    constant(() => Promise.resolve())
  )
)

program().catch((e) => console.log(chalk.bold.red(`Unexpected error ${e}`, e.stack)))
