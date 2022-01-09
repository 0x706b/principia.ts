import type { Maybe } from '@principia/base/Maybe'

import * as A from '@principia/base/collection/immutable/Array'
import * as V from '@principia/base/collection/immutable/Vector'
import { pipe } from '@principia/base/function'
import * as M from '@principia/base/Maybe'
import * as Str from '@principia/base/string'

import * as TA from '../Annotation'

export class LeafRenderer<V> {
  readonly _tag = 'LeafRenderer'
  constructor(readonly annotation: TA.TestAnnotation<V>, readonly render: (_: V.Vector<V>) => Maybe<string>) {}

  run(ancestors: V.Vector<TA.TestAnnotationMap>, child: TA.TestAnnotationMap) {
    return M.match_(
      this.render(V.prepend(child.get(this.annotation))(V.map_(ancestors, (m) => m.get(this.annotation)))),
      () => V.empty<string>(),
      V.single
    )
  }
}

export class CompositeRenderer {
  readonly _tag = 'CompositeRenderer'
  constructor(readonly renderers: ReadonlyArray<TestAnnotationRenderer>) {}

  run(ancestors: V.Vector<TA.TestAnnotationMap>, child: TA.TestAnnotationMap): V.Vector<string> {
    return V.chain_(V.from(this.renderers), (r) => r.run(ancestors, child))
  }
}

export type TestAnnotationRenderer = LeafRenderer<any> | CompositeRenderer

export function combine_(self: TestAnnotationRenderer, that: TestAnnotationRenderer): TestAnnotationRenderer {
  return self._tag === 'CompositeRenderer'
    ? that._tag === 'CompositeRenderer'
      ? new CompositeRenderer(A.concat_(self.renderers, that.renderers))
      : new CompositeRenderer(A.append_(self.renderers, that))
    : that._tag === 'CompositeRenderer'
    ? new CompositeRenderer(A.prepend_(that.renderers, self))
    : new CompositeRenderer([self, that])
}

export const ignored: TestAnnotationRenderer = new LeafRenderer(TA.ignored, ([child, ..._]) =>
  child === 0 ? M.nothing() : M.just(`ignored: ${child}`)
)

export const repeated: TestAnnotationRenderer = new LeafRenderer(TA.repeated, ([child, ..._]) =>
  child === 0 ? M.nothing() : M.just(`repeated: ${child}`)
)

export const retried: TestAnnotationRenderer = new LeafRenderer(TA.retried, ([child, ..._]) =>
  child === 0 ? M.nothing() : M.just(`retried: ${child}`)
)

export const tagged: TestAnnotationRenderer = new LeafRenderer(TA.tagged, ([child, ..._]) =>
  child.size === 0
    ? M.nothing()
    : M.just(`tagged: ${pipe(A.from(child), A.map(Str.surround('"')), A.join(', '))}`)
)

export const timed: TestAnnotationRenderer = new LeafRenderer(TA.timing, ([child, ..._]) =>
  child === 0 ? M.nothing() : M.just(`${child}ms`)
)

export const silent: TestAnnotationRenderer = {
  _tag: 'CompositeRenderer',
  renderers: [],
  run: (ancestors, child) => V.empty()
}

export const defaultTestAnnotationRenderer: TestAnnotationRenderer = new CompositeRenderer([
  ignored,
  repeated,
  retried,
  tagged,
  timed
])
