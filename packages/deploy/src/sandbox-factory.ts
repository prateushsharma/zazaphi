import { SandboxResult } from "@zazaphi/contracts";
import type { TaskSpec, GeneratedFile } from "@zazaphi/contracts";
import type { SandboxPort, ProjectStorePort } from "@zazaphi/core";
import { DockerSandbox } from "./docker-sandbox.js";
import { resolveDeployConfig } from "./config.js";

/** Always-pass sandbox for offline/local runs where Docker is not wanted. */
class PassthroughSandbox implements SandboxPort {
  async run(input: {
    task: TaskSpec;
    command: string;
    files: GeneratedFile[];
  }): Promise<SandboxResult> {
    return SandboxResult.parse({
      task_id: input.task.task_id,
      status: "succeeded",
      command: input.command,
      exit_code: 0,
      error: null,
      logs: "sandbox disabled",
      files_changed: input.files.map((f) => f.path),
      preview_url: null,
      duration_ms: 0,
    });
  }
}

/**
 * Builds the sandbox port. The real DockerSandbox type-checks each build in an
 * isolated container; set ZAZAPHI_SANDBOX=stub (or off) to skip it for offline
 * development.
 */
export function createSandbox(
  store: ProjectStorePort,
  env: Record<string, string | undefined> = process.env,
): SandboxPort {
  const mode = env.ZAZAPHI_SANDBOX?.trim().toLowerCase();
  if (mode === "stub" || mode === "off") return new PassthroughSandbox();
  return new DockerSandbox(store, resolveDeployConfig(env));
}
