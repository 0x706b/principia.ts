import type { Chunk } from '@principia/base/Chunk'
import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'

import '@principia/base/Operators'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import { Console } from '@principia/base/Console'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as St from '@principia/base/Structural'
import { showWithOptions } from '@principia/base/Structural'
import { matchTag, matchTag_ } from '@principia/base/util/match'
import { inspect } from 'util'

import { CompletedRequestMap } from '../src/CompletedRequestMap'
import * as DS from '../src/DataSource'
import * as Query from '../src/Query'
import { StaticRequest } from '../src/Request'

const testData = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D'
}

class Get extends StaticRequest<{ readonly id: string }, string, string> {
  readonly _tag = 'Get'
}

class GetAll extends StaticRequest<{}, string, Record<string, string>> {
  readonly _tag = 'GetAll'
}

const backendGetAll: I.IO<Has<Console>, never, Record<string, string>> = I.gen(function* (_) {
  yield* _(Console.putStrLn('getAll called'))
  return testData
})

const backendGetSome = (ids: Chunk<string>): I.IO<Has<Console>, never, Record<string, string>> =>
  I.gen(function* (_) {
    yield* _(Console.putStrLn(`getSome ${St.show(A.from(ids))} called`))
    return C.foldl_(ids, {} as Record<string, string>, (r, a) =>
      pipe(
        testData,
        R.lookup(a),
        O.match(
          () => r,
          (v) => ({ ...r, [a]: v })
        )
      )
    )
  })

type Req = Get | GetAll

const ds = DS.makeBatched('test', (requests: Chunk<Req>): IO<Has<Console>, never, CompletedRequestMap> => {
  const [all, one] = C.partition_(requests, (req) => (req._tag === 'GetAll' ? false : true))

  if (C.isNonEmpty(all)) {
    return pipe(
      backendGetAll,
      I.map((allItems) =>
        R.foldl_(allItems, CompletedRequestMap.empty(), (result, id, value) =>
          result.insert(new Get({ id }), E.right(value))
        ).insert(new GetAll(), E.right(allItems))
      )
    )
  } else {
    return I.gen(function* (_) {
      const items = yield* _(
        backendGetSome(C.chain_(one, matchTag({ Get: ({ id }) => C.single(id), GetAll: () => C.empty<string>() })))
      )
      return pipe(
        one,
        C.foldl(CompletedRequestMap.empty(), (result, req) =>
          matchTag_(req, {
            GetAll: () => result,
            Get: (req) =>
              pipe(
                items,
                R.lookup(req.id),
                O.match(
                  () => result.insert(req, E.left('not found')),
                  (value) => result.insert(req, E.right(value))
                )
              )
          })
        )
      )
    })
  }
})

const getAll = Query.fromRequest(new GetAll(), ds)

const get = (id: string) => Query.fromRequest(new Get({ id }), ds)

console.log(St.show(new Get({ id: 'a' })))

const program = () => {
  const getSome = Query.foreachPar_(['c', 'd'], get)
  const query   = Query.crossWith_(getAll, getSome, (_, b) => b)
  return I.gen(function* (_) {
    const result = yield* _(Query.run(query))
    yield* _(Console.putStrLn(inspect(result)))
  })
}

program()['|>'](I.run((ex) => console.log(showWithOptions(ex, { colors: true }))))
