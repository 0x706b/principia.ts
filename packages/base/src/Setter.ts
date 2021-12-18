export interface PSetter<S, T, A, B> {
  readonly modify_: ModifyFn_<S, T, A, B>
  readonly modify: ModifyFn<S, T, A, B>
  readonly set_: SetFn_<S, T, B>
  readonly set: SetFn<S, T, B>
}

export interface PSetterMin<S, T, A, B> {
  readonly modify_: ModifyFn_<S, T, A, B>
  readonly set_: SetFn_<S, T, B>
}

export function PSetter<S, T, A, B>(_: PSetterMin<S, T, A, B>): PSetter<S, T, A, B> {
  return {
    modify_: _.modify_,
    modify: (f) => (s) => _.modify_(s, f),
    set_: _.set_,
    set: (b) => (s) => _.set_(s, b)
  }
}

export interface ModifyFn_<S, T, A, B> {
  (s: S, f: (a: A) => B): T
}

export interface ModifyFn<S, T, A, B> {
  (f: (a: A) => B): (s: S) => T
}

export interface SetFn_<S, T, B> {
  (s: S, b: B): T
}

export interface SetFn<S, T, B> {
  (b: B): (s: S) => T
}
