import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as IO from '@principia/base/IO'
import * as b from 'benny'

const iter = A.range(0, 100)

b.suite(
  'traverseT vs. foreach',
  b.add('traverseT', async () => {
    await IO.runPromise(
      IO.map_(
        IO.traverse_(A.Traversable)(iter, (n) => IO.succeed(n + 1)),
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
