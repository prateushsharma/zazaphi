import type { TaskSpec } from "@zazaphi/contracts";

/** Stable topological order over task depends_on. Throws on cycles. */
export function orderTasks(tasks: TaskSpec[]): TaskSpec[] {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const visited = new Set<string>();
  const inProgress = new Set<string>();
  const ordered: TaskSpec[] = [];

  const visit = (task: TaskSpec): void => {
    if (visited.has(task.task_id)) return;
    if (inProgress.has(task.task_id)) {
      throw new Error(`Dependency cycle detected at ${task.task_id}`);
    }
    inProgress.add(task.task_id);
    for (const dep of task.depends_on) {
      const depTask = byId.get(dep);
      if (depTask) visit(depTask);
    }
    inProgress.delete(task.task_id);
    visited.add(task.task_id);
    ordered.push(task);
  };

  for (const task of tasks) visit(task);
  return ordered;
}
