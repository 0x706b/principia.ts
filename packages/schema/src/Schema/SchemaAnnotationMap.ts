import type { SchemaAnnotation } from './SchemaAnnotation'
import type { HashMap } from '@principia/base/HashMap'

import * as A from '@principia/base/Array'
import { identity, pipe } from '@principia/base/function'
import * as HM from '@principia/base/HashMap'
import * as O from '@principia/base/Option'

export class SchemaAnnotationMap {
  constructor(readonly map: HashMap<SchemaAnnotation<any>, any>) {}

  combine(that: SchemaAnnotationMap): SchemaAnnotationMap {
    return new SchemaAnnotationMap(
      pipe(
        A.from(this.map),
        A.concat(A.from(that.map)),
        A.foldl(HM.beginMutation(HM.makeDefault<SchemaAnnotation<any>, any>()), (acc, [key, v1]) => {
          HM.set_(
            acc,
            key,
            O.match_(
              HM.get_(acc, key),
              () => v1,
              (v2) => key.combine(v1, v2)
            )
          )
          return acc
        }),
        HM.endMutation
      )
    )
  }

  get<V>(key: SchemaAnnotation<V>): V {
    return pipe(
      this.map,
      HM.get(key),
      O.match(() => key.initial, identity)
    )
  }

  private overwrite<V>(key: SchemaAnnotation<V>, value: V): SchemaAnnotationMap {
    return new SchemaAnnotationMap(HM.set_(this.map, key, value))
  }

  private update<V>(key: SchemaAnnotation<V>, f: (v: V) => V): SchemaAnnotationMap {
    return this.overwrite(key, f(this.get(key)))
  }

  annotate<V>(key: SchemaAnnotation<V>, value: V): SchemaAnnotationMap {
    return this.update(key, (v0) => key.combine(v0, value))
  }

  static empty: SchemaAnnotationMap = new SchemaAnnotationMap(HM.makeDefault())
}
