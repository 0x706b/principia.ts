import type * as O from './Object'

export type List<A = any> = ReadonlyArray<A>

export type Prepend<L extends List, A> = [A, ...L]

export type Append<L extends List, A> = [...L, A]

export type Concat<L1 extends List, L2 extends List> = [...L1, ...L2]

export type Length<L extends List> = L['length']

export type Head<L extends List> = L[0]

export type Tail<L extends List> = L extends readonly [] ? L : L extends readonly [any?, ...infer Tail] ? Tail : L

export type Init<L extends List> = L extends readonly [] ? L : L extends readonly [...infer Init, any?] ? Init : L

export type Last<L extends List> = L[Length<Tail<L>>]

export type UnionOf<L extends List> = L[number]

export type PrependAll<L extends List, A, O extends List = []> = Length<L> extends 0
  ? O
  : PrependAll<Tail<L>, A, [...O, A, Head<L>]>

export type Pop<L extends List> = L extends readonly [...infer LBody, any] | readonly [...infer LBody, any?] ? LBody : L

export type ObjectOf<L extends List> = L extends unknown
  ? number extends Length<L>
    ? O._Pick<L, number>
    : O._Omit<L, keyof any[]>
  : never

export type RequiredKeys<L extends List> = O.RequiredKeys<ObjectOf<L>>
