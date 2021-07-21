export interface Observer<E, A> {
  next: (value: A) => void
  fail: (err: E) => void
  defect: (err: unknown) => void
  complete: () => void
}
