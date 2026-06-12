import type { z } from "zod";
import type {
  TaskSpec,
  TaskBudget,
  LLMRequest,
  LLMResponse,
  ContextPacket,
  SandboxResult,
  ServiceManifest,
  ProjectSpec,
  ArchitecturePlan,
  DatabaseSchema,
  DeployResult,
  GeneratedFile,
  TokenUsage,
  RunId,
} from "@zazaphi/contracts";

/** Aggregate of everything the orchestrator persists for a project. */
export interface ProjectMemory {
  spec: ProjectSpec;
  architecture?: ArchitecturePlan;
  schema?: DatabaseSchema;
  manifest?: ServiceManifest;
  fileMap: Record<string, string>;
  recentErrors: string[];
}

export interface ProjectStorePort {
  load(): ProjectMemory;
  saveSpec(spec: ProjectSpec): void;
  saveArchitecture(arch: ArchitecturePlan, manifest: ServiceManifest): void;
  saveSchema(schema: DatabaseSchema): void;
  recordFiles(files: GeneratedFile[]): void;
  recordError(error: string): void;
}

export interface GatewayResult<T> {
  value: T;
  response: LLMResponse;
}

/** Provider-agnostic generation boundary. Implemented by @zazaphi/gateway. */
export interface LLMGatewayPort {
  generateStructured<S extends z.ZodTypeAny>(
    req: LLMRequest,
    schema: S,
  ): Promise<GatewayResult<z.infer<S>>>;
}

/** Assembles the minimal context_packet for one task. */
export interface ContextPort {
  build(
    task: TaskSpec,
    project: ProjectMemory,
    options?: { includeErrors?: boolean },
  ): ContextPacket;
}

/** Budgets, routing and cost accounting. */
export interface EconomicsPort {
  budgetFor(task: TaskSpec): TaskBudget;
  record(usage: TokenUsage, model: string): void;
  ledger(): CostLedger;
}

export interface CostLedger {
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  calls: number;
}

/** Isolated execution boundary. Implemented by @zazaphi/sandbox. */
export interface SandboxPort {
  run(input: {
    task: TaskSpec;
    command: string;
    files: GeneratedFile[];
  }): Promise<SandboxResult>;
}

/** Turns an architecture plan into a service manifest. */
export interface ServicesPort {
  manifestFor(arch: ArchitecturePlan): ServiceManifest;
}

/** Preview is automatic; production is approval-gated. */
export interface DeployPort {
  preview(runId: RunId): Promise<DeployResult>;
  deployProduction(runId: RunId, approved: boolean): Promise<DeployResult>;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  stage(name: string, msg: string): void;
}

export interface OrchestratorPorts {
  gateway: LLMGatewayPort;
  context: ContextPort;
  economics: EconomicsPort;
  sandbox: SandboxPort;
  services: ServicesPort;
  deploy: DeployPort;
  store: ProjectStorePort;
  logger: Logger;
}
