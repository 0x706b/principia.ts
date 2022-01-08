import type { FiberId } from '../Fiber/FiberId'
import type { AtomicReference } from '../internal/AtomicReference'
import type { Entry } from './Entry'
import type { STM } from './STM/primitives'
import type { Atomic } from './TRef'
import type { TryCommit } from './TryCommit'
import type { TxnId } from './TxnId'

import * as HM from '../collection/immutable/HashMap'
import { defaultScheduler } from '../internal/Scheduler'
import * as I from '../IO'
import * as Ex from '../IO/Exit'
import * as CS from './State'
import { STMDriver } from './STM/driver'
import { FailTypeId, HaltTypeId, InterruptTypeId, RetryTypeId, SucceedTypeId } from './TExit'
import { Done, DoneTypeId, Suspend, SuspendTypeId } from './TryCommit'

export type Journal = Map<Atomic<any>, Entry>

export type Todo = () => unknown

/**
 * Creates a function that can reset the journal.
 */
export function prepareResetJournal(journal: Journal): () => unknown {
  const saved: Journal = new Map()
  for (const entry of journal) {
    saved.set(
      entry[0],
      entry[1].use((_) => _.copy())
    )
  }
  return () => {
    journal.clear()
    for (const entry of saved) {
      journal.set(entry[0], entry[1])
    }
  }
}

/**
 * Commits the journal.
 */
export function commitJournal(journal: Journal) {
  for (const entry of journal.values()) {
    entry.use((entry) => entry.commit())
  }
}

type Invalid = -1
const Invalid = -1
type ReadOnly = 0
const ReadOnly = 0
type ReadWrite = 1
const ReadWrite = 1

type JournalAnalysis = Invalid | ReadOnly | ReadWrite

/**
 * Analyzes the journal, determining whether it is valid and whether it is
 * read only in a single pass. Note that information on whether the
 * journal is read only will only be accurate if the journal is valid, due
 * to short-circuiting that occurs on an invalid journal.
 */
export function analyzeJournal(journal: Journal): JournalAnalysis {
  let result: JournalAnalysis = ReadOnly
  for (const entry of journal) {
    result = entry[1].use((entry) => (entry.isInvalid() ? Invalid : entry.isChanged() ? ReadWrite : result))
    if (result === Invalid) {
      return result
    }
  }
  return result
}

export const emptyTodoMap = HM.makeDefault<TxnId, Todo>()

/**
 * Atomically collects and clears all the todos from any `TRef` that
 * participated in the transaction.
 */
export function collectTodos(journal: Journal): Map<TxnId, Todo> {
  const allTodos: Map<TxnId, Todo> = new Map()

  for (const entry of journal) {
    const tref: Atomic<unknown> = entry[1].use((entry) => entry.tref as Atomic<unknown>)
    const todos                 = tref.todo.get
    for (const todo of todos) {
      allTodos.set(todo[0], todo[1])
    }
    tref.todo.set(emptyTodoMap)
  }

  return allTodos
}

/**
 * Executes the todos in the current thread, sequentially.
 */
export function execTodos(todos: Map<TxnId, Todo>) {
  for (const todo of todos.values()) {
    todo()
  }
}

/**
 * Runs all the todos.
 */
export function completeTodos<E, A>(exit: Ex.Exit<E, A>, journal: Journal): Done<E, A> {
  const todos = collectTodos(journal)
  if (todos.size > 0) {
    defaultScheduler(() => execTodos(todos))
  }
  return new Done(exit)
}

/**
 * For the given transaction id, adds the specified todo effect to all
 * `TRef` values.
 */
export function addTodo(txnId: TxnId, journal: Journal, todoEffect: Todo): boolean {
  let added = false

  for (const entry of journal.values()) {
    const tref    = entry.use((entry) => entry.tref as Atomic<unknown>)
    const oldTodo = tref.todo.get
    if (!HM.has_(oldTodo, txnId)) {
      const newTodo = HM.set_(oldTodo, txnId, todoEffect)
      tref.todo.set(newTodo)
      added = true
    }
  }

  return added
}

/**
 * Finds all the new todo targets that are not already tracked in the `oldJournal`.
 */
