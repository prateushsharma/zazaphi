import type { TaskSpec, SandboxResult } from "@zazaphi/contracts";
import type { OrchestratorPorts, ProjectMemory } from "./ports.js";
import { transition } from "./state-machine.js";
import { makeCodeAgent, makeDebugAgent, makeTestAgent } from "./agents/index.js";
import type { TaskResult } from "./types.js";

const BUILD_COMMAND = "npm run build";

/**
 * Runs one task: generate -> sandbox -> bounded error->fix loop -> test.
 * The retry count is capped by the task budget so a failing task can never
 * spin forever. Each retry feeds the captured error back to the debug agent
 * with only the relevant files attached, never the whole repo.
 */
export async function runTask(
  task: TaskSpec,
  project: ProjectMemory,
  ports: OrchestratorPorts,
): Promise<TaskResult> {
  const { sandbox, store, economics, logger } = ports;
  const code = makeCodeAgent(ports);
  const debug = makeDebugAgent(ports);
  const test = makeTestAgent(ports);

  const budget = economics.budgetFor(task);
  let status = transition(task.status, "running");
  logger.stage("code", `${task.task_id} ${task.title}`);

  let files = await code(task, project);
  store.recordFiles(files);
  let result: SandboxResult = await sandbox.run({ task, command: BUILD_COMMAND, files });

  let attempts = 0;
  while (result.status === "failed" && attempts < budget.retry_limit) {
    attempts += 1;
    const reason = result.error ?? "unknown build failure";
    store.recordError(reason);
    logger.warn(`build failed, repairing (attempt ${attempts}/${budget.retry_limit})`, {
      task: task.task_id,
      error: reason,
    });
    const patch = await debug(task, reason, store.load());
    store.recordFiles(patch.files);
    result = await sandbox.run({ task, command: BUILD_COMMAND, files: patch.files });
  }

  if (result.status === "failed") {
    logger.error(`task blocked after ${attempts} repair attempts`, { task: task.task_id });
    return {
      task,
      status: transition(status, "blocked"),
      attempts,
      sandbox: result,
      ...(result.error ? { error: result.error } : {}),
    };
  }

  logger.stage("test", `${task.task_id}`);
  const tests = await test(task, project);
  store.recordFiles(tests);
  await sandbox.run({ task, command: "npm test", files: tests });

  status = transition(status, "succeeded");
  return { task, status, attempts, sandbox: result };
}
