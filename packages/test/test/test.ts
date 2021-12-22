import { pipe } from '@principia/base/function'
import { nothing } from '@principia/base/Maybe'

import { assert, DefaultRunnableSpec, equalTo, suite, test } from '../src'
import { TestArgs } from '../src/TestArgs'

class X extends DefaultRunnableSpec {
  spec = suite(
    'test',
    test('a test', () => pipe('hello', assert(equalTo('no'))))
  )
}

new X().main(new TestArgs([], [], nothing()))
