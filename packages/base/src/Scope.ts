import type { Cause } from './Cause'
import type { Either } from './Either'
import type { UIO } from './IO/core'

import * as A from './Array/core'
import * as C from './Cause'
import * as E from './Either'
import * as I from './IO/core'
import { AtomicNumber } from './util/support/AtomicNumber'
import { AtomicReference } from './util/support/AtomicReference'

/**
 * Represents a key in a scope, which is associated with a single finalizer.
 */
export class Key {
  /**
   * Attempts to remove the finalizer associated with this key from the
   * scope. The returned effect will succeed with a boolean, which indicates
   * whether the attempt was successful. A value of `true` indicates the
   * finalizer will not be executed, while a value of `false` indicates the
   * finalizer was already executed
   */
  remove: UIO<boolean> = I.pure(false)
  constructor(remove?: UIO<boolean>) {
    if (remove) {
      this.remove = remove
    }
  }

  setRemove(remove: UIO<boolean>) {
    // eslint-disable-next-line functional/immutable-data
    this.remove = remove
  }
}

/**
 * Represent Common Ops between Global | Local<A>
 */
export abstract class CommonScope<A> {
  /**
   * Determines if the scope is closed at the instant the effect executes.
   * Returns an IO that will succeed with `true` if the scope is closed,
   * and `false` otherwise.
   */
  abstract get closed(): UIO<boolean>

  /**
   * Prevents a previously added finalizer from being executed when the scope
   * is closed. The returned effect will succeed with `true` if the finalizer
   * will not be run by this scope, and `false` otherwise.
   */
  deny(key: Key): UIO<boolean> {
    return I.succeed(this.unsafeDeny(key))
  }

  /**
   * Determines if the scope is empty (has no finalizers) at the instant the
   * effect executes. The returned effect will succeed with `true` if the scope
   * is empty, and `false` otherwise.
   */
  abstract get empty(): UIO<boolean>

  /**
   * Adds a finalizer to the scope. If successful, this ensures that when the
   * scope exits, the finalizer will be run
   *
   * The returned effect will succeed with a key ifthe finalizer was added
   * to the scope, and `None` if the scope is already closed.
   */
  abstract ensure(finalizer: (a: A) => UIO<any>): UIO<Either<A, Key>>

  /**
   * Extends the specified scope so that it will not be closed until this
   * scope is closed. Note that extending a scope into the global scope
   * will result in the scope *never* being closed!
   *
   * Scope extension does not result in changes to the scope contract: open
   * scopes must *always* be closed.
   */
  extend(that: Scope<any>): UIO<boolean> {
    return I.succeed(this.unsafeExtend(that))
  }

  /**
   * Determines if the scope is open at the moment the effect is executed.
   * Returns an IO that will succeed with `true` if the scope is open,
   * and `false` otherwise.
   */
  get open(): UIO<boolean> {
    return I.map_(this.closed, (_) => !_)
  }

  /**
   * Determines if the scope has been released at the moment the effect is
   * executed. A scope can be closed yet unreleased, if it has been
   * extended by another scope which is not yet released.
   */
  abstract get released(): UIO<boolean>

  abstract unsafeEnsure(finalizer: (_: A) => UIO<any>): Either<A, Key>
  abstract unsafeExtend(that: Scope<any>): boolean
  abstract unsafeDeny(key: Key): boolean
}

/**
 * A `Scope<A>` is a value that allows adding finalizers identified by a key.
 * Scopes are closed with a value of type `A`, which is provided to all the
 * finalizers when the scope is released.
 *
 * For safety reasons, this interface has no method to close a scope. Rather,
 * an open scope may be required with `makeScope`, which returns a function
 * that can close a scope. This allows scopes to be safely passed around
 * without fear they will be accidentally closed.
 */
export type Scope<A> = GlobalScope | LocalScope<A>

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export class GlobalScope extends CommonScope<never> {
  readonly _tag = 'Global'

  constructor() {
    super()
    this.deny         = this.deny.bind(this)
    this.ensure       = this.ensure.bind(this)
    this.extend       = this.extend.bind(this)
    this.unsafeEnsure = this.unsafeEnsure.bind(this)
    this.unsafeExtend = this.unsafeExtend.bind(this)
  }

  private unsafeEnsureResult = E.right(new Key(I.succeedLazy(() => true)))

  private ensureResult = I.succeedLazy(() => this.unsafeEnsureResult)

  get closed(): UIO<boolean> {
    return I.pure(false)
  }

  get empty(): UIO<boolean> {
    return I.pure(false)
  }

  ensure(_finalizer: (a: never) => UIO<any>): UIO<E.Either<never, Key>> {
    return this.ensureResult
  }

  get released(): UIO<boolean> {
    return I.pure(false)
  }

  unsafeEnsure(_finalizer: (_: never) => UIO<any>): E.Either<never, Key> {
    return this.unsafeEnsureResult
  }

  unsafeExtend(that: Scope<any>): boolean {
    switch (that._tag) {
      case 'Global':
        return true
      case 'Local':
        return that.unsafeAddRef()
    }
  }

  unsafeDeny() {
    return true
  }
}

