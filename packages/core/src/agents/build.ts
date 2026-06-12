import { z } from "zod";
import { GeneratedFile, PatchSet } from "@zazaphi/contracts";
import type { TaskSpec } from "@zazaphi/contracts";
import type { ContextPort, EconomicsPort, LLMGatewayPort, ProjectMemory } from "../ports.js";
import { buildRequest } from "./request.js";

const CodeOutput = z.object({ files: z.array(GeneratedFile) });
const TestOutput = z.object({ files: z.array(GeneratedFile) });

interface BuildDeps {
  gateway: LLMGatewayPort;
  context: ContextPort;
  economics: EconomicsPort;
}

export function makeCodeAgent(deps: BuildDeps) {
  return async (task: TaskSpec, project: ProjectMemory): Promise<GeneratedFile[]> => {
    const budget = deps.economics.budgetFor(task);
    const ctx = deps.context.build(task, project);
    const req = buildRequest(task, budget, ctx);
    const { value, response } = await deps.gateway.generateStructured(req, CodeOutput);
    deps.economics.record(response.usage, response.model);
    return value.files;
  };
}

export function makeDebugAgent(deps: BuildDeps) {
  return async (
    task: TaskSpec,
    error: string,
    project: ProjectMemory,
  ): Promise<PatchSet> => {
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "high" });
    const ctx = deps.context.build(task, project, { includeErrors: true });
    const req = buildRequest(task, budget, { ...ctx, recent_errors: [error, ...ctx.recent_errors] });
    const { value, response } = await deps.gateway.generateStructured(req, PatchSet);
    deps.economics.record(response.usage, response.model);
    return value;
  };
}

export function makeTestAgent(deps: BuildDeps) {
  return async (task: TaskSpec, project: ProjectMemory): Promise<GeneratedFile[]> => {
    const budget = deps.economics.budgetFor({ ...task, budget_ref: "medium" });
    const ctx = deps.context.build(task, project);
    const req = buildRequest(task, budget, ctx);
    const { value, response } = await deps.gateway.generateStructured(req, TestOutput);
    deps.economics.record(response.usage, response.model);
    return value.files;
  };
}
