import '@principia/base/Operators'

import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import * as I from '@principia/base/IO'
import { None } from '@principia/base/Option'

import { assert, assertM, check, deepStrictEqualTo, endsWith, equalTo, suite, test, testM } from '../src'
import { DefaultRunnableSpec } from '../src/DefaultRunnableSpec'
import { Live } from '../src/environment/Live'
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
        I.effectAsync<unknown, never, string>((k) => {
          setTimeout(() => {
            k(I.succeed('hello'))
          }, 100)
        }),
        equalTo('hello')
      )
    )['@@'](nonFlaky),
    testM('check', () => check(Gen.int(0, 100), (n) => assert(n, equalTo(100)))),
    test('deepStrict', () => assert(E.Left('left'), deepStrictEqualTo(E.Left('left')))),
    test('large', () => assert({}, deepStrictEqualTo(bigObject)))
  )
}

new TestSpec().main({ tagSearchTerms: [], testSearchTerms: [], testTaskPolicy: None() })

export default new TestSpec()
