import { DoublyLinkedList } from './DoublyLinkedList'

// const microtask =
//   typeof queueMicrotask !== 'undefined' ? queueMicrotask : (callback: () => void) => Promise.resolve().then(callback)

let isRunning = false
const tasks   = new DoublyLinkedList<() => void>()

export const defaultScheduler: (thunk: () => void) => void = (thunk) => {
  tasks.add(thunk)
  if (!isRunning) {
    isRunning = true
    Promise.resolve().then(() => {
      while (tasks.length > 0) {
        tasks.shift()!()
      }
      isRunning = false
    })
  }
}
