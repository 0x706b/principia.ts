import type { Endomorphism } from 'fp-ts/lib/Endomorphism'

import chalk from 'chalk'
import { sequenceT } from 'fp-ts/lib/Apply'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import { flow, pipe, unsafeCoerce } from 'fp-ts/lib/function'
import * as Json from 'fp-ts/lib/Json'
import * as TE from 'fp-ts/lib/TaskEither'
import { posix } from 'path'

import { copy, modifyGlob, onLeft, onRight } from './common'

const MAP_GLOB_PATTERN = 'dist/**/*.map'

interface SourceMap {
  sources: string[]
}

const replaceString = (path: string): Endomorphism<string> => {
  const dir = posix.dirname(path)
  return flow(
    (x) => x.replace(/(.*)\.\.\/src(.*)/gm, '$1_src$2'),
    (x) => posix.relative(dir, posix.join(dir, x)),
    (x) => (x.startsWith('.') ? x : './' + x)
  )
}

const replaceSingleStage = (content: string, path: string): string =>
  pipe(
    Json.parse(content),
    E.mapLeft((reason) => new Error('could not parse json: ' + String(reason))),
    E.map((x) => unsafeCoerce<Json.Json, SourceMap>(x)),
    E.map(
      flow(
        Object.entries,
        A.map(([k, v]) => (k === 'sources' ? [k, A.Functor.map(v as string[], replaceString(path))] : [k, v])),
        A.reduce({}, (acc, [k, v]) => ({ ...acc, [k]: v }))
      ) as <A>(x: A) => A
    ),
    E.chain(
      flow(
        Json.stringify,
        E.mapLeft((reason) => new Error('could not stringify json: ' + String(reason)))
      )
    ),
    E.getOrElse(() => content)
  )

pipe(
  sequenceT(TE.ApplySeq)(
    copy('src/**/*', 'dist/_src', { update: true }),
    modifyGlob(replaceSingleStage)(MAP_GLOB_PATTERN)
  ),
  TE.fold(onLeft, onRight('Source map linking succeeded!'))
)().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`), e.stack))
