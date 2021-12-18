import * as L from '../Lens'

/*
 * -------------------------------------------------------------------------------------------------
 * Lens
 * -------------------------------------------------------------------------------------------------
 */

function getComponentL<A extends ReadonlyArray<unknown>>(): <P extends keyof A>(prop: P) => L.Lens<A, A[P]> {
  return (prop) =>
    L.PLens({
      get: (s) => s[prop],
      set_: (s, ap) => {
        if (ap === s[prop]) {
          return s
        }
        const copy: A = s.slice() as any
        copy[prop]    = ap
        return copy
      }
    })
}

export function componentL_<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
  sa: L.Lens<S, A>,
  prop: P
): L.Lens<S, A[P]> {
  return L.andThen_(sa, getComponentL<A>()(prop))
}

/**
 * @dataFirst componentL_
 */
export function componentL<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: L.Lens<S, A>) => L.Lens<S, A[P]> {
  return (sa) => componentL_(sa, prop)
}
