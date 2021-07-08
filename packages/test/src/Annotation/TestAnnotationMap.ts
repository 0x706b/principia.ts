import type { TestAnnotation } from './TestAnnotation'
import type { HashMap } from '@principia/base/HashMap'

import * as A from '@principia/base/Array'
import { identity, pipe } from '@principia/base/function'
import * as Map from '@principia/base/HashMap'
import * as O from '@principia/base/Option'

export class TestAnnotationMap {
  constructor(private readonly map: HashMap<TestAnnotation<any>, any>) {}

  combine(that: TestAnnotationMap): TestAnnotationMap {
    return new TestAnnotationMap(
      pipe(
        A.from(this.map),
        A.concat(A.from(that.map)),
        A.foldl(Map.makeDefault(), (acc, [key, value]) =>
          Map.set_(
            acc,
            key,
            O.match_(
              Map.get_(acc, key),
              () => value,
              (_) => key.combine(_, value)
            )
          )
        )
      )
    )
  }

  get<V>(key: TestAnnotation<V>): V {
    return O.match_(Map.get_(this.map, key), () => key.initial, identity)
  }

  private overwrite<V>(key: TestAnnotation<V>, value: V): TestAnnotationMap {
    return new TestAnnotationMap(Map.set_(this.map, key, value))
  }

  private update<V>(key: TestAnnotation<V>, f: (v: V) => V): TestAnnotationMap {
    return this.overwrite(key, f(this.get(key)))
  }

  annotate<V>(key: TestAnnotation<V>, value: V): TestAnnotationMap {
    return this.update(key, (_) => key.combine(_, value))
  }

  static empty: TestAnnotationMap = new TestAnnotationMap(Map.makeDefault())
}
