import type {
  TaskSpec,
  TaskBudget,
  ContextPacket,
  LLMRequest,
} from "@zazaphi/contracts";

/** The stable system-prefix identifier. Keeping it constant maximises cache hits. */
export const STATIC_PREFIX_ID = "zazaphi.system.v1";

export function buildRequest(
  task: TaskSpec,
  budget: TaskBudget,
  context: ContextPacket,
): LLMRequest {
  return {
    task_id: task.task_id,
    model_tier: budget.model_tier,
    system_prefix_id: STATIC_PREFIX_ID,
    context_packet: context,
    max_input_tokens: budget.max_input_tokens,
    max_output_tokens: budget.max_output_tokens,
    stream: false,
  };
}
