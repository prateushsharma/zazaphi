import { z } from "zod";
import { TaskId } from "./common.js";

export const SandboxStatus = z.enum(["succeeded", "failed"]);
export type SandboxStatus = z.infer<typeof SandboxStatus>;

export const SandboxResult = z.object({
  task_id: TaskId,
  status: SandboxStatus,
  command: z.string(),
  exit_code: z.number().int(),
  error: z.string().nullable().default(null),
  /** Truncated tail of stdout/stderr. The full log stays in the sandbox. */
  logs: z.string().default(""),
  files_changed: z.array(z.string()).default([]),
  preview_url: z.string().url().nullable().default(null),
  duration_ms: z.number().int().nonnegative(),
});
export type SandboxResult = z.infer<typeof SandboxResult>;
