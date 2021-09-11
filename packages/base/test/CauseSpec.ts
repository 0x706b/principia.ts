import * as C from '@principia/base/Cause'
import { pipe } from '@principia/base/function'
import * as St from '@principia/base/Structural'
import { assert, assert_, check, DefaultRunnableSpec, equalTo, suite, test, testIO } from '@principia/test'
import * as Gen from '@principia/test/Gen'

const causes = Gen.cause(Gen.string(Gen.alphaNumericString()), Gen.alphaNumericString(), Gen.alphaNumericString())

class CauseSpec extends DefaultRunnableSpec {
  spec = suite(
    'Cause',
    suite(
      'Monad Laws',
      testIO('LeftIdentity', () => check(causes, (c) => pipe(c, C.chain(C.fail), assert(equalTo(c))))),
      testIO('RightIdentity', () =>
        check(causes, (c) =>
          pipe(
            c,
            C.map((a) => C.map_(C.unit(), () => a)),
            C.flatten,
            assert(equalTo(c))
          )
        )
      ),
      testIO('Associativity', () => {
        const afb = (s: string): C.GenericCause<string, number> => C.fail(s.length + 1)
        const bfc = (n: number): C.GenericCause<string, string> => C.fail(n.toString())
        return check(causes, (c) =>
          pipe(
            c,
            C.chain(afb),
            C.chain(bfc),
            assert(
              equalTo(
                pipe(
                  c,
                  C.chain((a) => C.chain_(afb(a), bfc))
                )
              )
            )
          )
        )
      })
    ),
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
