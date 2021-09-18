import chalk from 'chalk'
import { flow, pipe } from 'fp-ts/function'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'

import { glob, readFile, writeFile } from './common'

const args = yargs(process.argv.slice(2))
  .scriptName('newPackage')
  .options({ name: { string: true } })
  .parseSync()

const mkdir  = TE.taskify<string, fs.MakeDirectoryOptions & { recursive?: boolean }, Error, string>(fs.mkdir)
const access = TE.taskify<string, number, Error, void>(fs.access)

if (args.name == null) {
  console.log(chalk.red('argument --name [string] is required'))
  process.exit(1)
}

function replace(key: string, contents: string, replacement: string): string {
  return contents.replace(/\${(.*?)\}/g, (match, capture: string) => {
    if (capture === key) {
      return replacement
    }
    return match
  })
}

function createNewPackage(name: string) {
  return pipe(
    glob('scripts/template/**/*.template'),
    TE.chain(
      flow(
        A.map((filePath) =>
          pipe(
            readFile(filePath, 'utf8'),
            TE.map((contents) => replace('name', contents, name!)),
            TE.chain((contents) => {
              const cwd     = process.cwd()
              const newPath = path.join(
                cwd,
                `packages/${name}`,
                filePath.replace('scripts/template', '').replace('.template', '')
              )
              const { dir } = path.parse(newPath)
              return pipe(
                access(dir, fs.constants.F_OK),
                TE.matchE(
                  () =>
                    pipe(
                      mkdir(dir, { recursive: true }),
                      TE.matchE(
                        (err) => ('code' in err && err['code'] === 'EEXIST' ? TE.right(void 0) : TE.left(err)),
                        () => TE.right(void 0)
                      )
                    ),
                  () => TE.of(void 0)
                ),
                TE.chain(() =>
                  pipe(
                    writeFile(newPath, contents),
                    TE.chain(() => TE.rightIO(() => console.log(chalk.green(`Created ${newPath}`))))
                  )
                )
              )
            })
          )
        ),
        TE.sequenceArray
      )
    )
  )
}

createNewPackage(args.name)()
