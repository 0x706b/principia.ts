import type { FreeBooleanAlgebra } from '../FreeBooleanAlgebra'
import type { AssertionIO } from './AssertionM'
import type { Eval } from '@principia/base/Eval'
import type * as S from '@principia/base/Show'

import * as A from '@principia/base/collection/immutable/Array'
import * as Ev from '@principia/base/Eval'
import { pipe } from '@principia/base/function'
import * as str from '@principia/base/string'
import * as Sh from '@principia/base/Structural/Showable'

export class AssertionValue<A> {
  readonly _tag = 'AssertionValue'
  constructor(
    readonly value: A,
    readonly assertion: Eval<AssertionIO<A>>,
    readonly result: Eval<FreeBooleanAlgebra<AssertionValue<A>>>,
    readonly showA?: S.Show<A>
  ) {}

  showValue(offset = 0): string {
    return this.showA
      ? pipe(
          this.showA.show(this.value),
          str.lines,
          A.imap((i, line) => (i === 0 ? line : ' '.repeat(offset) + line)),
          A.join('\n')
        )
      : Sh.showWithOptions(this.value, { indentationLevel: offset })
  }

  isSameAssertionAs(that: AssertionValue<A>) {
    return Ev.run(this.assertion).rendered === Ev.run(that.assertion).rendered
  }
}
