import type { Atomic } from './TRef'

import { Versioned } from './Versioned'

export const EntryTypeId = Symbol.for('@principia/base/stm/Entry')
export type EntryTypeId = typeof EntryTypeId

export class Entry {
  readonly [EntryTypeId]: EntryTypeId = EntryTypeId

  constructor(readonly use: <X>(f: <S>(entry: ConcreteEntry<S>) => X) => X) {}
}

export function make<A0>(tref0: Atomic<A0>, isNew0: boolean): Entry {
  const versioned = tref0.versioned
  const ops       = new ConcreteEntry<A0>(tref0, versioned, versioned.value, isNew0, false)
  return new Entry((f) => f(ops))
}

export const ConcreteEntryTypeId = Symbol.for('@principia/base/stm/ConcreteEntry')
export type ConcreteEntryTypeId = typeof ConcreteEntryTypeId

export class ConcreteEntry<S> {
  readonly [ConcreteEntryTypeId]: ConcreteEntryTypeId = ConcreteEntryTypeId

  protected newValue: S
  private _isChanged: boolean

  constructor(
    readonly tref: Atomic<S>,
    readonly expected: Versioned<S>,
    newValue: S,
    readonly isNew: boolean,
    isChanged: boolean
  ) {
    this.newValue   = newValue
    this._isChanged = isChanged
  }

  unsafeSet(value: unknown) {
    this._isChanged = true
    this.newValue   = value as S
  }

  unsafeGet<B>(): B {
    return this.newValue as unknown as B
  }

  commit() {
    this.tref.versioned = new Versioned(this.newValue)
  }

  copy(): Entry {
    const ops = new ConcreteEntry<S>(this.tref, this.expected, this.newValue, this.isNew, this.isChanged())
    return new Entry((f) => f(ops))
  }

  isInvalid() {
    return !this.isValid()
  }

  isValid() {
    return this.tref.versioned === this.expected
  }

  isChanged() {
    return this._isChanged
  }

  toString() {
    return `Entry(expected.value = ${this.expected.value}, newValue = ${this.newValue}, tref = ${
      this.tref
    }, isChanged = ${this.isChanged()})`
  }
}
