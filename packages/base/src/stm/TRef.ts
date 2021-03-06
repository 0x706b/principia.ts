import type { HashMap } from '../collection/immutable/HashMap'
import type * as T from '../IO'
import type { Entry } from './Entry'
import type { Journal, Todo } from './Journal'
import type { TxnId } from './TxnId'

import * as E from '../Either'
import { identity } from '../function'
import { AtomicReference } from '../internal/AtomicReference'
import * as M from '../Maybe'
import * as En from './Entry'
import { emptyTodoMap } from './Journal'
import * as STM from './STM/core'
import * as _ from './STM/primitives'
import { Versioned } from './Versioned'

export const TRefTypeId = Symbol.for('@principia/base/stm/TRef')
export type TRefTypeId = typeof TRefTypeId

/**
 * A `TRef<EA, EB, A, B>` is a polymorphic, purely functional description of a
 * mutable reference that can be modified as part of a transactional effect. The
 * fundamental operations of a `TRef` are `set` and `get`. `set` takes a value
 * of type `A` and transactionally sets the reference to a new value, potentially
 * failing with an error of type `EA`. `get` gets the current value of the reference
 * and returns a value of type `B`, potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `TRef` are unified, that is, it is a
 * `TRef<E, E, A, A>`, the `TRef` also supports atomic `modify` and `update`
 * operations. All operations are guaranteed to be executed transactionally.
 *
 * NOTE: While `TRef` provides the transactional equivalent of a mutable reference,
 * the value inside the `TRef` should be immutable.
 */
export interface TRef<EA, EB, A, B> {
  readonly [TRefTypeId]: TRefTypeId
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D>

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D>

  readonly atomic: Atomic<unknown>
}

export interface UTRef<A> extends TRef<never, never, A, A> {}
export interface ETRef<E, A> extends TRef<E, E, A, A> {}

export class Atomic<A> implements TRef<never, never, A, A> {
  readonly [TRefTypeId]: TRefTypeId = TRefTypeId
  readonly _tag                     = 'Atomic'
  readonly _EA!: () => never
  readonly _EB!: () => never
  readonly _A!: (_: A) => void
  readonly _B!: () => A
  readonly atomic: Atomic<unknown> = this as Atomic<unknown>

  constructor(public versioned: Versioned<A>, readonly todo: AtomicReference<HashMap<TxnId, Todo>>) {}

  fold<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: A) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new Derived(bd, ca, this, this.atomic)
  }

  foldAll<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    _ec: (ea: never) => EC,
    ca: (c: C) => (b: A) => E.Either<EC, A>,
    bd: (b: A) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new DerivedAll(bd, ca, this, this.atomic)
  }
}

export class Derived<S, EA, EB, A, B> implements TRef<EA, EB, A, B> {
  readonly [TRefTypeId]: TRefTypeId = TRefTypeId
  readonly _tag                     = 'Derived'
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => E.Either<EA, S>,
    readonly value: Atomic<S>,
    readonly atomic: Atomic<unknown>
  ) {}

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new Derived(
      (s) => E.match_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => E.chain_(ca(c), (a) => E.match_(this.setEither(a), (e) => E.left(ea(e)), E.right)),
      this.value,
      this.atomic
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.match_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(
          E.match_(this.getEither(s), (e) => E.left(ec(e)), ca(c)),
          (a) => E.match_(this.setEither(a), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }
}

export class DerivedAll<S, EA, EB, A, B> implements TRef<EA, EB, A, B> {
  readonly [TRefTypeId]: TRefTypeId = TRefTypeId
  readonly _tag                     = 'DerivedAll'
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => (s: S) => E.Either<EA, S>,
    readonly value: Atomic<S>,
    readonly atomic: Atomic<unknown>
  ) {}

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.match_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) => E.chain_(ca(c), (a) => E.match_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right)),
      this.value,
      this.atomic
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): TRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.match_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(
          E.match_(this.getEither(s), (e) => E.left(ec(e)), ca(c)),
          (a) => E.match_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }
}

