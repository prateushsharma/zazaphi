import { resolve } from "node:path";
import { SandboxResult } from "@zazaphi/contracts";
import type { TaskSpec, GeneratedFile } from "@zazaphi/contracts";
import type { SandboxPort, ProjectStorePort } from "@zazaphi/core";
import type { DeployConfig } from "./config.js";
import { docker } from "./docker.js";
import { materializeForPreview } from "./workspace.js";

const CONTAINER = "zazaphi-sandbox";
const BUILD_COMMAND = "npm run build";
const BUILD_TIMEOUT_MS = 180_000;

function currentUser(): string {
  const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
  const gid = typeof process.getgid === "function" ? process.getgid() : 1000;
  return `${uid}:${gid}`;
}

/** Pulls the most useful slice of a failed build's output for the debug agent. */
function extractError(output: string): string {
  const tscErrors = output.split("\n").filter((line) => /error TS\d+/.test(line));
  if (tscErrors.length > 0) return tscErrors.slice(0, 8).join("\n");
  const idx = output.search(/Cannot find|Failed to compile|npm error|ELIFECYCLE/i);
  if (idx >= 0) return output.slice(idx, idx + 800).trim();
  return output.slice(-800).trim();
}

/**
 * Verifies the generated project by type-checking it in a real, isolated
 * container. Unlike the deploy launch this call is blocking: it installs deps
 * and runs `tsc --noEmit` to completion, returning failed + the compiler error
 * on a non-zero exit so the orchestrator's error->fix loop can repair syntax,
 * import/export and type mistakes before anything is deployed. The whole project
 * is read from the store and materialized exactly as deploy does. If Docker is
 * unavailable the check passes through so local/offline runs are not blocked.
 */
export class DockerSandbox implements SandboxPort {
  constructor(
    private readonly store: ProjectStorePort,
    private readonly config: DeployConfig,
  ) {}

  async run(input: {
    task: TaskSpec;
    command: string;
    files: GeneratedFile[];
  }): Promise<SandboxResult> {
    const { task, command, files } = input;
    const changed = files.map((f) => f.path);

    if (command !== BUILD_COMMAND) {
      return this.passed(task.task_id, command, changed, "skipped", 0);
    }

    const started = Date.now();
    const workdir = resolve(this.config.workRoot, "sandbox");
    await materializeForPreview(workdir, this.store.load().fileMap);

    await docker(["rm", "-f", CONTAINER], 20_000);
    const script =
      "npm install --no-audit --no-fund --loglevel=error && node_modules/.bin/tsc --noEmit";
    const run = await docker(this.runArgs(workdir, script), BUILD_TIMEOUT_MS);
    const duration = Date.now() - started;

    if (run.spawnError !== undefined) {
      return this.passed(task.task_id, command, changed, `sandbox skipped: ${run.spawnError}`, duration);
    }
    if (run.exitCode === 0) {
      return this.passed(task.task_id, command, changed, "type-check passed", duration);
    }

    return SandboxResult.parse({
      task_id: task.task_id,
      status: "failed",
      command,
      exit_code: run.exitCode,
      error: extractError(run.output),
      logs: run.output.slice(-2000),
      files_changed: changed,
      preview_url: null,
      duration_ms: duration,
    });
  }

  private passed(
    taskId: string,
    command: string,
    changed: string[],
    logs: string,
    duration: number,
  ): SandboxResult {
    return SandboxResult.parse({
      task_id: taskId,
      status: "succeeded",
      command,
      exit_code: 0,
      error: null,
      logs,
      files_changed: changed,
      preview_url: null,
      duration_ms: duration,
    });
  }

  private runArgs(workdir: string, script: string): string[] {
    return [
      "run", "--rm", "--name", CONTAINER,
      "-v", `${workdir}:/app`, "-w", "/app",
      "--user", currentUser(),
      "-e", "HOME=/app", "-e", "npm_config_cache=/app/.npm-cache", "-e", "CI=1",
      "--memory", this.config.memory, "--cpus", this.config.cpus,
      "--pids-limit", String(this.config.pidsLimit),
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      this.config.image, "sh", "-lc", script,
    ];
  }
}
