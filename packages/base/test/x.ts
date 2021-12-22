import { Console } from '@principia/base/Console'
import * as Fi from '@principia/base/Fiber'
import { pipe } from '@principia/base/function'
import * as IO from '@principia/base/IO'

pipe(
  pipe(Console.put('test'), IO.delay(50)),
  IO.raceWith(
    pipe(Console.put('bug'), IO.delay(1000)),
    (exit, fiber) =>
      pipe(
        Fi.interrupt(fiber),
        IO.chain(() => Console.put('no bug'))
      ),
    (exit, fiber) =>
      pipe(
        Fi.join(fiber),
        IO.chain(() => Console.put('bug'))
      )
  ),
  IO.run()
)
