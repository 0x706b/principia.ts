export interface Observer<E, A> {
  next: (value: A) => void
  error: (err: E) => void
  defect: (err: unknown) => void
  complete: () => void
}
