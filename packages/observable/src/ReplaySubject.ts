import type { Subscriber } from './Subscriber'
import type { Subscription } from './Subscription'

import { dateTimestampProvider } from './internal/timestampProvider'
import { Subject } from './Subject'

export class ReplaySubject<E, A> extends Subject<E, A> {
  private _buffer: (A | number)[] = []
  private _infiniteTimeWindow     = true

  constructor(
    private _bufferSize = Infinity,
    private _windowTime = Infinity,
    private _timestampProvider = dateTimestampProvider
  ) {
    super()
    this._infiniteTimeWindow = _windowTime === Infinity
    this._bufferSize         = Math.max(1, _bufferSize)
    this._windowTime         = Math.max(1, _windowTime)
  }

  next(value: A): void {
    const { isStopped, _buffer, _infiniteTimeWindow, _timestampProvider, _windowTime } = this
    if (!isStopped) {
      _buffer.push(value)
      !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime)
    }
    this._trimBuffer()
    super.next(value)
  }

  protected subscribeInternal(subscriber: Subscriber<E, A>): Subscription {
    this.throwIfClosed()
    this._trimBuffer()

    const subscription = this.innerSubscribe(subscriber)

    const { _infiniteTimeWindow, _buffer } = this

    const copy = _buffer.slice()

    for (let i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
      subscriber.next(copy[i] as A)
    }

    this.checkFinalizedStatuses(subscriber)

    return subscription
  }

  private _trimBuffer() {
    const { _bufferSize, _timestampProvider, _buffer, _infiniteTimeWindow } = this

    const adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize
    _bufferSize < Infinity &&
      adjustedBufferSize < _buffer.length &&
      _buffer.splice(0, _buffer.length - adjustedBufferSize)

    if (!_infiniteTimeWindow) {
      const now = _timestampProvider.now()
      let last  = 0
      for (let i = 1; i < _buffer.length && (_buffer[i] as number) <= now; i += 2) {
        last = i
      }
      last && _buffer.splice(0, last + 1)
    }
  }
}