function getOrMakeEntry<A>(self: Atomic<A>, journal: Journal): Entry {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = En.make(self, false)
  journal.set(self, entry)
  return entry
}

/**
 * Retrieves the value of the `TRef`.
 */
export function get<EA, EB, A, B>(self: TRef<EA, EB, A, B>): _.STM<unknown, EB, B> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        return entry.use((_) => _.unsafeGet<B>())
      })
    }
    case 'Derived': {
      return STM.chain_(get(self.value), (s) => E.match_(self.getEither(s), STM.fail, STM.succeed))
    }
    case 'DerivedAll': {
      return STM.chain_(get(self.value), (s) => E.match_(self.getEither(s), STM.fail, STM.succeed))
    }
  }
}

/**
 * Unsafely retrieves the value of the `TRef`.
 */
export function unsafeGet_<EA, EB, A, B>(self: TRef<EA, EB, A, B>, journal: Journal): A {
  return getOrMakeEntry(self.atomic, journal).use((entry) => entry.unsafeGet<A>())
}

/**
 * Sets the value of the `TRef`.
 */
export function set_<EA, EB, A, B>(self: TRef<EA, EB, A, B>, a: A): _.STM<unknown, EA, void> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        return entry.use((_) => _.unsafeSet(a))
      })
    }
    case 'Derived': {
      return E.match_(self.setEither(a), STM.fail, (s) => set_(self.value, s))
    }
    case 'DerivedAll': {
      return STM.subsumeEither(
        modify_(self.value, (s) =>
          E.match_(
            self.setEither(a)(s),
            (e) => [E.left(e), s],
            (s) => [E.right(undefined), s]
          )
        )
      )
    }
  }
}

export function unsafeSet_<EA, EB, A, B>(tr: TRef<EA, EB, A, B>, journal: Journal, a: A): void {
  return getOrMakeEntry(tr.atomic, journal).use((entry) => entry.unsafeSet(a))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 */
export function modify_<E, A, B>(self: ETRef<E, A>, f: (a: A) => readonly [B, A]): _.STM<unknown, E, B> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry                = getOrMakeEntry(self, journal)
        const oldValue             = entry.use((_) => _.unsafeGet<A>())
        const [retValue, newValue] = f(oldValue)
        entry.use((_) => _.unsafeSet(newValue))
        return retValue
      })
    }
    case 'Derived': {
      return STM.subsumeEither(
        modify_(self.value, (s) =>
          E.match_(
            self.getEither(s),
            (e) => [E.left<E, B>(e), s],
            (a1) => {
              const [b, a2] = f(a1)
              return E.match_(
                self.setEither(a2),
                (e) => [E.left(e), s],
                (s) => [E.right(b), s]
              )
            }
          )
        )
      )
    }
    case 'DerivedAll': {
      return STM.subsumeEither(
        modify_(self.value, (s) =>
          E.match_(
            self.getEither(s),
            (e) => [E.left<E, B>(e), s],
            (a1) => {
              const [b, a2] = f(a1)
              return E.match_(
                self.setEither(a2)(s),
                (e) => [E.left(e), s],
                (s) => [E.right(b), s]
              )
            }
          )
        )
      )
    }
  }
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @dataFirst modify_
 */
