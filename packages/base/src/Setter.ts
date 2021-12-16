export interface PSetter<S, T, A, B> {
  readonly modify_: ModifyFn_<S, T, A, B>
  readonly modify: ModifyFn<S, T, A, B>
  readonly replace_: ReplaceFn_<S, T, B>
  readonly replace: ReplaceFn<S, T, B>
}

export interface PSetterMin<S, T, A, B> {
  readonly modify_: ModifyFn_<S, T, A, B>
  readonly replace_: ReplaceFn_<S, T, B>
}

export function PSetter<S, T, A, B>(_: PSetterMin<S, T, A, B>): PSetter<S, T, A, B> {
  return {
    modify_: _.modify_,
    modify: (f) => (s) => _.modify_(s, f),
    replace_: _.replace_,
    replace: (b) => (s) => _.replace_(s, b)
  }
}

export interface ModifyFn_<S, T, A, B> {
  (s: S, f: (a: A) => B): T
}

export interface ModifyFn<S, T, A, B> {
  (f: (a: A) => B): (s: S) => T
}

export interface ReplaceFn_<S, T, B> {
  (s: S, b: B): T
}

export interface ReplaceFn<S, T, B> {
  (b: B): (s: S) => T
}
