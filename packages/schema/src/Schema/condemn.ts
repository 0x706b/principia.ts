import type { Parse } from '../internal/Parse'
import type { Predicate } from '@principia/base/Predicate'

import { CaseClass } from '@principia/base/Case'
import { flow } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Th from '@principia/base/These'

import * as PE from '../ParseError'

export function condemn<I, E, A>(parse: Parse<I, E, A>): Parse<I, E, A> {
  return flow(parse, Th.condemn)
}

export function condemnWhen_<I, E, A>(
  parse: Parse<I, PE.ParseError<E>, A>,
  predicate: Predicate<E>
): Parse<I, PE.ParseError<E>, A> {
  return flow(
    parse,
    Th.match(Th.left, Th.right, (e, a) => (PE.some_(e, predicate) ? Th.left(e) : Th.both(e, a)))
  )
}

export function condemnWhen<E>(
  predicate: Predicate<E>
): <I, A>(parse: Parse<I, PE.ParseError<E>, A>) => Parse<I, PE.ParseError<E>, A> {
  return (parse) => condemnWhen_(parse, predicate)
}

export function condemnM<I, E, A>(parse: Parse<I, E, A>): (i: I) => I.FIO<E, A> {
  return flow(
    parse,
    Th.match(I.fail, I.succeed, (e, _) => I.fail(e))
  )
}

export function condemnWhenIO_<I, E, A>(
  parse: Parse<I, PE.ParseError<E>, A>,
  predicate: Predicate<E>
): (i: I) => I.FIO<PE.ParseError<E>, A> {
  return flow(
    parse,
    Th.match(I.fail, I.succeed, (e, a) => (PE.some_(e, predicate) ? I.fail(e) : I.succeed(a)))
  )
}

export function condemnWhenIO<E>(
  predicate: Predicate<E>
): <I, A>(parse: Parse<I, PE.ParseError<E>, A>) => (i: I) => I.FIO<PE.ParseError<E>, A> {
  return (parse) => condemnWhenIO_(parse, predicate)
}

export class CondemnException extends CaseClass<{ readonly message: string }> {
  readonly _tag = 'CondemnException'
  toString() {
    return this.message
  }
}

export function condemnException<I, A>(parse: Parse<I, PE.AnyDefaultError, A>): (i: I) => I.FIO<CondemnException, A> {
  return flow(
    parse,
    Th.match(
      (e) => I.fail(new CondemnException({ message: PE.drawError(e) })),
      I.succeed,
      (e, _) => I.fail(new CondemnException({ message: PE.drawError(e) }))
    )
  )
}

export function condemnExceptionWhen_<I, E extends PE.HasDefaultLeafE, A>(
  parse: Parse<I, PE.ParseError<E>, A>,
  predicate: Predicate<E>
): (i: I) => I.FIO<CondemnException, A> {
  return flow(
    parse,
    Th.match(
      (e) => I.fail(new CondemnException({ message: PE.drawError(e) })),
      I.succeed,
      (e, a) => (PE.some_(e, predicate) ? I.fail(new CondemnException({ message: PE.drawError(e) })) : I.succeed(a))
    )
  )
}

export function condemnExceptionWhen<E extends PE.HasDefaultLeafE>(
  predicate: Predicate<E>
): <I, A>(parse: Parse<I, PE.ParseError<E>, A>) => (i: I) => I.FIO<CondemnException, A> {
  return (parse) => condemnExceptionWhen_(parse, predicate)
}

export function condemnDie<I, A>(parse: Parse<I, PE.AnyDefaultError, A>): (i: I) => I.FIO<never, A> {
  return flow(condemnException(parse), I.orDie)
}

export function condemnDieWhen_<I, E extends PE.HasDefaultLeafE, A>(
  parse: Parse<I, PE.ParseError<E>, A>,
  predicate: Predicate<E>
): (i: I) => I.FIO<never, A> {
  return flow(condemnExceptionWhen_(parse, predicate), I.orDie)
}

export function condemnDieWhen<E extends PE.HasDefaultLeafE>(
  predicate: Predicate<E>
): <I, A>(parse: Parse<I, PE.ParseError<E>, A>) => (i: I) => I.FIO<never, A> {
  return (parse) => condemnDieWhen_(parse, predicate)
}
