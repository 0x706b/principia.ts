import type { FreeBooleanAlgebra } from './FreeBooleanAlgebra'

export class Succeeded {
  readonly _tag = 'Succeeded'
  constructor(readonly result: FreeBooleanAlgebra<void>) {}
}

export class Ignored {
  readonly _tag = 'Ignored'
}

export type TestSuccess = Succeeded | Ignored