export function modify<A, B>(f: (a: A) => readonly [B, A]): <E>(self: ETRef<E, A>) => _.STM<unknown, E, B> {
  return (self) => modify_(self, f)
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 */
export function modifyJust_<E, A, B>(
  self: ETRef<E, A>,
  b: B,
  f: (a: A) => M.Maybe<readonly [B, A]>
): _.STM<unknown, E, B> {
  return modify_(self, (a) => M.match_(f(a), () => [b, a], identity))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @dataFirst modifyJust_
 */
export function modifyJust<A, B>(
  b: B,
  f: (a: A) => M.Maybe<readonly [B, A]>
): <E>(self: ETRef<E, A>) => _.STM<unknown, E, B> {
  return (self) => modifyJust_(self, b, f)
}

/**
 * Sets the value of the `TRef` and returns the old value.
 */
export function getAndSet_<EA, A>(self: ETRef<EA, A>, a: A): _.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry    = getOrMakeEntry(self, journal)
        const oldValue = entry.use((entry) => entry.unsafeGet<A>())
        entry.use((entry) => entry.unsafeSet(a))
        return oldValue
      })
    }
    default: {
      return modify_(self, (oldA) => [oldA, a])
    }
  }
}

/**
 * Sets the value of the `TRef` and returns the old value.
 *
 * @dataFirst getAndSet_
 */
export function getAndSet<A>(a: A): <EA>(self: ETRef<EA, A>) => _.STM<unknown, EA, A> {
  return (self) => getAndSet_(self, a)
}

/**
 * Updates the value of the variable and returns the old value.
 */
export function getAndUpdate_<EA, A>(self: ETRef<EA, A>, f: (a: A) => A): _.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry    = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        entry.use((_) => _.unsafeSet(f(oldValue)))
        return oldValue
      })
    }
    default: {
      return modify_(self, (_) => [_, f(_)])
    }
  }
}

/**
 * Updates the value of the variable and returns the old value.
 *
 * @dataFirst getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A): <EA>(self: ETRef<EA, A>) => _.STM<unknown, EA, A> {
  return (self) => getAndUpdate_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 */
export function getAndUpdateJust_<EA, A>(self: ETRef<EA, A>, f: (a: A) => M.Maybe<A>): _.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry    = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        const v        = f(oldValue)
        if (M.isJust(v)) {
          entry.use((_) => _.unsafeSet(v.value))
        }
        return oldValue
      })
    }
    default: {
      return modify_(self, (_) =>
        M.match_(
          f(_),
          () => [_, _],
          (v) => [_, v]
        )
      )
    }
  }
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @dataFirst getAndUpdateJust_
 */
export function getAndUpdateJust<A>(f: (a: A) => M.Maybe<A>): <EA>(self: ETRef<EA, A>) => _.STM<unknown, EA, A> {
  return (self) => getAndUpdateJust_(self, f)
}

/**
 * Sets the value of the `TRef`.
 *
 * @dataFirst set_
 */
export function set<A>(a: A): <EA, EB, B>(self: TRef<EA, EB, A, B>) => _.STM<unknown, EA, void> {
  return (self) => set_(self, a)
}

/**
 * Updates the value of the variable.
 */
export function update_<E, A>(self: ETRef<E, A>, f: (a: A) => A): _.STM<unknown, E, void> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry    = getOrMakeEntry(self, journal)
        const newValue = f(entry.use((_) => _.unsafeGet<A>()))
        entry.use((_) => _.unsafeSet(newValue))
      })
    }
    default:
      return modify_(self, (a) => [undefined, f(a)])
  }
}

/**
 * Updates the value of the variable.
 *
 * @dataFirst update_
 */
