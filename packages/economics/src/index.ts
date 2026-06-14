import type { TaskSpec, TaskBudget, TokenUsage } from "@zazaphi/contracts";
import type { CostLedger, EconomicsPort } from "@zazaphi/core";
/**
 * Default per-tier budgets. Diff editing is the default because regenerating
 * whole files is the single biggest token waste. Strong models are reserved
 * for spec, schema and error repair; everything routine routes to medium.
 */
const TABLE: Record<TaskBudget["tier"], TaskBudget> = {
  low: { tier: "low", model_tier: "small", max_input_tokens: 2000, max_output_tokens: 800, retry_limit: 1, edit_mode: "diff" },
  medium: { tier: "medium", model_tier: "medium", max_input_tokens: 6000, max_output_tokens: 2500, retry_limit: 2, edit_mode: "diff" },
  high: { tier: "high", model_tier: "strong", max_input_tokens: 12000, max_output_tokens: 4000, retry_limit: 3, edit_mode: "diff" },
  very_high: { tier: "very_high", model_tier: "strong", max_input_tokens: 24000, max_output_tokens: 8000, retry_limit: 2, edit_mode: "full_file" },
};
const TYPE_TIER: Record<TaskSpec["type"], TaskBudget["tier"]> = {
  generate_schema: "high",
  fix_error: "high",
  generate_page: "medium",
  refactor: "medium",
  write_test: "medium",
  docs: "low",
};

/**
 * Floors for code-producing tasks. One-shot whole-app generation emits every
 * file in a single response, so the output budget must be large enough to hold
 * the entire app or the JSON is truncated mid-string. The weakest model is also
 * not appropriate for writing application code. These floors apply to every
 * task except docs, regardless of the tier the planner assigned, so a planner
 * that under-budgets the build task cannot cause a truncated or low-quality
 * generation.
 */
const MIN_CODE_OUTPUT_TOKENS = 8000;
const MIN_CODE_INPUT_TOKENS = 6000;

function floorForCode(budget: TaskBudget): TaskBudget {
  const model_tier = budget.model_tier === "small" ? "medium" : budget.model_tier;
  return {
    ...budget,
    model_tier,
    max_input_tokens: Math.max(budget.max_input_tokens, MIN_CODE_INPUT_TOKENS),
    max_output_tokens: Math.max(budget.max_output_tokens, MIN_CODE_OUTPUT_TOKENS),
  };
}

export class DefaultEconomics implements EconomicsPort {
  private readonly accrued: CostLedger = {
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    calls: 0,
  };
  budgetFor(task: TaskSpec): TaskBudget {
    const tier = task.budget_ref ?? TYPE_TIER[task.type];
    const budget = TABLE[tier];
    return task.type === "docs" ? budget : floorForCode(budget);
  }
  record(usage: TokenUsage, _model: string): void {
    this.accrued.input_tokens += usage.input_tokens;
    this.accrued.output_tokens += usage.output_tokens;
    this.accrued.cached_tokens += usage.cached_tokens;
    this.accrued.calls += 1;
  }
  ledger(): CostLedger {
    return { ...this.accrued };
  }
}
