import { ProjectId } from "@zazaphi/contracts";
import type { RunId } from "@zazaphi/contracts";
import type { OrchestratorPorts } from "./ports.js";
import {
  makeRequirementAgent,
  makeArchitectureAgent,
  makeSchemaAgent,
  makeTaskPlanner,
} from "./agents/index.js";
import { runTask } from "./task-runner.js";
import { orderTasks } from "./order.js";
import type { RunResult, TaskResult } from "./types.js";

export interface PipelineInput {
  run_id: RunId;
  project_id: ProjectId;
  prompt: string;
  max_tasks: number;
}

/**
 * Drives the control flow end to end. The agents only ever receive the context
 * packet handed to them; the orchestrator decides ordering, budgets, retries
 * and the approval gate. Production deploy is never reached here — the run
 * stops at preview and waits for explicit approval.
 */
export async function runPipeline(
  input: PipelineInput,
  ports: OrchestratorPorts,
): Promise<RunResult> {
  const { store, services, deploy, economics, logger } = ports;

  const requirement = makeRequirementAgent(ports);
  const architecture = makeArchitectureAgent(ports);
  const schema = makeSchemaAgent(ports);
  const planner = makeTaskPlanner(ports);

  logger.stage("requirement", "deriving product spec");
  const spec = await requirement(input.prompt, input.project_id);
  store.saveSpec(spec);

  logger.stage("architecture", "designing technical plan");
  const arch = await architecture(spec);
  const manifest = services.manifestFor(arch);
  store.saveArchitecture(arch, manifest);

  logger.stage("schema", "designing database schema");
  store.saveSchema(await schema(spec));

  logger.stage("planner", "breaking work into tasks");
  const planned = orderTasks(await planner(spec, arch)).slice(0, input.max_tasks);

  const results: TaskResult[] = [];
  for (const task of planned) {
    results.push(await runTask(task, store.load(), ports));
  }

  logger.stage("preview", "publishing preview");
  const preview = await deploy.preview(input.run_id);

  return {
    run_id: input.run_id,
    spec,
    architecture: arch,
    manifest,
    tasks: results,
    preview,
    awaiting_approval: true,
    cost: economics.ledger(),
  };
}
