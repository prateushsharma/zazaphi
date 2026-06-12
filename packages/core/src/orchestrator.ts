import { ProjectId, RunId } from "@zazaphi/contracts";
import type { OrchestratorPorts } from "./ports.js";
import { runPipeline } from "./pipeline.js";
import type { RunResult } from "./types.js";

export interface RunOptions {
  maxTasks?: number;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * The product surface. Nothing else in the system starts a run or approves a
 * deploy. Agents, the gateway and the sandbox are all reached only through the
 * ports passed in here, so any of them can be swapped without touching control.
 */
export class Orchestrator {
  private readonly runs = new Map<string, RunResult>();

  constructor(private readonly ports: OrchestratorPorts) {}

  async run(prompt: string, options: RunOptions = {}): Promise<RunResult> {
    const runId = RunId.parse(nextId("run"));
    const projectId = ProjectId.parse(nextId("proj"));
    this.ports.logger.info("run started", { run: runId, prompt });

    const result = await runPipeline(
      { run_id: runId, project_id: projectId, prompt, max_tasks: options.maxTasks ?? 8 },
      this.ports,
    );
    this.runs.set(runId, result);
    this.ports.logger.info("run reached preview, awaiting approval", { run: runId });
    return result;
  }

  get(runId: RunId): RunResult | undefined {
    return this.runs.get(runId);
  }

  /** Approval-gated production deploy. Without approval, nothing ships. */
  async approve(runId: RunId, approved: boolean): Promise<RunResult> {
    const result = this.runs.get(runId);
    if (!result) throw new Error(`Unknown run: ${runId}`);
    const production = await this.ports.deploy.deployProduction(runId, approved);
    const updated: RunResult = { ...result, production, awaiting_approval: !approved };
    this.runs.set(runId, updated);
    this.ports.logger.info(approved ? "production deploy approved" : "production deploy rejected", {
      run: runId,
    });
    return updated;
  }
}
