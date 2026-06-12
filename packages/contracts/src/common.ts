import { z } from "zod";

export const ModelTier = z.enum(["small", "medium", "strong"]);
export type ModelTier = z.infer<typeof ModelTier>;

export const BudgetTier = z.enum(["low", "medium", "high", "very_high"]);
export type BudgetTier = z.infer<typeof BudgetTier>;

export const EditMode = z.enum(["diff", "full_file"]);
export type EditMode = z.infer<typeof EditMode>;

export const Provider = z.enum(["groq", "claude", "openai"]);
export type Provider = z.infer<typeof Provider>;

export const TaskType = z.enum([
  "generate_page",
  "generate_schema",
  "fix_error",
  "refactor",
  "write_test",
  "docs",
]);
export type TaskType = z.infer<typeof TaskType>;

export const TaskStatus = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "needs_approval",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const FileMode = z.enum(["full", "summary", "signature"]);
export type FileMode = z.infer<typeof FileMode>;

export const FinishReason = z.enum(["stop", "length", "tool", "error"]);
export type FinishReason = z.infer<typeof FinishReason>;

/** Branded identifier helpers keep ids from being swapped at call sites. */
export const TaskId = z.string().min(1).brand<"TaskId">();
export type TaskId = z.infer<typeof TaskId>;

export const ProjectId = z.string().min(1).brand<"ProjectId">();
export type ProjectId = z.infer<typeof ProjectId>;

export const RunId = z.string().min(1).brand<"RunId">();
export type RunId = z.infer<typeof RunId>;
