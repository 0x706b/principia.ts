import { DoublyLinkedList } from './DoublyLinkedList'

const microtask =
  typeof queueMicrotask !== 'undefined' ? queueMicrotask : (callback: () => void) => Promise.resolve().then(callback)

export class Scheduler {
  isRunning = false
  tasks     = new DoublyLinkedList<() => void>()
  schedule(thunk: () => void) {
    this.tasks.add(thunk)
    if (!this.isRunning) {
      this.isRunning = true
      microtask(() => {
        while (this.tasks.length > 0) {
          this.tasks.shift()!()
        }
        this.isRunning = false
      })
    }
  }
}

export const defaultScheduler = new Scheduler()
