import * as A from '@principia/base/Array'
import { CaseClass, CaseTypeId } from '@principia/base/Case'
import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as St from '@principia/base/Structural'
import * as Z from '@principia/base/Z'

export const RequestTypeId = Symbol('@principia/query/Request')
export type RequestTypeId = typeof RequestTypeId

export abstract class Request<E, A> {
  readonly [RequestTypeId]: RequestTypeId = RequestTypeId

  readonly _E!: () => E
  readonly _A!: () => A
}

const baseHash = St.hashString('@principia/query/Request/StaticRequest')

// @ts-expect-error
export abstract class StaticRequest<X extends Record<PropertyKey, any>, E, A> extends CaseClass<X> {
  readonly [RequestTypeId]: RequestTypeId = RequestTypeId

  readonly _E!: () => E
  readonly _A!: () => A

  get [St.$hash](): number {
    return A.foldl_(this[CaseTypeId], baseHash, (acc, k) => St.combineHash(acc, St.hash(this[k])))
  }

  get [St.$show](): St.ShowComputationExternal {
    return St.showComputationComplex({
      base: Z.pure(`Request (${this.constructor.name})`),
      braces: ['{', '}'],
      keys: pipe(
        this[CaseTypeId],
        Z.foreach((key) => St.showProperty(this, key, 0)),
        Z.map(C.from)
      )
    })
  }
}

export type AnyRequest = Request<any, any>
