import { z } from "zod";
import { TaskId, ModelTier, Provider, FinishReason } from "./common.js";
import { ContextPacket } from "./context-packet.js";

export const TokenUsage = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cached_tokens: z.number().int().nonnegative().default(0),
});
export type TokenUsage = z.infer<typeof TokenUsage>;

export const LLMRequest = z.object({
  task_id: TaskId,
  model_tier: ModelTier,
  /** Stable, cacheable system prefix identifier. */
  system_prefix_id: z.string().min(1),
  context_packet: ContextPacket,
  max_input_tokens: z.number().int().positive(),
  max_output_tokens: z.number().int().positive(),
  /** When present, the provider must return validated structured output. */
  response_schema: z.unknown().optional(),
  stream: z.boolean().default(false),
});
export type LLMRequest = z.infer<typeof LLMRequest>;

export const LLMResponse = z.object({
  task_id: TaskId,
  output: z.union([z.string(), z.record(z.unknown())]),
  usage: TokenUsage,
  finish_reason: FinishReason,
  provider: Provider,
  model: z.string(),
});
export type LLMResponse = z.infer<typeof LLMResponse>;

export interface Token {
  text: string;
  index: number;
}
