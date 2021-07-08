import type { Live } from './Live'
import type { FiberRef } from '@principia/base/FiberRef'
import type { Has } from '@principia/base/Has'
import type { IO, UIO } from '@principia/base/IO'
import type { URef } from '@principia/base/Ref'

import * as A from '@principia/base/Array'
import { Console, ConsoleTag } from '@principia/base/Console'
import * as FR from '@principia/base/FiberRef'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Li from '@principia/base/List'
import * as Ref from '@principia/base/Ref'
import { intersect } from '@principia/base/Struct'
import { inspect } from 'util'

import { LiveTag } from './Live'

export class ConsoleData {
  constructor(
    readonly input: Li.List<string> = Li.empty(),
    readonly output: Li.List<string> = Li.empty(),
    readonly errOutput: Li.List<string> = Li.empty(),
    readonly debugOutput: Li.List<string> = Li.empty()
  ) {}

  copy(_: Partial<ConsoleData>): ConsoleData {
    return new ConsoleData(
      _.input ?? this.input,
      _.output ?? this.output,
      _.errOutput ?? this.errOutput,
      _.debugOutput ?? this.debugOutput
    )
  }
}

export class TestConsole implements Console {
  put(...input: any[]): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) =>
        new ConsoleData(
          data.input,
          pipe(
            input,
            A.foldl(Li.empty(), (b, a) => Li.append_(b, inspect(a, { colors: false })))
          ),
          data.errOutput,
          data.debugOutput
        )
    )['*>'](I.whenIO_(this.live.provide(Console.put(...input)), FR.get(this.debugState)))
  }
  putStrLn(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, Li.append_(data.output, `${line}\n`), data.errOutput, data.debugOutput)
    )['*>'](I.whenIO_(this.live.provide(Console.putStrLn(line)), FR.get(this.debugState)))
  }
  putStrLnErr(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, data.output, Li.append_(data.errOutput, `${line}\n`), data.debugOutput)
    )['*>'](I.whenIO_(this.live.provide(Console.putStrLnErr(line)), FR.get(this.debugState)))
  }
  putStrLnDebug(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, data.output, data.errOutput, Li.append_(data.debugOutput, `${line}\n`))
    )['*>'](I.whenIO_(this.live.provide(Console.putStrLnDebug(line)), FR.get(this.debugState)))
  }
  constructor(readonly consoleState: URef<ConsoleData>, readonly live: Live, readonly debugState: FiberRef<boolean>) {}
  clearInput: UIO<void>  = Ref.update_(this.consoleState, (data) => data.copy({ input: Li.empty() }))
  clearOutput: UIO<void> = Ref.update_(this.consoleState, (data) => data.copy({ output: Li.empty() }))
  debug<R, E, A>(io: IO<R, E, A>): IO<R, E, A> {
    return FR.locally_(this.debugState, true, io)
  }
  feedLines(...lines: ReadonlyArray<string>): UIO<void> {
    return Ref.update_(this.consoleState, (data) => data.copy({ input: Li.concat_(Li.from(lines), data.input) }))
  }
  output: UIO<ReadonlyArray<string>>      = this.consoleState.get['<$>']((data) => Li.toArray(data.output))
  outputErr: UIO<ReadonlyArray<string>>   = this.consoleState.get['<$>']((data) => Li.toArray(data.errOutput))
  outputDebug: UIO<ReadonlyArray<string>> = this.consoleState.get['<$>']((data) => Li.toArray(data.debugOutput))
  silent<R, E, A>(io: IO<R, E, A>): IO<R, E, A> {
    return FR.locally_(this.debugState, false, io)
  }

  static make(data: ConsoleData, debug = true): L.Layer<Has<Live>, never, Has<Console> & Has<TestConsole>> {
    return L.fromRawIO(
      I.asksServiceIO(LiveTag)((live) =>
        I.gen(function* (_) {
          const ref      = yield* _(Ref.make(data))
          const debugRef = yield* _(FR.make(debug))
          const test     = new TestConsole(ref, live, debugRef)
          return intersect(TestConsoleTag.of(test), ConsoleTag.of(test))
        })
      )
    )
  }
  static debug: L.Layer<Has<Live>, never, Has<Console> & Has<TestConsole>> = TestConsole.make(
    new ConsoleData(Li.empty(), Li.empty(), Li.empty(), Li.empty())
  )
}

export const TestConsoleTag = tag(TestConsole)
