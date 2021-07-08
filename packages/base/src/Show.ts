import { memoize } from './function'

export interface Show<A> {
  readonly show: (a: A) => string
}

export function Show<A>(show: (a: A) => string): Show<A> {
  return { show }
}

export type TypeOf<S> = S extends Show<infer A> ? A : never

/*
 * -------------------------------------------------------------------------------------------------
 * primitives
 * -------------------------------------------------------------------------------------------------
 */

export const any: Show<any> = {
  show: (a) => JSON.stringify(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function named_<A>(show: Show<A>, name: string | undefined): Show<A> {
  return Show((a) => (typeof name !== 'undefined' ? `<${name}>(${show.show(a)})` : show.show(a)))
}

export function named(name: string | undefined): <A>(show: Show<A>) => Show<A> {
  return (show) => named_(show, name)
}

export function nullable<A>(or: Show<A>): Show<A | null> {
  return Show((a) => (a === null ? 'null' : or.show(a)))
}

export function undefinable<A>(or: Show<A>): Show<A | undefined> {
  return Show((a) => (typeof a === 'undefined' ? 'undefined' : or.show(a)))
}

export function lazy<A>(f: () => Show<A>): Show<A> {
  const get = memoize<void, Show<A>>(f)
  return Show((a) => get().show(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<A, B>(fa: Show<A>, f: (b: B) => A): Show<B> {
  return Show((b) => fa.show(f(b)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Show<A>) => Show<B> {
  return (fa) => contramap_(fa, f)
}

export { ShowURI } from './Modules'
