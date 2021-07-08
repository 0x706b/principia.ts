// tracing: off

import type { Has } from '../../Has'
import type { Option } from '../../Option'
import type { Promise } from '../../Promise'
import type { FIO, IO, UIO, URIO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { Clock } from '../../Clock'
import { RuntimeException } from '../../Exception'
import { pipe } from '../../function'
import * as O from '../../Option'
import * as P from '../../Promise'
import * as RefM from '../../RefM'
import { tuple } from '../../tuple'
import * as I from '../core'
import { fulfill } from './fulfill'
import { uninterruptibleMask } from './interrupt'

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @trace call
 */
export function cachedInvalidate_<R, E, A>(
  ma: IO<R, E, A>,
  timeToLive: number
): URIO<R & Has<Clock>, readonly [FIO<E, A>, UIO<void>]> {
  const trace = accessCallTrace()
  return I.gen(function* (_) {
    const r     = yield* _(I.ask<R & Has<Clock>>())
    const cache = yield* _(RefM.make<Option<readonly [number, Promise<E, A>]>>(O.none()))
    return yield* _(traceCall(I.succeed, trace)(tuple(I.giveAll_(_get(ma, timeToLive, cache), r), _invalidate(cache))))
  })
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @dataFirst cachedInvalidate_
 * @trace call
 */
export function cachedInvalidate(
  timeToLive: number
): <R, E, A>(ma: IO<R, E, A>) => URIO<R & Has<Clock>, readonly [FIO<E, A>, UIO<void>]> {
  return (ma) => cachedInvalidate_(ma, timeToLive)
}

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function cached_<R, E, A>(ma: IO<R, E, A>, timeToLive: number): URIO<R & Has<Clock>, FIO<E, A>> {
  const trace = accessCallTrace()
  return I.map_(
    cachedInvalidate_(ma, timeToLive),
    traceFrom(trace, ([_]) => _)
  )
}

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function cached(timeToLive: number): <R, E, A>(ma: I.IO<R, E, A>) => URIO<R & Has<Clock>, FIO<E, A>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(cached_, trace)(ma, timeToLive)
}

function _compute<R, E, A>(fa: IO<R, E, A>, ttl: number, start: number) {
  return I.gen(function* (_) {
    const p = yield* _(P.make<E, A>())
    yield* _(fulfill(p)(fa))
    return O.some(tuple(start + ttl, p))
  })
}

/**
 * @trace call
 */
function _get<R, E, A>(fa: IO<R, E, A>, ttl: number, cache: RefM.URefM<Option<readonly [number, Promise<E, A>]>>) {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Clock.currentTime,
      I.chain((time) =>
        pipe(
          cache,
          RefM.updateSomeAndGetIO((o) =>
            pipe(
              o,
              O.match(
                () => O.some(_compute(fa, ttl, time)),
                ([end]) =>
                  end - time <= 0
                    ? O.some(_compute(fa, ttl, time))
                    : O.none<IO<R, never, Option<readonly [number, P.Promise<E, A>]>>>()
              )
            )
          ),
          I.chain((a) => (a._tag === 'None' ? I.die(new RuntimeException('bug')) : restore(P.await(a.value[1]))))
        )
      )
    )
  )
}

function _invalidate<E, A>(cache: RefM.URefM<Option<readonly [number, Promise<E, A>]>>): UIO<void> {
  return cache.set(O.none())
}
