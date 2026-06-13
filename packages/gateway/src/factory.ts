import type { LLMGatewayPort } from "@zazaphi/core";
import { resolveGatewayConfig } from "./config.js";
import { GroqGateway } from "./groq-gateway.js";
import { StubGroqGateway } from "./stub-gateway.js";

export interface CreateGatewayOptions {
  env?: Record<string, string | undefined>;
  onFallback?: (reason: string) => void;
}

/**
 * Selects the real Groq gateway when GROQ_API_KEY is configured, otherwise the
 * offline stub. Composition roots use this single entry point and never read
 * the key themselves.
 */
export function createGateway(options: CreateGatewayOptions = {}): LLMGatewayPort {
  const config = resolveGatewayConfig(options.env);
  if (!config) {
    options.onFallback?.("GROQ_API_KEY not set; using offline stub gateway");
    return new StubGroqGateway();
  }
  return new GroqGateway(config);
}
