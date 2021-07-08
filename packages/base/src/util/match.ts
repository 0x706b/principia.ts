import type { Base, Infer, Kind, Param, URIS } from '../HKT'

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

type InferMatcherParam<
  URI extends URIS,
  C,
  P extends Param | 'A',
  K extends Record<string, (...args: any) => any>
> = Infer<
  URI,
  C,
  P,
  {
    [k in keyof K]: ReturnType<K[k]>
  }[keyof K]
>

type InferMatcherParamWithDefault<URI extends URIS, C, P extends Param | 'A', K, Ret> = Infer<
  URI,
  C,
  P,
  | {
      [k in keyof K]: K[k] extends (...args: any) => any ? ReturnType<K[k]> : never
    }[keyof K]
  | Ret
>

export function matchers<URI extends URIS, C>(_: Base<URI, C>) {
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
        ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      InferMatcherParam<URI, C, 'N', K>,
      InferMatcherParam<URI, C, 'K', K>,
      InferMatcherParam<URI, C, 'Q', K>,
      InferMatcherParam<URI, C, 'W', K>,
      InferMatcherParam<URI, C, 'X', K>,
      InferMatcherParam<URI, C, 'I', K>,
      InferMatcherParam<URI, C, 'S', K>,
      InferMatcherParam<URI, C, 'R', K>,
      InferMatcherParam<URI, C, 'E', K>,
      InferMatcherParam<URI, C, 'A', K>
    >
    <
      X extends {
        [tag in N]: string
      },
      K extends Partial<
        {
          [k in X[N]]: (
            _: Extract<
              X,
              {
                [tag in N]: k
              }
            >
          ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
        }
      >,
      Ret extends Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      InferMatcherParamWithDefault<URI, C, 'N', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'K', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'Q', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'W', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'X', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'I', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'S', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'R', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'E', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'A', K, Ret>
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
        ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      InferMatcherParam<URI, C, 'N', K>,
      InferMatcherParam<URI, C, 'K', K>,
      InferMatcherParam<URI, C, 'Q', K>,
      InferMatcherParam<URI, C, 'W', K>,
      InferMatcherParam<URI, C, 'X', K>,
      InferMatcherParam<URI, C, 'I', K>,
      InferMatcherParam<URI, C, 'S', K>,
      InferMatcherParam<URI, C, 'R', K>,
      InferMatcherParam<URI, C, 'E', K>,
      InferMatcherParam<URI, C, 'A', K>
    >
    <
      K extends Partial<
        {
          [k in X[N]]: (
            _: Extract<
              X,
              {
                [tag in N]: k
              }
            >
          ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
        }
      >,
      Ret extends Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      InferMatcherParamWithDefault<URI, C, 'N', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'K', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'Q', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'W', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'X', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'I', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'S', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'R', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'E', K, Ret>,
      InferMatcherParamWithDefault<URI, C, 'A', K, Ret>
    >
  } {
    return () => (...args: any[]) => {
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
