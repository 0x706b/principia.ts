class Ask<A> {
  public readonly _tag = 'Ask'
  constructor(readonly msg: A) {}
}
export function ask<A>(msg: A): Command {
  return new Ask(msg)
}
class Tell<A> {
  public readonly _tag = 'Tell'
  constructor(readonly msg: A) {}
}
export function tell<A>(msg: A): Command {
  return new Tell(msg)
}
class Stop {
  public readonly _tag = 'Stop'
}
export function stop(): Command {
  return new Stop()
}

export type Command = Ask<any> | Tell<any> | Stop

export class Envelope {
  constructor(readonly command: Command, readonly recipient: string) {}
}
export function envelope(command: Command, recipient: string) {
  return new Envelope(command, recipient)
}
