import type { SubjectLike } from '../../Subject'
import type { Observable, ObservableInput } from '../core'

import { operate_ } from '../../Operator'
import { Subject } from '../../Subject'
import { from, fromSubscribable } from '../core'

export interface ConnectConfig<E, A> {
  readonly connector: () => SubjectLike<E, A>
}

const DEFAULT_CONNECT_CONFIG: ConnectConfig<any, any> = {
  connector: () => new Subject()
}

export function connect_<E, A, E1, B>(
  fa: Observable<E, A>,
  selector: (shared: Observable<E, A>) => ObservableInput<E1, B>,
  config: ConnectConfig<E, A> = DEFAULT_CONNECT_CONFIG
): Observable<E | E1, B> {
  const { connector } = config
  return operate_(fa, (source, subscriber) => {
    const subject = connector()
    from(selector(fromSubscribable(subject))).subscribe(subscriber)
    subscriber.add(source.subscribe(subject))
  })
}

export function connect<E, A, E1, B>(
  selector: (shared: Observable<E, A>) => ObservableInput<E1, B>,
  config: ConnectConfig<E, A> = DEFAULT_CONNECT_CONFIG
): (fa: Observable<E, A>) => Observable<E | E1, B> {
  return (fa) => connect_(fa, selector, config)
}
