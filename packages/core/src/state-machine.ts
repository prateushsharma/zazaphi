import type { TaskStatus } from "@zazaphi/contracts";

/**
 * Allowed task status transitions. Any transition not listed here is rejected,
 * so the orchestrator can never drive a task into an inconsistent state.
 */
const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ["running", "blocked"],
  running: ["succeeded", "failed", "needs_approval"],
  failed: ["running", "blocked"],
  needs_approval: ["running", "succeeded", "blocked"],
  succeeded: [],
  blocked: [],
};

export class IllegalTransitionError extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Illegal task transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: TaskStatus, to: TaskStatus): TaskStatus {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
  return to;
}

export function isTerminal(status: TaskStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
