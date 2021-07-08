import type { Option } from '@principia/base/Option'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as L from '@principia/base/List'
import * as O from '@principia/base/Option'
import * as Str from '@principia/base/string'

import * as TA from '../Annotation'

export class LeafRenderer<V> {
  readonly _tag = 'LeafRenderer'
  constructor(readonly annotation: TA.TestAnnotation<V>, readonly render: (_: L.List<V>) => Option<string>) {}

  run(ancestors: L.List<TA.TestAnnotationMap>, child: TA.TestAnnotationMap) {
    return O.match_(
      this.render(L.prepend(child.get(this.annotation))(L.map_(ancestors, (m) => m.get(this.annotation)))),
      () => L.empty<string>(),
      L.single
    )
  }
}

export class CompositeRenderer {
  readonly _tag = 'CompositeRenderer'
  constructor(readonly renderers: ReadonlyArray<TestAnnotationRenderer>) {}

  run(ancestors: L.List<TA.TestAnnotationMap>, child: TA.TestAnnotationMap): L.List<string> {
    return L.chain_(L.from(this.renderers), (r) => r.run(ancestors, child))
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
  child === 0 ? O.none() : O.some(`ignored: ${child}`)
)

export const repeated: TestAnnotationRenderer = new LeafRenderer(TA.repeated, ([child, ..._]) =>
  child === 0 ? O.none() : O.some(`repeated: ${child}`)
)

export const retried: TestAnnotationRenderer = new LeafRenderer(TA.retried, ([child, ..._]) =>
  child === 0 ? O.none() : O.some(`retried: ${child}`)
)

export const tagged: TestAnnotationRenderer = new LeafRenderer(TA.tagged, ([child, ..._]) =>
  child.keyMap.size === 0 ? O.none() : O.some(`tagged: ${pipe(A.from(child), A.map(Str.surround('"')), A.join(', '))}`)
)

export const timed: TestAnnotationRenderer = new LeafRenderer(TA.timing, ([child, ..._]) =>
  child === 0 ? O.none() : O.some(`${child}ms`)
)

export const silent: TestAnnotationRenderer = {
  _tag: 'CompositeRenderer',
  renderers: [],
  run: (ancestors, child) => L.empty()
}

export const defaultTestAnnotationRenderer: TestAnnotationRenderer = new CompositeRenderer([
  ignored,
  repeated,
  retried,
  tagged,
  timed
])
