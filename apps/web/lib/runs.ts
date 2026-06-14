import type { Logger, RunResult } from "@zazaphi/core";

export type RunPhase = "running" | "succeeded" | "failed";

export interface RunRecord {
  job_id: string;
  phase: RunPhase;
  stage: string;
  logs: string[];
  result?: RunResult;
  error?: string;
  created_at: number;
  updated_at: number;
}

let seq = 0;
function nextJobId(): string {
  seq += 1;
  return `job_${Date.now().toString(36)}${seq.toString(36)}`;
}

const MAX_LOG_LINES = 200;

/**
 * In-memory registry of background runs. A run is started before the pipeline
 * begins, updated as the orchestrator's logger emits stages, and finalized when
 * the pipeline resolves or throws. The build tab polls a record by job_id. One
 * run is active at a time (the UI disables the trigger while a build runs), so
 * the active pointer is unambiguous; per-run loggers arrive with concurrency.
 */
export class RunRegistry {
  private readonly records = new Map<string, RunRecord>();
  private activeJobId: string | null = null;

  start(): string {
    const job_id = nextJobId();
    const now = Date.now();
    this.records.set(job_id, {
      job_id,
      phase: "running",
      stage: "",
      logs: [],
      created_at: now,
      updated_at: now,
    });
    this.activeJobId = job_id;
    return job_id;
  }

  recordStage(name: string, message: string): void {
    const record = this.active();
    if (!record) return;
    record.stage = name;
    this.append(record, `\u25b8 ${name} \u2014 ${message}`);
  }

  recordLine(line: string): void {
    const record = this.active();
    if (!record) return;
    this.append(record, line);
  }

  succeed(job_id: string, result: RunResult): void {
    const record = this.records.get(job_id);
    if (!record) return;
    record.phase = "succeeded";
    record.result = result;
    record.updated_at = Date.now();
  }

  fail(job_id: string, error: string): void {
    const record = this.records.get(job_id);
    if (!record) return;
    record.phase = "failed";
    record.error = error;
    this.append(record, `\u2716 ${error}`);
  }

  get(job_id: string): RunRecord | undefined {
    return this.records.get(job_id);
  }

  private active(): RunRecord | undefined {
    return this.activeJobId ? this.records.get(this.activeJobId) : undefined;
  }

  private append(record: RunRecord, line: string): void {
    record.logs.push(line);
    if (record.logs.length > MAX_LOG_LINES) {
      record.logs = record.logs.slice(-MAX_LOG_LINES);
    }
    record.updated_at = Date.now();
  }
}

/**
 * Logger that feeds the orchestrator's stage and message events into the run
 * registry instead of the console, so the dashboard shows real progress.
 * Implements the core Logger interface; every method routes a line into the
 * active run record (meta is intentionally dropped for a clean build log).
 */
export class RegistryLogger implements Logger {
  constructor(private readonly registry: RunRegistry) {}

  info(msg: string, _meta?: Record<string, unknown>): void {
    this.registry.recordLine(`\u25cf ${msg}`);
  }

  warn(msg: string, _meta?: Record<string, unknown>): void {
    this.registry.recordLine(`\u25b2 ${msg}`);
  }

  error(msg: string, _meta?: Record<string, unknown>): void {
    this.registry.recordLine(`\u2716 ${msg}`);
  }

  stage(name: string, msg: string): void {
    this.registry.recordStage(name, msg);
  }
}

const ref = globalThis as unknown as { __zazaphiRuns?: RunRegistry };
export const runRegistry: RunRegistry =
  ref.__zazaphiRuns ?? (ref.__zazaphiRuns = new RunRegistry());
