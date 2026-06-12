import { z } from "zod";
import { BudgetTier, ModelTier, EditMode } from "./common.js";

export const TaskBudget = z.object({
  tier: BudgetTier,
  model_tier: ModelTier,
  max_input_tokens: z.number().int().positive(),
  max_output_tokens: z.number().int().positive(),
  retry_limit: z.number().int().nonnegative(),
  edit_mode: EditMode,
});
export type TaskBudget = z.infer<typeof TaskBudget>;
