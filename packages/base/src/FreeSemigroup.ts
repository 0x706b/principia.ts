import * as Ev from './Eval'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Element<A> {
  readonly _tag: 'Element'
  readonly value: A
}

export interface Combine<A> {
  readonly _tag: 'Combine'
  readonly left: FreeSemigroup<A>
  readonly right: FreeSemigroup<A>
}

export type FreeSemigroup<A> = Element<A> | Combine<A>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function Combine<A>(left: FreeSemigroup<A>, right: FreeSemigroup<A>): FreeSemigroup<A> {
  return {
    _tag: 'Combine',
    left,
    right
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function Element<A>(a: A): FreeSemigroup<A> {
  return {
    _tag: 'Element',
    value: a
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

function foldSafe_<A, B>(
  fs: FreeSemigroup<A>,
  onElement: (value: A) => B,
  onCombine: (left: B, right: B) => B
): Ev.Eval<B> {
  return Ev.defer(() => {
    switch (fs._tag) {
      case 'Element': {
        return Ev.now(onElement(fs.value))
      }
      case 'Combine': {
        return Ev.crossWith_(
          foldSafe_(fs.left, onElement, onCombine),
          foldSafe_(fs.right, onElement, onCombine),
          onCombine
        )
      }
    }
  })
}

export function fold_<A, B>(fs: FreeSemigroup<A>, onElement: (value: A) => B, onCombine: (left: B, right: B) => B): B {
  return foldSafe_(fs, onElement, onCombine).value
}

export function fold<A, B>(
  onElement: (value: A) => B,
  onCombine: (left: B, right: B) => B
): (fs: FreeSemigroup<A>) => B {
  return (fs) => fold_(fs, onElement, onCombine)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<A = never>(): P.Semigroup<FreeSemigroup<A>> {
  return P.Semigroup(Combine)
}
