export const CachedGetter: PropertyDecorator = (target, key) => {
  const desc = Object.getOwnPropertyDescriptor(target, key)!
  if (!desc.get) {
    throw new Error('LazyGetter can only be applied to getters')
  }
  const originalGetter = desc.get

  // eslint-disable-next-line functional/immutable-data
  return Object.assign({}, desc, {
    get(this: any) {
      const x = originalGetter()
      Object.defineProperty(this, key, { value: x })
      return x
    }
  })
}
