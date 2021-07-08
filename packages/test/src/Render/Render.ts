import type { RenderParam } from './RenderParam'
import type { List } from '@principia/base/List'

import { flow, pipe } from '@principia/base/function'
import * as L from '@principia/base/List'

export const RenderFunctionTypeId = Symbol('@principia/test/Render/RenderFunction')
export type RenderFunctionTypeId = typeof RenderFunctionTypeId

export class RenderFunction {
  readonly [RenderFunctionTypeId]: RenderFunctionTypeId = RenderFunctionTypeId

  constructor(readonly name: string, readonly paramLists: List<List<RenderParam>>) {}
  get rendered(): string {
    return `${this.name}(${pipe(
      this.paramLists,
      L.map(
        flow(
          L.map((p) => p.rendered),
          L.join(', ')
        )
      ),
      L.join('')
    )})`
  }
}

export function fn(name: string, paramLists: List<List<RenderParam>>): Render {
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
