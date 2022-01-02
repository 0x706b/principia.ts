import { CaseClass } from '@principia/base/Case'
import * as b from 'benny'

class A {
  constructor(readonly a: string, readonly b: number, readonly c: boolean) {}
}

class ACase extends CaseClass<{ a: string, b: number, c: boolean }> {}

console.log(new ACase({ a: 'hello', b: 42, c: true }))

b.suite(
  'Case',
  b.add('new class', () => {
    const a = new A('hello', 42, true)
  }),
  b.add('new case', () => {
    const a = new ACase({ a: 'hello', b: 42, c: true })
  }),
  b.add('copy case', () => {
    const a = new ACase({ a: 'hello', b: 42, c: true })
    return () => {
      a.copy({ a: 'goodbye', c: false })
    }
  }),
  b.cycle(),
  b.complete()
)
