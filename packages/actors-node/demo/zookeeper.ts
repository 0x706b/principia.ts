import { pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/IO/Layer'
import * as M from '@principia/base/IO/Managed'
import { KeeperConfig, makeKeeperConfig } from '@principia/keeper'
import { GenericContainer } from 'testcontainers'

export const makeKeeperTestConfig = M.gen(function* (_) {
  const container = yield* _(
    pipe(
      T.fromPromiseHalt(() =>
        new GenericContainer('zookeeper:3.7.0').withEnv('ZOO_MY_ID', '1').withExposedPorts(2181).start()
      ),
      M.bracket((c) => T.fromPromiseHalt(() => c.stop()))
    )
  )

  return makeKeeperConfig({
    connectionString: `${container.getHost()}:${container.getMappedPort(2181)}`
  })
})

export const TestKeeperConfig = L.fromManaged(KeeperConfig)(makeKeeperTestConfig)
