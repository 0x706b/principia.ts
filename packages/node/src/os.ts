import type { FSync, USync } from '@principia/base/Sync'

import * as Sy from '@principia/base/Sync'
import os from 'os'

export const arch = Sy.succeedLazy(os.arch)

export const cpus = Sy.succeedLazy(os.cpus)

export const endianness = Sy.succeedLazy(os.endianness)

export const freemem = Sy.succeedLazy(os.freemem)

export const homedir = Sy.succeedLazy(os.homedir)

export const hostname = Sy.succeedLazy(os.hostname)

export const loadavg = Sy.succeedLazy(os.loadavg)

export const networkInterfaces = Sy.succeedLazy(os.networkInterfaces)

export const platform = Sy.succeedLazy(os.platform)

export const release = Sy.succeedLazy(os.release)

export function setPriority(pid: number, priority: number): FSync<Error, void> {
  return Sy.tryCatch_(
    () => os.setPriority(pid, priority),
    (err) => err as Error
  )
}

export const tmpdir = Sy.succeedLazy(os.tmpdir)

export const type = Sy.succeedLazy(os.type)

export const uptime = Sy.succeedLazy(os.uptime)

export function userInfo(options: { encoding: 'buffer' }): USync<os.UserInfo<Buffer>>
export function userInfo(options?: { encoding: BufferEncoding }): USync<os.UserInfo<string>>
export function userInfo(options?: any): USync<os.UserInfo<string | Buffer>> {
  return Sy.succeedLazy(() => os.userInfo(options))
}

export const version = Sy.succeedLazy(os.version)

export { constants, EOL } from 'os'
