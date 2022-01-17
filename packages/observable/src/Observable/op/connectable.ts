import type { SubjectLike } from '../../Subject'
import type { Subscription } from '../../Subscription'
import type { ObservableInput } from '../core'

import { Subject } from '../../Subject'
import { defer, from, Observable } from '../core'

export interface ConnectableLike<E, A> extends Observable<E, A> {
  connect(): Subscription
}

export interface ConnectableConfig<E, A> {
  readonly connector: () => SubjectLike<E, A>
  readonly resetOnDisconnect?: boolean
}

const DEFAULT_CONFIG: ConnectableConfig<any, any> = {
  connector: () => new Subject(),
  resetOnDisconnect: false
}

export class Connectable<E, A> extends Observable<E, A> implements ConnectableLike<E, A> {
  protected connection: Subscription | null
  protected connector: () => SubjectLike<E, A>
  protected resetOnDisconnect: boolean
  protected source: Observable<E, A>
  protected subject: SubjectLike<E, A>
  constructor(source: ObservableInput<E, A>, config: ConnectableConfig<E, A>) {
    const { connector, resetOnDisconnect = true } = config
    const subject = connector()
    super((subscriber) => {
      return subject.subscribe(subscriber)
    })
    this.connection        = null
    this.subject           = subject
    this.connector         = connector
    this.resetOnDisconnect = resetOnDisconnect
    this.source            = from(source)
  }
  connect() {
    if (!this.connection || this.connection.closed) {
      this.connection = defer(() => this.source).subscribe(this.subject)
      if (this.resetOnDisconnect) {
        this.connection.add(() => (this.subject = this.connector()))
      }
    }
    return this.connection
  }
}

export function connectable<E, A>(
  source: ObservableInput<E, A>,
  config: ConnectableConfig<E, A> = DEFAULT_CONFIG
): Connectable<E, A> {
  return new Connectable(source, config)
}
