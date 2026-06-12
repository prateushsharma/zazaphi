import { z } from "zod";
import { TaskId, TaskType, TaskStatus, BudgetTier } from "./common.js";

export const TaskSpec = z.object({
  task_id: TaskId,
  type: TaskType,
  title: z.string().min(1),
  description: z.string().default(""),
  depends_on: z.array(TaskId).default([]),
  target_files: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  budget_ref: BudgetTier,
  status: TaskStatus.default("pending"),
});
export type TaskSpec = z.infer<typeof TaskSpec>;

export const TaskSpecList = z.array(TaskSpec);
export type TaskSpecList = z.infer<typeof TaskSpecList>;
