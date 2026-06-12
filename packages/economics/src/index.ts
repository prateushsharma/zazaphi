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

export class DefaultEconomics implements EconomicsPort {
  private readonly accrued: CostLedger = {
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    calls: 0,
  };

  budgetFor(task: TaskSpec): TaskBudget {
    const tier = task.budget_ref ?? TYPE_TIER[task.type];
    return TABLE[tier];
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
