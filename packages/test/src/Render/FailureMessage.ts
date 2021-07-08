import type { AssertionValue } from '../Assertion'
import type { GenFailureDetails } from '../GenFailureDetails'
import type { FailureDetails } from './FailureDetails'
import type { Cause } from '@principia/base/Cause'
import type { List } from '@principia/base/List'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Cause'
import * as Ev from '@principia/base/Eval'
import * as L from '@principia/base/List'
import * as O from '@principia/base/Option'
import { pipe } from '@principia/base/prelude'
import { BLUE, CYAN, RED, YELLOW } from '@principia/base/util/AnsiFormat'

import * as BA from '../FreeBooleanAlgebra'
import { TestTimeoutException } from '../TestTimeoutException'

const tabSize = 2
export class Message {
  constructor(readonly lines: List<Line> = L.empty()) {}

  ['+:'](line: Line): Message {
    return new Message(L.prepend_(this.lines, line))
  }
  [':+'](line: Line): Message {
    return new Message(L.append(line)(this.lines))
  }
  ['++'](message: Message): Message {
    return new Message(L.concat_(this.lines, message.lines))
  }
  drop(n: number): Message {
    return new Message(L.drop_(this.lines, n))
  }
  map(f: (line: Line) => Line): Message {
    return new Message(L.map_(this.lines, f))
  }
  withOffset(offset: number): Message {
    return new Message(L.map_(this.lines, (l) => l.withOffset(offset)))
  }
  static empty = new Message()
}

export class Line {
  constructor(readonly fragments: List<Fragment> = L.empty(), readonly offset: number = 0) {}

  [':+'](fragment: Fragment): Line {
    return new Line(L.append(fragment)(this.fragments))
  }
  prepend(this: Line, message: Message): Message {
    return new Message(L.prepend_(message.lines, this))
  }
  ['+'](fragment: Fragment): Line {
    return new Line(L.append(fragment)(this.fragments))
  }
  ['+|'](line: Line): Message {
    return new Message(L.list(this, line))
  }
  ['++'](line: Line): Line {
    return new Line(L.concat_(this.fragments, line.fragments), this.offset)
  }
  withOffset(shift: number): Line {
    return new Line(this.fragments, this.offset + shift)
  }
  toMessage(): Message {
    return new Message(L.single(this))
  }

  static fromString(text: string, offset = 0): Line {
    return new Fragment(text).toLine().withOffset(offset)
  }

  static empty = new Line()
}

export class Fragment {
  constructor(readonly text: string, readonly colorCode: string = '') {}

  ['+:'](line: Line): Line {
    return this.prependTo(line)
  }
  prependTo(this: Fragment, line: Line): Line {
    return new Line(L.prepend(this)(line.fragments), line.offset)
  }
  ['+'](f: Fragment): Line {
    return new Line(L.list(this, f))
  }
  toLine(): Line {
    return new Line(L.single(this))
  }
}

export function renderFailureDetails(failureDetails: FailureDetails, offset: number): Message {
  return renderGenFailureDetails(failureDetails.gen, offset)['++'](
    renderAssertionFailureDetails(failureDetails.assertion, offset)
  )
}

function renderAssertionFailureDetails(failureDetails: NonEmptyArray<AssertionValue<any>>, offset: number): Message {
  const loop = (failureDetails: ReadonlyArray<AssertionValue<any>>, rendered: Message): Ev.Eval<Message> => {
    return Ev.gen(function* (_) {
      const [fragment, whole, ...details] = failureDetails
      if (fragment != null && whole != null) {
        return yield* _(loop([whole, ...details], rendered['+:'](renderWhole(fragment, whole, offset))))
      } else {
        return rendered
      }
    })
  }

  return renderFragment(failureDetails[0], offset)['++'](Ev.evaluate(loop(failureDetails, Message.empty)))
}

function renderWhole(fragment: AssertionValue<any>, whole: AssertionValue<any>, offset: number): Line {
  return withOffset(offset + tabSize)(
    blue(whole.showValue())
      ['+'](renderSatisfied(whole))
      ['++'](highlight(cyan(whole.assertion.value.rendered), fragment.assertion.value.rendered))
  )
}

function renderGenFailureDetails(failureDetails: Option<GenFailureDetails>, offset: number): Message {
  return O.match_(
    failureDetails,
    () => Message.empty,
    (details) => {
      const shrunken       = `${details.shrunkenInput}`
      const initial        = `${details.initialInput}`
      const renderShrunken = withOffset(offset + tabSize)(
        new Fragment(
          `Test failed after ${details.iterations + 1} iteration${details.iterations > 0 ? 's' : ''} with input: `
        )['+'](red(shrunken))
      )

      return initial === shrunken
        ? renderShrunken.toMessage()
        : renderShrunken['+|'](
            withOffset(offset + tabSize)(new Fragment('Original input before shrinking was: ')['+'](red(initial)))
          )
    }
  )
}

function renderFragment(fragment: AssertionValue<any>, offset: number): Message {
  const assertionMessage = pipe(
    fragment.assertion.value.rendered.split(/\n/),
    A.map((s) => withOffset(offset + tabSize)(cyan(s).toLine())),
    (lines) => new Message(L.from(lines))
  )
  return withOffset(offset + tabSize)(blue(fragment.showValue())['+'](renderSatisfied(fragment)))
    .toMessage()
    ['++'](assertionMessage.withOffset(tabSize))
}

function highlight(fragment: Fragment, substring: string, colorCode = YELLOW): Line {
  const parts = fragment.text.split(substring)
  if (parts.length === 1) {
    return fragment.toLine()
  } else {
    return A.foldl_(parts, Line.empty, (line, part) =>
      line.fragments.length < parts.length * 2 - 2
        ? line['+'](new Fragment(part, fragment.colorCode))['+'](new Fragment(substring, colorCode))
        : line['+'](new Fragment(part, fragment.colorCode))
    )
  }
}

function renderSatisfied(fragment: AssertionValue<any>): Fragment {
  return BA.isTrue(fragment.result.value) ? new Fragment(' satisfied ') : new Fragment(' did not satisfy ')
}

export function renderCause(cause: Cause<any>, offset: number): Message {
  const printCause = () =>
    pipe(
      C.pretty(cause).split('\n'),
      A.map((s) => withOffset(offset + tabSize)(Line.fromString(s))),
      (lines) => new Message(L.from(lines))
    )
  return O.match_(C.dieOption(cause), printCause, (_) => {
    if (_ instanceof TestTimeoutException) {
      return new Fragment(_.message).toLine().toMessage()
    } else {
      return printCause()
    }
  })
}

function withOffset(i: number): (line: Line) => Line {
  return (line) => line.withOffset(i)
}

function blue(s: string): Fragment {
  return new Fragment(s, BLUE)
}

function red(s: string): Fragment {
  return new Fragment(s, RED)
}

function cyan(s: string): Fragment {
  return new Fragment(s, CYAN)
}
