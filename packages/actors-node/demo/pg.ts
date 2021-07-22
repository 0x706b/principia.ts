import { pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
import { makePGConfig, PGConfig } from '@principia/pg'
import { GenericContainer } from 'testcontainers'

export const makeTestPG = M.gen(function* (_) {
  const container = yield* _(
    pipe(
      T.fromPromiseHalt(() =>
        new GenericContainer('postgres:alpine')
          .withEnv('POSTGRES_USER', 'user')
          .withEnv('POSTGRES_PASSWORD', 'pass')
          .withEnv('POSTGRES_DB', 'db')
          .withExposedPorts(5432)
          .start()
      ),
      M.bracket((c) => T.fromPromiseHalt(() => c.stop()))
    )
  )

  return makePGConfig({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: 'user',
    password: 'pass',
    database: 'db'
  })
})

export const TestPG = L.fromManaged(PGConfig)(makeTestPG)
