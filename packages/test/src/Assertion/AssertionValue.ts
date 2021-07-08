import type { FreeBooleanAlgebra } from '../FreeBooleanAlgebra'
import type { AssertionIO } from './AssertionM'
import type { Eval } from '@principia/base/Eval'
import type * as S from '@principia/base/Show'

import * as Sh from '@principia/base/Structural/Showable'

export class AssertionValue<A> {
  readonly _tag = 'AssertionValue'
  constructor(
    readonly value: A,
    readonly assertion: Eval<AssertionIO<A>>,
    readonly result: Eval<FreeBooleanAlgebra<AssertionValue<A>>>,
    readonly showA?: S.Show<A>
  ) {}

  showValue(): string {
    return this.showA ? this.showA.show(this.value) : Sh.show(this.value)
  }

  isSameAssertionAs(that: AssertionValue<A>) {
    return this.assertion.value.rendered === that.assertion.value.rendered
  }
}
