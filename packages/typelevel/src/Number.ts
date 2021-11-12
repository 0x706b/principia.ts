import type { Cast, Equals } from './Any'
import type { Or } from './Boolean'
import type { Iteration, IterationMap, IterationOf, Next, Pos, Prev } from './Iteration'

export type _IsNegative<N extends Iteration> = {
  '-': 1
  '+': 0
  '0': 0
}[N[1]]

export type IsNegative<N extends number> = _IsNegative<IterationOf<N>>

export type _IsPositive<N extends Iteration> = {
  '-': 0
  '+': 1
  '0': 0
}[N[1]]

export type IsPositive<N extends number> = _IsPositive<IterationOf<N>>

export type _IsZero<N extends Iteration> = {
  '-': 0
  '+': 0
  '0': 1
}[N[1]]

export type IsZero<N extends number> = _IsZero<IterationOf<N>>

export type _Negate<N extends Iteration> = IterationMap[N[4]]

export type Negate<N extends number> = N extends unknown ? _Negate<IterationOf<N>>[0] : never

export type _AddPositive<N1 extends Iteration, N2 extends Iteration> = {
  0: _AddPositive<Next<N1>, Prev<N2>>
  1: N1
  2: IterationOf<number>
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0]

export type AddPositive<N1 extends Iteration, N2 extends Iteration> = _AddPositive<N1, N2> extends infer X
  ? Cast<X, Iteration>
  : never

export type _AddNegative<N1 extends Iteration, N2 extends Iteration> = {
  0: _AddNegative<Prev<N1>, Next<N2>>
  1: N1
  2: IterationOf<number>
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0]

export type AddNegative<N1 extends Iteration, N2 extends Iteration> = _AddNegative<N1, N2> extends infer X
  ? Cast<X, Iteration>
  : never

export type _Add<N1 extends Iteration, N2 extends Iteration> = {
  0: AddPositive<N1, N2>
  1: AddNegative<N1, N2>
}[_IsNegative<N2>]

export type Add<N1 extends number, N2 extends number> = N1 extends unknown
  ? N2 extends unknown
    ? _Add<IterationOf<N1>, IterationOf<N2>>[0]
    : never
  : never

export type _Sub<N1 extends Iteration, N2 extends Iteration> = _Add<N1, _Negate<N2>>

export type Sub<N1 extends number, N2 extends number> = N1 extends unknown
  ? N2 extends unknown
    ? _Add<IterationOf<N1>, _Negate<IterationOf<N2>>>[0]
    : never
  : never

export type _Absolute<N extends Iteration> = {
  0: N
  1: _Negate<N>
}[_IsNegative<N>]

export type Absolute<N extends number> = N extends unknown ? _Absolute<IterationOf<N>> : never

export type _Greater<N1 extends Iteration, N2 extends Iteration> = _IsPositive<_Sub<N1, N2>>

export type Greater<X extends number, Y extends number> = X extends unknown
  ? Y extends unknown
    ? _Greater<IterationOf<X>, IterationOf<Y>>
    : never
  : never

export type _Lower<N1 extends Iteration, N2 extends Iteration> = _Greater<N2, N1>

export type Lower<X extends number, Y extends number> = X extends unknown
  ? Y extends unknown
    ? _Lower<IterationOf<X>, IterationOf<Y>>
    : never
  : never

export type _GreaterEq<N1 extends Iteration, N2 extends Iteration> = Or<Equals<N1, N2>, _Greater<N1, N2>>

export type GreaterEq<X extends number, Y extends number> = X extends unknown
  ? Y extends unknown
    ? _GreaterEq<IterationOf<X>, IterationOf<Y>>
    : never
  : never

export type _LowerEq<N1 extends Iteration, N2 extends Iteration> = Or<Equals<N1, N2>, _Lower<N1, N2>>

export type LowerEq<X extends number, Y extends number> = X extends unknown
  ? Y extends unknown
    ? _LowerEq<IterationOf<X>, IterationOf<Y>>
    : never
  : never

export type Comparison = '<' | '>' | '<=' | '>=' | '=='

export type _Comp<N1 extends Iteration, C extends Comparison, N2 extends Iteration> = {
  '<': _Lower<N1, N2>
  '>': _Greater<N1, N2>
  '<=': _LowerEq<N1, N2>
  '>=': _GreaterEq<N1, N2>
  '==': Equals<N1, N2>
}[C]

export type Comp<X extends number, C extends Comparison, Y extends number> = X extends unknown
  ? Y extends unknown
    ? _Comp<IterationOf<X>, C, IterationOf<Y>>
    : never
  : never
