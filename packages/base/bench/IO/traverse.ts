import * as b from 'benny'

import * as A from '../../src/Array'
import * as C from '../../src/Chunk'
import * as IO from '../../src/IO'

const iter = A.range(0, 100)

b.suite(
  'traverseT vs. foreach',
  b.add('traverseT', async () => {
    await IO.runPromise(
      IO.map_(
        IO.traverseT_(A.Traversable)(iter, (n) => IO.succeed(n + 1)),
        C.from
      )
    )
  }),
  b.add('foreach', async () => {
    await IO.runPromise(IO.foreach_(iter, (n) => IO.succeed(n + 1)))
  }),
  b.cycle(),
  b.complete()
)
