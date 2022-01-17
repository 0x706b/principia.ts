import type { RuntimeConfigFlag } from './RuntimeConfigFlag'

import * as HS from '../../collection/immutable/HashSet'

export class RuntimeConfigFlags {
  constructor(readonly flags: HS.HashSet<RuntimeConfigFlag>) {}

  static empty = new RuntimeConfigFlags(HS.makeDefault())

  add(flag: RuntimeConfigFlag) {
    return new RuntimeConfigFlags(HS.add_(this.flags, flag))
  }

  isEnabled(flag: RuntimeConfigFlag): boolean {
    return HS.has_(this.flags, flag)
  }
}