export function update<A>(f: (a: A) => A): <E>(self: ETRef<E, A>) => _.STM<unknown, E, void> {
  return (self) => update_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export function updateJust_<E, A>(self: ETRef<E, A>, f: (a: A) => M.Maybe<A>): _.STM<unknown, E, void> {
  return update_(self, (a) => M.match_(f(a), () => a, identity))
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @dataFirst updateJust_
 */
export function updateJust<A>(f: (a: A) => M.Maybe<A>): <E>(self: ETRef<E, A>) => _.STM<unknown, E, void> {
  return (self) => updateJust_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export function updateJustAndGet_<E, A>(self: ETRef<E, A>, f: (a: A) => M.Maybe<A>): _.STM<unknown, E, A> {
  return updateAndGet_(self, (a) => M.match_(f(a), () => a, identity))
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @dataFirst updateJustAndGet_
 */
export function updateJustAndGet<A>(f: (a: A) => M.Maybe<A>): <E>(self: ETRef<E, A>) => _.STM<unknown, E, A> {
  return (self) => updateJustAndGet_(self, f)
}

/**
 * Updates the value of the variable and returns the new value.
 */
export function updateAndGet_<EA, A>(self: ETRef<EA, A>, f: (a: A) => A): _.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case 'Atomic': {
      return new _.Effect((journal) => {
        const entry    = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        const x        = f(oldValue)
        entry.use((_) => _.unsafeSet(x))
        return x
      })
    }
    default: {
      return modify_(self, (_) => {
        const x = f(_)
        return [x, x]
      })
    }
  }
}

/**
 * Updates the value of the variable and returns the new value.
 *
 * @dataFirst getAndUpdate_
 */
export function updateAndGet<A>(f: (a: A) => A): <EA>(self: ETRef<EA, A>) => _.STM<unknown, EA, A> {
  return (self) => updateAndGet_(self, f)
}

/**
 * @optimize remove
 */
export function concrete<EA, EB, A, B>(
  _: TRef<EA, EB, A, B>
  // @ts-expect-error
): asserts _ is (Atomic<A> & Atomic<B>) | Derived<unknown, EA, EB, A, B> | DerivedAll<unknown, EA, EB, A, B> {
  //
}

/**
 * Makes a new `TRef` that is initialized to the specified value.
 */
export function makeWith<A>(a: () => A): _.STM<unknown, never, UTRef<A>> {
  return new _.Effect((journal) => {
    const value     = a()
    const versioned = new Versioned(value)
    const todo      = new AtomicReference(emptyTodoMap)
    const tref      = new Atomic(versioned, todo)
    journal.set(tref, En.make(tref, true))
    return tref
  })
}

/**
 * Makes a new `TRef` that is initialized to the specified value.
 */
export function make<A>(a: A): _.STM<unknown, never, UTRef<A>> {
  return new _.Effect((journal) => {
    const value     = a
    const versioned = new Versioned(value)
    const todo      = new AtomicReference(emptyTodoMap)
    const tref      = new Atomic(versioned, todo)
    journal.set(tref, En.make(tref, true))
    return tref
  })
}

/**
 * Unsafely makes a new `TRef` that is initialized to the specified value.
 */
export function unsafeMake<A>(a: A): UTRef<A> {
  const value     = a
  const versioned = new Versioned(value)
  const todo      = new AtomicReference(emptyTodoMap)
  return new Atomic(versioned, todo)
}

/**
 * Makes a new `TRef` that is initialized to the specified value.
 */
export function makeCommitWith<A>(a: () => A): T.UIO<UTRef<A>> {
  return STM.commit(makeWith(a))
}

/**
 * Makes a new `TRef` that is initialized to the specified value.
 */
export function makeCommit<A>(a: A): T.UIO<UTRef<A>> {
  return STM.commit(make(a))
}

/**
 * Folds over the error and value types of the `TRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `TRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C, D>(
  self: TRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): TRef<EC, ED, C, D> {
  return self.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `TRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `TRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 *
 * @dataFirst fold_
 */
export function fold<EA, EB, A, B, EC, ED, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): (self: TRef<EA, EB, A, B>) => TRef<EC, ED, C, D> {
  return (self) => fold_(self, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `TRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<EA, EB, A, B, EC, ED, C, D>(
  self: TRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): TRef<EC, ED, C, D> {
  return self.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `TRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @dataFirst foldAll_
 */
export function foldAll<EA, EB, A, B, EC, ED, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): (self: TRef<EA, EB, A, B>) => TRef<EC, ED, C, D> {
  return (self) => self.foldAll(ea, eb, ec, ca, bd)
}
