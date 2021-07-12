import '@principia/base/Operators'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import * as I from '@principia/base/IO'
import * as O from '@principia/base/Option'

import { assert, assertM, check, deepStrictEqualTo, endsWith, equalTo, suite, test, testM } from '../src'
import { DefaultRunnableSpec } from '../src/DefaultRunnableSpec'
import * as Gen from '../src/Gen'
import { nonFlaky } from '../src/TestAspect'

const bigObject = {
  a: 'string',
  b: 1289379,
  c: {
    d: 'another string',
    e: true,
    f: [1, 2, 3, 4]
  }
}

class TestSpec extends DefaultRunnableSpec {
  spec = suite(
    'Suite',
    test('test1', () => assert(100, equalTo(100))),
    test('ignoreMe', () => assert(['a', 'b', 'c'], endsWith(['b', 'c'])))['@@'](nonFlaky),
    testM('testM1', () =>
      assertM(
        I.async<unknown, never, string>((k) => {
          setTimeout(() => {
            k(I.succeed('hello'))
          }, 100)
        }),
        equalTo('hello')
      )
    )['@@'](nonFlaky),
    testM('check', () => check(Gen.int({ min: 0, max: 100 }), (n) => assert(n, equalTo(100)))),
    test('deepStrict', () => assert(E.left('left'), deepStrictEqualTo(E.left('left')))),
    test('large', () => assert(A.range(0, 100), deepStrictEqualTo(bigObject)))
  )
}

new TestSpec().main({ tagSearchTerms: [], testSearchTerms: [], testTaskPolicy: O.none() })

export default new TestSpec()
