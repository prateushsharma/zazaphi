import { resolve } from "node:path";
import { DeployResult } from "@zazaphi/contracts";
import type { RunId } from "@zazaphi/contracts";
import type { DeployPort, ProjectStorePort } from "@zazaphi/core";
import type { DeployConfig } from "./config.js";
import { docker } from "./docker.js";
import { materializeForPreview } from "./workspace.js";

const PREVIEW_CONTAINER = "zazaphi-preview";
const PROD_CONTAINER = "zazaphi-prod";

type Mode = "dev" | "prod";

function currentUser(): string {
  const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
  const gid = typeof process.getgid === "function" ? process.getgid() : 1000;
  return `${uid}:${gid}`;
}

/**
 * Runs the generated project in a real Docker container and serves it on a host
 * port. The container is started and the call returns immediately — install and
 * server boot happen in the background, so the run request stays fast. One
 * container per project (the previous one is removed first), not one per task.
 * Production is approval-gated and rebuilds with `next build && next start`.
 * Containers run non-root with dropped capabilities and resource limits.
 */
export class DockerDeploy implements DeployPort {
  constructor(
    private readonly store: ProjectStorePort,
    private readonly config: DeployConfig,
  ) {}

  async preview(runId: RunId): Promise<DeployResult> {
    await this.launch(PREVIEW_CONTAINER, this.config.previewPort, "dev");
    return DeployResult.parse({
      run_id: runId,
      stage: "preview",
      url: `http://localhost:${this.config.previewPort}`,
      approved: true,
    });
  }

  async deployProduction(runId: RunId, approved: boolean): Promise<DeployResult> {
    if (!approved) {
      return DeployResult.parse({
        run_id: runId,
        stage: "preview",
        url: `http://localhost:${this.config.previewPort}`,
        approved: false,
      });
    }
    await this.launch(PROD_CONTAINER, this.config.prodPort, "prod");
    return DeployResult.parse({
      run_id: runId,
      stage: "production",
      url: `http://localhost:${this.config.prodPort}`,
      approved: true,
    });
  }

  /** Pull the base image once, up front, so `docker run` itself stays fast. */
  private async ensureImage(): Promise<void> {
    const inspect = await docker(["image", "inspect", this.config.image], 15_000);
    if (inspect.exitCode === 0) return;
    const pull = await docker(["pull", this.config.image], this.config.pullTimeoutMs);
    if (pull.spawnError) {
      throw new Error(`docker unavailable: ${pull.spawnError}`);
    }
    if (pull.exitCode !== 0) {
      throw new Error(`failed to pull image ${this.config.image}: ${pull.output.slice(-400)}`);
    }
  }

  private async launch(name: string, hostPort: number, mode: Mode): Promise<void> {
    await this.ensureImage();

    const workdir = resolve(this.config.workRoot, mode);
    await materializeForPreview(workdir, this.store.load().fileMap);

    await docker(["rm", "-f", name], 20_000);

    const install = "npm install --no-audit --no-fund --loglevel=error";
    const serve = mode === "dev" ? "exec npm run dev" : "npm run build && exec npm run start";
    const command = `${install} && ${serve}`;

    const run = await docker(this.runArgs(name, hostPort, workdir, command), 60_000);
    if (run.spawnError) {
      throw new Error(`docker unavailable: ${run.spawnError}`);
    }
    if (run.exitCode !== 0) {
      throw new Error(`failed to start container ${name}: ${run.output.slice(-400)}`);
    }
    // Container started. Install + server boot continue in the background; we do
    // not block the request on readiness (the URL is live within ~30-60s).
  }

  private runArgs(name: string, hostPort: number, workdir: string, command: string): string[] {
    return [
      "run",
      "-d",
      "--name",
      name,
      "-p",
      `${hostPort}:3000`,
      "-v",
      `${workdir}:/app`,
      "-w",
      "/app",
      "--user",
      currentUser(),
      "-e",
      "HOME=/app",
      "-e",
      "npm_config_cache=/app/.npm-cache",
      "-e",
      "CI=1",
      "--memory",
      this.config.memory,
      "--cpus",
      this.config.cpus,
      "--pids-limit",
      String(this.config.pidsLimit),
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      this.config.image,
      "sh",
      "-lc",
      command,
    ];
  }
}
