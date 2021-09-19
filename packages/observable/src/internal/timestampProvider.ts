export interface TimestampProvider {
  now(): number
}

export interface DateTimestampProvider extends TimestampProvider {
  delegate: TimestampProvider | undefined
}

export const dateTimestampProvider: DateTimestampProvider = {
  now() {
    return (dateTimestampProvider.delegate || Date).now()
  },
  delegate: undefined
}
