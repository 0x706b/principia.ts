declare module '@principia/query/DataSourceAspect' {
  interface DataSourceAspect<R> {
    /**
     * @rewrite compose_ from "@principia/query/DataSourceAspect"
     */
    ['>>>']<R, R1>(this: DataSourceAspect<R>, that: DataSourceAspect<R1>): DataSourceAspect<R & R1>
  }
}
