/**
 * WARNING: Loading this module will perform a side-effect on the globals `Object`
 *
 * Global `pipe` and `flow` operators
 */

declare global {
  interface Object {
    ['|>']<A, B>(this: A, f: (a: A) => B): B
  }
}

let patched = false

const patch = () => {
  if (patched) {
    return
  }
  try {
    Object.defineProperty(Object.prototype, '|>', {
      value<A, B>(this: A, f: (a: A) => B): B {
        return f(this)
      },
      enumerable: false
    })
  } catch (e) {
    console.error(`Operator patching failed with ${e}`)
  }
  patched = true
}

patch()

export {}
