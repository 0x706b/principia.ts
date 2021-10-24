import type { DistributeMatchingUnions } from './DistributeUnions'

export type DeepExclude<A, B> = Exclude<DistributeMatchingUnions<A, B>, B>
