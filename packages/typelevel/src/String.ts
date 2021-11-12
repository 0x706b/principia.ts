import type { Cast, Literal } from './Any'
import type { List, Pop } from './List'

type _Join<T extends List, D extends string> = T extends []
  ? ''
  : T extends [Literal]
  ? `${T[0]}`
  : T extends [Literal, ...infer R]
  ? `${T[0]}${D}${_Join<R, D>}`
  : string

export type Join<T extends List<Literal>, D extends string = ''> = _Join<T, D> extends infer X ? Cast<X, string> : never

type __Split<S extends string, D extends string, T extends string[] = []> = S extends `${infer BS}${D}${infer AS}`
  ? __Split<AS, D, [...T, BS]>
  : [...T, S]

type _Split<S extends string, D extends string = ''> = D extends '' ? Pop<__Split<S, D>> : __Split<S, D>

export type Split<S extends string, D extends string = ''> = _Split<S, D> extends infer X ? Cast<X, string[]> : never
