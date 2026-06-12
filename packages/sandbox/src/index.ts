import { SandboxResult } from "@zazaphi/contracts";
import type { TaskSpec, GeneratedFile } from "@zazaphi/contracts";
import type { SandboxPort } from "@zazaphi/core";

/**
 * Stands in for the Docker-per-project sandbox. It echoes a well-formed
 * sandbox_result without executing anything. The real implementation writes
 * files into an isolated container, runs install/build/test under resource and
 * command limits, and returns the truncated log tail.
 *
 * `failFirstAttempt` lets a demo exercise the error to fix loop deterministically.
 */
export class StubSandbox implements SandboxPort {
  private readonly seen = new Set<string>();

  constructor(private readonly failFirstAttempt = false) {}

  async run(input: {
    task: TaskSpec;
    command: string;
    files: GeneratedFile[];
  }): Promise<SandboxResult> {
    const { task, command, files } = input;
    const firstTime = !this.seen.has(task.task_id);
    this.seen.add(task.task_id);

    const shouldFail = this.failFirstAttempt && firstTime && command === "npm run build";
    const previewUrl = `https://preview.zazaphi.app/${task.task_id}`;

    return SandboxResult.parse({
      task_id: task.task_id,
      status: shouldFail ? "failed" : "succeeded",
      command,
      exit_code: shouldFail ? 1 : 0,
      error: shouldFail ? `Type error in ${task.target_files[0] ?? "src/app/page.tsx"}` : null,
      logs: shouldFail ? "tsc: 1 error" : "build completed",
      files_changed: files.map((f) => f.path),
      preview_url: shouldFail ? null : previewUrl,
      duration_ms: 1200,
    });
  }
}