export function untrackedTodoTargets(oldJournal: Journal, newJournal: Journal): Journal {
  const untracked: Journal = new Map()
  for (const entry of newJournal) {
    const key   = entry[0]
    const value = entry[1]
    if (
      // We already tracked this one
      !oldJournal.has(key) &&
      // This `TRef` was created in the current transaction, so no need to
      // add any todos to it, because it cannot be modified from the outside
      // until the transaction succeeds; so any todo added to it would never
      // succeed.
      !value.use((_) => _.isNew)
    ) {
      untracked.set(key, value)
    }
  }
  return untracked
}

export function tryCommitSync<R, E, A>(fiberId: FiberId, stm: STM<R, E, A>, r: R): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value            = new STMDriver(stm, journal, fiberId, r).run()
  const analysis         = analyzeJournal(journal)
  if (analysis === ReadWrite) {
    commitJournal(journal)
  } else if (analysis === Invalid) {
    throw new Error('Bug: invalid journal')
  }
  switch (value._tag) {
    case RetryTypeId: {
      return new Suspend(journal)
    }
    case SucceedTypeId: {
      return completeTodos(Ex.succeed(value.value), journal)
    }
    case FailTypeId: {
      return completeTodos(Ex.fail(value.value), journal)
    }
    case HaltTypeId: {
      return completeTodos(Ex.halt(value.value), journal)
    }
    case InterruptTypeId: {
      return completeTodos(Ex.interrupt(value.fiberId), journal)
    }
  }
}

function tryCommit<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  state: AtomicReference<CS.CommitState<E, A>>,
  r: R
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value            = new STMDriver(stm, journal, fiberId, r).run()
  const analysis         = analyzeJournal(journal)
  if (analysis === ReadWrite) {
    commitJournal(journal)
  } else if (analysis === Invalid) {
    throw new Error('Bug: invalid journal')
  }
  state.set(CS.done(value))
  switch (value._tag) {
    case RetryTypeId: {
      return new Suspend(journal)
    }
    case SucceedTypeId: {
      return completeTodos(Ex.succeed(value.value), journal)
    }
    case FailTypeId: {
      return completeTodos(Ex.fail(value.value), journal)
    }
    case HaltTypeId: {
      return completeTodos(Ex.halt(value.value), journal)
    }
    case InterruptTypeId: {
      return completeTodos(Ex.interrupt(value.fiberId), journal)
    }
  }
}

function completeTryCommit<R, E, A>(exit: Ex.Exit<E, A>, k: (_: I.IO<R, E, A>) => unknown) {
  k(I.fromExit(exit))
}

function suspendTryCommit<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId,
  state: AtomicReference<CS.CommitState<E, A>>,
  r: R,
  k: (_: I.IO<R, E, A>) => unknown,
  accum: Journal,
  journal: Journal
): void {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    addTodo(txnId, journal, () => tryCommitAsync(undefined, fiberId, stm, txnId, state, r)(k))
    if (isInvalid(journal)) {
      const result = tryCommit(fiberId, stm, state, r)
      switch (result._tag) {
        case DoneTypeId: {
          completeTryCommit(result.exit, k)
          return
        }
        case SuspendTypeId: {
          const untracked = untrackedTodoTargets(accum, result.journal)

          if (untracked.size > 0) {
            for (const entry of untracked) {
              accum.set(entry[0], entry[1])
            }
            // eslint-disable-next-line no-param-reassign
            journal = untracked
          }

          break
        }
      }
    } else {
      return
    }
  }
}

export function tryCommitAsync<R, E, A>(
  journal: Journal | undefined,
  fiberId: FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId,
  state: AtomicReference<CS.CommitState<E, A>>,
  r: R
): (k: (_: I.IO<R, E, A>) => unknown) => void {
  return (k) => {
    if (CS.isRunning(state.get)) {
      if (journal != null) {
        suspendTryCommit(fiberId, stm, txnId, state, r, k, journal, journal)
      }
    } else {
      const result = tryCommitSync(fiberId, stm, r)
      switch (result._tag) {
        case DoneTypeId: {
          completeTryCommit(result.exit, k)
          break
        }
        case SuspendTypeId: {
          suspendTryCommit(fiberId, stm, txnId, state, r, k, result.journal, result.journal)
          break
        }
      }
    }
  }
}

/**
 * Determines if the journal is valid.
 */
export function isValid(journal: Journal) {
  let valid = true
  for (const entry of journal.values()) {
    valid = entry.use((entry) => entry.isValid())
    if (!valid) {
      return valid
    }
  }
  return valid
}

/**
 * Determines if the journal is invalid.
 */
export function isInvalid(journal: Journal) {
  return !isValid(journal)
}
