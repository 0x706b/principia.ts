import { ListBuffer } from '../collection/mutable/ListBuffer'

// const microtask =
//   typeof queueMicrotask !== 'undefined' ? queueMicrotask : (callback: () => void) => Promise.resolve().then(callback)

let isRunning = false
const tasks   = new ListBuffer<() => void>()

export const defaultScheduler: (thunk: () => void) => void = (thunk) => {
  tasks.append(thunk)
  if (!isRunning) {
    isRunning = true
    Promise.resolve().then(() => {
      while (tasks.length > 0) {
        tasks.unprepend()!()
      }
      isRunning = false
    })
  }
}
