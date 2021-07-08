import * as C from '@principia/base/Cause'
import * as St from '@principia/base/Structural'
import { assert, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

class CauseSpec extends DefaultRunnableSpec {
  spec = suite(
    'Cause',
    test('equals', () =>
      assert(C.empty, equalTo(C.empty))
        ['&&'](assert(C.then(C.empty, C.both(C.empty, C.empty)), equalTo(C.empty)))
        ['&&'](assert(C.then(C.fail('ok'), C.both(C.empty, C.empty)), equalTo(C.fail('ok'))))
        ['&&'](assert(St.hash(C.then(C.fail('ok'), C.both(C.empty, C.empty))), equalTo(St.hash(C.fail('ok')))))
        ['&&'](assert(C.then(C.fail('ok'), C.both(C.empty, C.die('ok'))), equalTo(C.then(C.fail('ok'), C.die('ok')))))
        ['&&'](
          assert(
            St.hash(C.then(C.fail('ok'), C.both(C.empty, C.die('ok')))),
            equalTo(St.hash(C.then(C.fail('ok'), C.die('ok'))))
          )
        )
        ['&&'](
          assert(
            C.then(C.fail('ok'), C.both(C.fail('ok'), C.die('ok'))),
            equalTo(C.then(C.fail('ok'), C.both(C.fail('ok'), C.die('ok'))))
          )
        )
        ['&&'](
          assert(
            St.hash(C.then(C.fail('ok'), C.both(C.fail('ok'), C.die('ok')))),
            equalTo(St.hash(C.then(C.fail('ok'), C.both(C.fail('ok'), C.die('ok')))))
          )
        ))
  )
}

export default new CauseSpec()
