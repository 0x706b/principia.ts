import type { HKT, Infer, Kind, ParamName, Typeclass } from '../HKT'

export const pattern_: <N extends string>(
  n: N
) => {
  <X extends { [k in N]: string }, K extends { [k in X[N]]: (_: Extract<X, { [_tag in N]: k }>) => any }>(
    m: X,
    _: K
  ): ReturnType<K[keyof K]>
  <X extends { [k in N]: string }, K extends { [k in X[N]]?: (_: Extract<X, { [_tag in N]: k }>) => any }, H>(
    m: X,
    _: K,
    __: (_: Exclude<X, { _tag: keyof K }>) => H
  ): { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) =>
  ((m: any, _: any, d: any) => {
    return (_[m[n]] ? _[m[n]](m) : d(m)) as any
  }) as any

export const pattern: <N extends string>(
  n: N
) => {
  <X extends { [k in N]: string }, K extends { [k in X[N]]: (_: Extract<X, { [_tag in N]: k }>) => any }>(_: K): (
    m: X
  ) => ReturnType<K[keyof K]>
  <X extends { [k in N]: string }, K extends { [k in X[N]]?: (_: Extract<X, { [_tag in N]: k }>) => any }, H>(
    _: K,
    __: (_: Exclude<X, { _tag: keyof K }>) => H
  ): (m: X) => { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) =>
  ((_: any, d: any) => (m: any) => {
    return (_[m[n]] ? _[m[n]](m) : d(m)) as any
  }) as any

export const matchTag_ = pattern_('_tag')

export const matchTag = pattern('_tag')

type InferMatcherParam<F extends HKT, C, P extends ParamName, K extends Record<string, (...args: any) => any>> = Infer<
  F,
  C,
  P,
  {
    [k in keyof K]: ReturnType<K[k]>
  }[keyof K]
>

type InferMatcherParamWithDefault<F extends HKT, C, P extends ParamName | 'A', K, Ret> = Infer<
  F,
  C,
  P,
  | {
      [k in keyof K]: K[k] extends (...args: any) => any ? ReturnType<K[k]> : never
    }[keyof K]
  | Ret
>

export function matchers<F extends HKT, C>(_: Typeclass<F, C>) {
  function match<N extends string>(
    tag: N
  ): {
    <
      X extends {
        [tag in N]: string
      },
      K extends {
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<F, C, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      F,
      C,
      InferMatcherParam<F, C, 'K', K>,
      InferMatcherParam<F, C, 'Q', K>,
      InferMatcherParam<F, C, 'W', K>,
      InferMatcherParam<F, C, 'X', K>,
      InferMatcherParam<F, C, 'I', K>,
      InferMatcherParam<F, C, 'S', K>,
      InferMatcherParam<F, C, 'R', K>,
      InferMatcherParam<F, C, 'E', K>,
      InferMatcherParam<F, C, 'A', K>
    >
    <
      X extends {
        [tag in N]: string
      },
      K extends Partial<{
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<F, C, any, any, any, any, any, any, any, any, any>
      }>,
      Ret extends Kind<F, C, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      F,
      C,
      InferMatcherParamWithDefault<F, C, 'K', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'Q', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'W', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'X', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'I', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'S', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'R', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'E', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'A', K, Ret>
    >
  } {
    return (...args: any[]) => {
      return (_: any) => {
        const matcher = args[0][_[tag]]
        return matcher ? matcher(_) : args[1](_)
      }
    }
  }

  function matchIn<N extends string>(
    tag: N
  ): <
    X extends {
      [tag in N]: string
    }
  >() => {
    <
      K extends {
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<F, C, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      F,
      C,
      InferMatcherParam<F, C, 'K', K>,
      InferMatcherParam<F, C, 'Q', K>,
      InferMatcherParam<F, C, 'W', K>,
      InferMatcherParam<F, C, 'X', K>,
      InferMatcherParam<F, C, 'I', K>,
      InferMatcherParam<F, C, 'S', K>,
      InferMatcherParam<F, C, 'R', K>,
      InferMatcherParam<F, C, 'E', K>,
      InferMatcherParam<F, C, 'A', K>
    >
    <
      K extends Partial<{
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<F, C, any, any, any, any, any, any, any, any, any>
      }>,
      Ret extends Kind<F, C, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      F,
      C,
      InferMatcherParamWithDefault<F, C, 'K', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'Q', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'W', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'X', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'I', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'S', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'R', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'E', K, Ret>,
      InferMatcherParamWithDefault<F, C, 'A', K, Ret>
    >
  } {
    return () =>
      (...args: any[]) => {
        return (_: any) => {
          const matcher = args[0][_[tag]]
          return matcher ? matcher(_) : args[1](_)
        }
      }
  }

  const matchTagIn = matchIn('_tag')

  const matchTag = match('_tag')

  return {
    match,
    matchTag,
    matchIn,
    matchTagIn
  }
}
