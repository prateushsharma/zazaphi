import Groq from "groq-sdk";
import type { z } from "zod";
import type {
  FinishReason,
  LLMRequest,
  LLMResponse,
  Token,
  TokenUsage,
} from "@zazaphi/contracts";
import type { GatewayResult, LLMGatewayPort } from "@zazaphi/core";
import type { GatewayConfig } from "./config.js";
import { GatewayError } from "./errors.js";
import {
  buildRepairContent,
  buildUserContent,
  estimateTokens,
  systemPrefixFor,
} from "./prompt.js";

const PROVIDER = "groq" as const;
const ZERO_USAGE: TokenUsage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0 };

type ChatMessages = Groq.Chat.Completions.ChatCompletionMessageParam[];

interface RawCompletion {
  content: string;
  usage: TokenUsage;
  finish_reason: FinishReason;
}

type ParseResult<S extends z.ZodTypeAny> =
  | { ok: true; value: z.infer<S> }
  | { ok: false; error: string };

function mapFinishReason(reason: string | null | undefined): FinishReason {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
    case "function_call":
      return "tool";
    default:
      return "stop";
  }
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cached_tokens: a.cached_tokens + b.cached_tokens,
  };
}

function tryParse<S extends z.ZodTypeAny>(schema: S, content: string): ParseResult<S> {
  let json: unknown;
  try {
    json = JSON.parse(extractJsonText(content));
  } catch (err) {
    return { ok: false, error: `invalid JSON: ${errorText(err)}` };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, value: result.data };
}

/**
 * Provider-agnostic gateway backed by Groq's OpenAI-compatible chat completions
 * endpoint. Assembles a stable system prefix first (cacheable), then the
 * serialized context packet. Structured calls validate against the caller's Zod
 * schema and perform exactly one bounded repair round-trip before failing.
 */
export class GroqGateway implements LLMGatewayPort {
  private readonly client: Groq;

  constructor(private readonly config: GatewayConfig) {
    this.client = new Groq({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.requestTimeoutMs,
      maxRetries: config.maxRetries,
    });
  }

  async generateStructured<S extends z.ZodTypeAny>(
    req: LLMRequest,
    schema: S,
  ): Promise<GatewayResult<z.infer<S>>> {
    const model = this.config.models[req.model_tier];
    const messages = this.assembleMessages(req, model);

    const first = await this.complete(model, messages, req.max_output_tokens);
    const firstParsed = tryParse(schema, first.content);
    if (firstParsed.ok) {
      return this.success(req, model, firstParsed.value, first.usage);
    }

    const repairMessages: ChatMessages = [
      ...messages,
      { role: "assistant", content: first.content },
      { role: "user", content: buildRepairContent(firstParsed.error) },
    ];
    const second = await this.complete(model, repairMessages, req.max_output_tokens);
    const usage = addUsage(first.usage, second.usage);
    const secondParsed = tryParse(schema, second.content);
    if (secondParsed.ok) {
      return this.success(req, model, secondParsed.value, usage);
    }

    throw new GatewayError(
      "model output failed schema validation after one repair attempt",
      this.errorResponse(req, model, second.content, usage),
    );
  }

  async *stream(req: LLMRequest): AsyncIterable<Token> {
    const model = this.config.models[req.model_tier];
    const messages = this.assembleMessages(req, model);

    const completion = await this.client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: req.max_output_tokens,
      temperature: this.config.temperature,
      stream: true,
    });

    let index = 0;
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text.length > 0) {
        yield { text, index };
        index += 1;
      }
    }
  }

  private assembleMessages(req: LLMRequest, model: string): ChatMessages {
    const system = systemPrefixFor(req.system_prefix_id);
    const userContent = buildUserContent(req);
    const estimatedInput = estimateTokens(system) + estimateTokens(userContent);
    if (estimatedInput > req.max_input_tokens) {
      throw new GatewayError(
        `estimated input tokens ${estimatedInput} exceed max_input_tokens ${req.max_input_tokens}`,
        this.errorResponse(req, model, "", ZERO_USAGE),
      );
    }
    return [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ];
  }

  private async complete(
    model: string,
    messages: ChatMessages,
    maxOutput: number,
  ): Promise<RawCompletion> {
    const res = await this.client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: maxOutput,
      temperature: this.config.temperature,
      response_format: { type: "json_object" },
      stream: false,
    });
    const choice = res.choices[0];
    return {
      content: choice?.message?.content ?? "",
      usage: {
        input_tokens: res.usage?.prompt_tokens ?? 0,
        output_tokens: res.usage?.completion_tokens ?? 0,
        cached_tokens: res.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      },
      finish_reason: mapFinishReason(choice?.finish_reason),
    };
  }

  private success<S extends z.ZodTypeAny>(
    req: LLMRequest,
    model: string,
    value: z.infer<S>,
    usage: TokenUsage,
  ): GatewayResult<z.infer<S>> {
    const response: LLMResponse = {
      task_id: req.task_id,
      output: value as Record<string, unknown>,
      usage,
      finish_reason: "stop",
      provider: PROVIDER,
      model,
    };
    return { value, response };
  }

  private errorResponse(
    req: LLMRequest,
    model: string,
    output: string,
    usage: TokenUsage,
  ): LLMResponse {
    return {
      task_id: req.task_id,
      output,
      usage,
      finish_reason: "error",
      provider: PROVIDER,
      model,
    };
  }
}
