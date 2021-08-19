import * as C from '@principia/base/Cause'
import * as St from '@principia/base/Structural'
import { assert_, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

class CauseSpec extends DefaultRunnableSpec {
  spec = suite(
    'Cause',
    test('equals', () =>
      assert_(C.empty, equalTo(C.empty))
        ['&&'](assert_(C.then(C.empty, C.both(C.empty, C.empty)), equalTo(C.empty)))
        ['&&'](assert_(C.then(C.fail('ok'), C.both(C.empty, C.empty)), equalTo(C.fail('ok'))))
        ['&&'](assert_(St.hash(C.then(C.fail('ok'), C.both(C.empty, C.empty))), equalTo(St.hash(C.fail('ok')))))
        ['&&'](
          assert_(C.then(C.fail('ok'), C.both(C.empty, C.halt('ok'))), equalTo(C.then(C.fail('ok'), C.halt('ok'))))
        )
        ['&&'](
          assert_(
            St.hash(C.then(C.fail('ok'), C.both(C.empty, C.halt('ok')))),
            equalTo(St.hash(C.then(C.fail('ok'), C.halt('ok'))))
          )
        )
        ['&&'](
          assert_(
            C.then(C.fail('ok'), C.both(C.fail('ok'), C.halt('ok'))),
            equalTo(C.then(C.fail('ok'), C.both(C.fail('ok'), C.halt('ok'))))
          )
        )
        ['&&'](
          assert_(
            St.hash(C.then(C.fail('ok'), C.both(C.fail('ok'), C.halt('ok')))),
            equalTo(St.hash(C.then(C.fail('ok'), C.both(C.fail('ok'), C.halt('ok')))))
          )
        ))
  )
}

export default new CauseSpec()
