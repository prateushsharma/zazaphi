import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Logger, RunResult } from "@zazaphi/core";

export type RunStatus = "generating" | "preview" | "deploying" | "live" | "failed";

export interface RunRecord {
  job_id: string;
  run_id?: string;
  prompt: string;
  name?: string;
  status: RunStatus;
  stage: string;
  logs: string[];
  preview_url?: string;
  prod_url?: string;
  error?: string;
  result?: RunResult;
  created_at: number;
  updated_at: number;
}

export interface ProjectSummary {
  job_id: string;
  name: string;
  status: RunStatus;
  stage: string;
  preview_url: string | null;
  prod_url: string | null;
  created_at: number;
}

const STORE_DIR = path.join(os.tmpdir(), "zazaphi");
const STORE_FILE = path.join(STORE_DIR, "runs.json");
const MAX_LOG_LINES = 200;

let seq = 0;
function nextJobId(): string {
  seq += 1;
  return `job_${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * Disk-backed registry of runs. Records are written to a JSON file under the OS
 * temp dir on every change and reloaded on startup, so a finished or running
 * build survives both a browser refresh and a dev-server restart. A run that
 * was mid-flight when the process died is marked failed on reload, since its
 * background work did not survive the restart. One run is active at a time.
 */
export class RunRegistry {
  private readonly records = new Map<string, RunRecord>();
  private activeJobId: string | null = null;

  constructor() {
    this.loadFromDisk();
  }

  start(prompt: string): string {
    const job_id = nextJobId();
    const now = Date.now();
    this.records.set(job_id, {
      job_id,
      prompt,
      status: "generating",
      stage: "",
      logs: [],
      created_at: now,
      updated_at: now,
    });
    this.activeJobId = job_id;
    this.persist();
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
    record.status = "preview";
    record.run_id = result.run_id;
    record.name = result.spec.name;
    record.preview_url = result.preview.url;
    record.result = result;
    record.updated_at = Date.now();
    this.persist();
  }

  fail(job_id: string, error: string): void {
    const record = this.records.get(job_id);
    if (!record) return;
    record.status = "failed";
    record.error = error;
    this.append(record, `\u2716 ${error}`);
  }

  markDeploying(run_id: string): void {
    const record = this.byRunId(run_id);
    if (!record) return;
    record.status = "deploying";
    record.updated_at = Date.now();
    this.persist();
  }

  markLive(run_id: string, result: RunResult): void {
    const record = this.byRunId(run_id);
    if (!record) return;
    record.status = "live";
    record.result = result;
    if (result.production) record.prod_url = result.production.url;
    record.updated_at = Date.now();
    this.persist();
  }

  get(job_id: string): RunRecord | undefined {
    return this.records.get(job_id);
  }

  list(): ProjectSummary[] {
    return [...this.records.values()]
      .sort((a, b) => b.created_at - a.created_at)
      .map((r) => ({
        job_id: r.job_id,
        name: r.name ?? r.prompt,
        status: r.status,
        stage: r.stage,
        preview_url: r.preview_url ?? null,
        prod_url: r.prod_url ?? null,
        created_at: r.created_at,
      }));
  }

  private byRunId(run_id: string): RunRecord | undefined {
    for (const record of this.records.values()) {
      if (record.run_id === run_id) return record;
    }
    return undefined;
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
    this.persist();
  }

  private loadFromDisk(): void {
    try {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw) as RunRecord[];
      for (const record of parsed) {
        if (record.status === "generating" || record.status === "deploying") {
          record.status = "failed";
          record.error = record.error ?? "interrupted by a server restart";
        }
        this.records.set(record.job_id, record);
      }
    } catch {
      // no store yet (first run) or unreadable — start empty
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(STORE_DIR, { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify([...this.records.values()]), "utf8");
    } catch {
      // a disk-write failure must not crash a build; in-memory state still serves
    }
  }
}

/**
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
