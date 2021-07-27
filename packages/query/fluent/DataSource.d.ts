import type { Either } from '@principia/base/Either'
import type { IO } from '@principia/base/IO'
import type { Described } from '@principia/query/Described'

declare module '@principia/query/DataSource' {
  interface DataSource<R, A> {
    /**
     * @rewrite applyAspect_ from "@principia/query/DataSource"
     */
    ['@@']<R, A, R1>(this: DataSource<R, A>, aspect: DataSourceAspect<R1>): DataSource<R & R1, A>
    /**
     * @rewrite batchN_ from "@principia/query/DataSource"
     */
    batchN<R, A>(this: DataSource<R, A>, n: number): DataSource<R, A>
    /**
     * @rewrite contramapIO_ from "@principia/query/DataSource"
     */
    contramapIO<R, A, R1, B>(this: DataSource<R, A>, f: Described<(b: B) => IO<R1, never, A>>): DataSource<R & R1, B>
    /**
     * @rewrite eitherWith_ from "@principia/query/DataSource"
     */
    eitherWith<R, A, R1, B, C>(
      this: DataSource<R, A>,
      that: DataSource<R1, B>,
      f: Described<(c: C) => Either<A, B>>
    ): DataSource<R & R1, C>
    /**
     * @rewrite equals from "@principia/query/DataSource"
     */
    equals(this: DataSource<any, any>, that: DataSource<any, any>): boolean
    /**
     * @rewrite gives_ from "@principia/query/DataSource"
     */
    gives<R, A, R0>(this: DataSource<R, A>, f: Described<(r0: R0) => R>): DataSource<R0, A>
    /**
     * @rewrite giveAll_ from "@principia/query/DataSource"
     */
    giveAll<R, A>(ds: DataSource<R, A>, r: Described<R>): DataSource<unknown, A>
    /**
     * @rewrite race_ from "@principia/query/DataSource"
     */
    race<R, A, R1, A1 extends A>(this: DataSource<R, A>, that: DataSource<R1, A1>): DataSource<R & R1, A1>
  }
}
