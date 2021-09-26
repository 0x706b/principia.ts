import { DoublyLinkedList } from './DoublyLinkedList'

export class Scheduler {
  isRunning = false
  tasks     = new DoublyLinkedList<() => void>()
  schedule(thunk: () => void) {
    this.tasks.add(thunk)
    if (!this.isRunning) {
      this.isRunning = true
      Promise.resolve().then(() => {
        while (this.tasks.length > 0) {
          this.tasks.shift()!()
        }
        this.isRunning = false
      })
    }
  }
}

export const defaultScheduler = new Scheduler()
