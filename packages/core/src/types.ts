import type {
  TaskSpec,
  TaskStatus,
  ProjectSpec,
  ArchitecturePlan,
  ServiceManifest,
  SandboxResult,
  DeployResult,
  RunId,
} from "@zazaphi/contracts";
import type { CostLedger } from "./ports.js";

export interface TaskResult {
  task: TaskSpec;
  status: TaskStatus;
  attempts: number;
  sandbox?: SandboxResult;
  error?: string;
}

export interface RunResult {
  run_id: RunId;
  spec: ProjectSpec;
  architecture: ArchitecturePlan;
  manifest: ServiceManifest;
  tasks: TaskResult[];
  preview: DeployResult;
  production?: DeployResult;
  awaiting_approval: boolean;
  cost: CostLedger;
}
