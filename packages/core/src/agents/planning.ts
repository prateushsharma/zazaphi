import { z } from "zod";
import {
  ProjectSpec,
  ArchitecturePlan,
  DatabaseSchema,
  TaskSpec,
  TaskId,
  ProjectId,
} from "@zazaphi/contracts";
import type { ContextPacket } from "@zazaphi/contracts";
import type { EconomicsPort, LLMGatewayPort } from "../ports.js";
import { buildRequest } from "./request.js";

const RequirementOutput = ProjectSpec.omit({ project_id: true });
const ArchitectureOutput = ArchitecturePlan;
const SchemaOutput = DatabaseSchema;
const PlannerOutput = z.object({ tasks: z.array(TaskSpec) });

interface AgentDeps {
  gateway: LLMGatewayPort;
  economics: EconomicsPort;
}

function syntheticTask(taskId: string, title: string): TaskSpec {
  return TaskSpec.parse({
    task_id: taskId,
    type: "docs",
    title,
    budget_ref: "medium",
  });
}

function syntheticContext(
  taskId: string,
  title: string,
  summary: string,
): ContextPacket {
  return {
    static_prefix_id: "zazaphi.system.v1",
    project_summary: summary,
    current_task: { task_id: TaskId.parse(taskId), title, constraints: [] },
    schema_summary: "",
    relevant_files: [],
    recent_errors: [],
  };
}

export function makeRequirementAgent(deps: AgentDeps) {
  return async (prompt: string, projectId: ProjectId): Promise<ProjectSpec> => {
    const task = syntheticTask("t_spec", "Derive product spec");
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "medium" });
    const req = buildRequest(task, budget, syntheticContext("t_spec", "Derive product spec", prompt));
    const { value, response } = await deps.gateway.generateStructured(req, RequirementOutput);
    deps.economics.record(response.usage, response.model);
    return ProjectSpec.parse({ ...value, project_id: projectId });
  };
}

export function makeArchitectureAgent(deps: AgentDeps) {
  return async (spec: ProjectSpec): Promise<ArchitecturePlan> => {
    const task = syntheticTask("t_arch", "Design architecture");
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "high" });
    const req = buildRequest(task, budget, syntheticContext("t_arch", "Design architecture", spec.summary));
    const { value, response } = await deps.gateway.generateStructured(req, ArchitectureOutput);
    deps.economics.record(response.usage, response.model);
    return value;
  };
}

export function makeSchemaAgent(deps: AgentDeps) {
  return async (spec: ProjectSpec): Promise<DatabaseSchema> => {
    const task = syntheticTask("t_schema", "Design database schema");
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "high" });
    const req = buildRequest(task, budget, syntheticContext("t_schema", "Design database schema", spec.summary));
    const { value, response } = await deps.gateway.generateStructured(req, SchemaOutput);
    deps.economics.record(response.usage, response.model);
    return value;
  };
}

export function makeTaskPlanner(deps: AgentDeps) {
  return async (spec: ProjectSpec, arch: ArchitecturePlan): Promise<TaskSpec[]> => {
    const task = syntheticTask("t_plan", "Plan build tasks");
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "medium" });
    const ctx = syntheticContext("t_plan", "Plan build tasks", `${spec.summary} :: ${arch.summary}`);
    const req = buildRequest(task, budget, ctx);
    const { value, response } = await deps.gateway.generateStructured(req, PlannerOutput);
    deps.economics.record(response.usage, response.model);
    return value.tasks;
  };
}