export class OrderedFinalizer {
  constructor(readonly order: number, readonly finalizer: (_: any) => UIO<any>) {}
}

const noCause = C.empty

const noCauseIO: UIO<Cause<never>> = I.pure(noCause)

export class LocalScope<A> extends CommonScope<A> {
  readonly _tag = 'Local'

  constructor(
    readonly finalizerCount: AtomicNumber,
    readonly exitValue: AtomicReference<A | null>,
    readonly references: AtomicNumber,
    readonly finalizers: Map<Key, OrderedFinalizer>
  ) {
    super()
  }

  get closed(): UIO<boolean> {
    return I.succeedLazy(() => this.unsafeClosed)
  }

  get empty(): UIO<boolean> {
    return I.succeedLazy(() => this.finalizers.size === 0)
  }

  ensure(finalizer: (a: A) => UIO<any>): UIO<E.Either<A, Key>> {
    return I.succeedLazy(() => this.unsafeEnsure(finalizer))
  }

  get released(): UIO<boolean> {
    return I.succeedLazy(() => this.unsafeReleased())
  }

  unsafeExtend(that: Scope<any>): boolean {
    if (this === that) {
      return true
    }

    switch (that._tag) {
      case 'Global':
        return true
      case 'Local':
        if (this.unsafeClosed && that.unsafeClosed) {
          that.unsafeAddRef()
          this.unsafeEnsure((_) => that.release)
          return true
        } else {
          return false
        }
    }
  }

  get release(): UIO<boolean> {
    return I.defer(() => {
      const result = this.unsafeRelease()

      if (result != null) {
        return result
      } else {
        return I.pure(false)
      }
    })
  }

  unsafeReleased() {
    return this.references.get <= 0
  }

  unsafeEnsure(finalizer: (_: A) => UIO<any>): E.Either<A, Key> {
    if (this.unsafeClosed) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return E.left(this.exitValue.get!)
    }

    const key = new Key()
    key.setRemove(this.deny(key))

    this.finalizers.set(key, new OrderedFinalizer(this.finalizerCount.incrementAndGet(), finalizer))

    return E.right(key)
  }

  unsafeAddRef(): boolean {
    if (this.unsafeClosed) {
      return false
    }
    this.references.incrementAndGet()
    return true
  }

  get unsafeClosed() {
    return this.exitValue.get != null
  }

  unsafeDeny(key: Key) {
    if (this.unsafeClosed) {
      return false
    } else {
      return this.finalizers.delete(key)
    }
  }

  unsafeClose(a: A): UIO<any> | null {
    this.exitValue.compareAndSet(null, a)

    return this.unsafeRelease()
  }

  unsafeRelease(): UIO<any> | null {
    if (this.references.decrementAndGet() === 0) {
      const totalSize = this.finalizers.size

      if (totalSize === 0) {
        return null
      }

      const array = Array.from(this.finalizers.values())

      const sorted = array.sort((l, r) => (l == null ? -1 : r == null ? 1 : l.order - r.order))

      const a = this.exitValue.get

      return I.uncause(
        A.foldl_(sorted, noCauseIO, (acc, o) =>
          o != null ? I.crossWith_(acc, I.cause(o.finalizer(a)), (a, b) => C.then(a, b)) : acc
        )
      )
    } else {
      return null
    }
  }

  get unsafeEmpty() {
    return this.finalizers.size === 0
  }
}

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export const globalScope = new GlobalScope()

/**
 * A tuple that contains an open scope, together with a function that closes
 * the scope.
 */
export class Open<A> {
  constructor(readonly close: (_: A) => UIO<boolean>, readonly scope: LocalScope<A>) {}
}

export function unsafeMakeScope<A>(): Open<A> {
  const exitValue  = new AtomicReference<A | null>(null)
  const finalizers = new Map<Key, OrderedFinalizer>()
  const scope      = new LocalScope(new AtomicNumber(Number.MIN_SAFE_INTEGER), exitValue, new AtomicNumber(1), finalizers)

  return new Open<A>((a) => {
    return I.defer(() => {
      const result = scope.unsafeClose(a)

      if (result != null) {
        return I.map_(result, () => true)
      } else {
        return I.pure(false)
      }
    })
  }, scope)
}

export function makeScope<A>(): UIO<Open<A>> {
  return I.succeedLazy(() => unsafeMakeScope<A>())
}
