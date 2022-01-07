import type { RenderParam } from './RenderParam'
import type { Vector } from '@principia/base/collection/immutable/Vector'

import * as V from '@principia/base/collection/immutable/Vector'
import { flow, pipe } from '@principia/base/function'

export const RenderFunctionTypeId = Symbol('@principia/test/Render/RenderFunction')
export type RenderFunctionTypeId = typeof RenderFunctionTypeId

export class RenderFunction {
  readonly [RenderFunctionTypeId]: RenderFunctionTypeId = RenderFunctionTypeId

  constructor(readonly name: string, readonly paramLists: Vector<Vector<RenderParam>>) {}
  get rendered(): string {
    return `${this.name}(${pipe(
      this.paramLists,
      V.map(
        flow(
          V.map((p) => p.rendered),
          V.join(', ')
        )
      ),
      V.join('')
    )})`
  }
}

export function fn(name: string, paramLists: Vector<Vector<RenderParam>>): Render {
  return new RenderFunction(name, paramLists)
}

export const RenderInfixTypeId = Symbol('@principia/test/Render/RenderInfix')
export type RenderInfixTypeId = typeof RenderInfixTypeId

export class RenderInfix {
  readonly [RenderInfixTypeId]: RenderInfixTypeId = RenderInfixTypeId
  constructor(readonly left: RenderParam, readonly op: string, readonly right: RenderParam) {}

  get rendered(): string {
    return `(${this.left.rendered} ${this.op} ${this.right.rendered})`
  }
}

export function infix(left: RenderParam, op: string, right: RenderParam): Render {
  return new RenderInfix(left, op, right)
}

export type Render = RenderFunction | RenderInfix
