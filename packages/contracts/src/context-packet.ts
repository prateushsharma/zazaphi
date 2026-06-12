import { z } from "zod";
import { TaskId, FileMode } from "./common.js";

export const RelevantFile = z.object({
  path: z.string().min(1),
  mode: FileMode,
  content: z.string(),
});
export type RelevantFile = z.infer<typeof RelevantFile>;

export const ContextPacket = z.object({
  /** Stable identifier for the cacheable static prefix. Same id => cache hit. */
  static_prefix_id: z.string().min(1),
  project_summary: z.string(),
  current_task: z.object({
    task_id: TaskId,
    title: z.string(),
    constraints: z.array(z.string()).default([]),
  }),
  schema_summary: z.string().default(""),
  relevant_files: z.array(RelevantFile).default([]),
  recent_errors: z.array(z.string()).default([]),
});
export type ContextPacket = z.infer<typeof ContextPacket>;
