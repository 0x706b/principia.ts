import type { Iso } from './Iso'
import type { Lens } from './Lens'
import type { Optional } from './Optional'
import type { Prism } from './Prism'
import type { Traversal } from './Traversal'

export const IsoURI = 'optics/Iso'
export type IsoURI = typeof IsoURI

export const LensURI = 'optics/Lens'
export type LensURI = typeof LensURI

export const OptionalURI = 'optics/Optional'
export type OptionalURI = typeof OptionalURI

export const PrismURI = 'optics/Prism'
export type PrismURI = typeof PrismURI

export const TraversalURI = 'optics/Traversal'
export type TraversalURI = typeof TraversalURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [IsoURI]: Iso<I, A>
    [LensURI]: Lens<I, A>
    [OptionalURI]: Optional<I, A>
    [PrismURI]: Prism<I, A>
    [TraversalURI]: Traversal<I, A>
  }
}
