import type { ModelTier } from "@zazaphi/contracts";

export interface GatewayConfig {
  apiKey: string;
  baseURL?: string;
  models: Record<ModelTier, string>;
  temperature: number;
  requestTimeoutMs: number;
  maxRetries: number;
}

const DEFAULT_MODELS: Record<ModelTier, string> = {
  small: "llama-3.1-8b-instant",
  medium: "llama-3.3-70b-versatile",
  strong: "openai/gpt-oss-120b",
};

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Resolves gateway configuration from the environment. Returns null when no
 * GROQ_API_KEY is present, letting the composition root fall back to the
 * offline stub. This is the only place the API key is read.
 */
export function resolveGatewayConfig(
  env: Record<string, string | undefined> = process.env,
): GatewayConfig | null {
  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  const config: GatewayConfig = {
    apiKey,
    models: {
      small: env.GROQ_MODEL_SMALL?.trim() || DEFAULT_MODELS.small,
      medium: env.GROQ_MODEL_MEDIUM?.trim() || DEFAULT_MODELS.medium,
      strong: env.GROQ_MODEL_STRONG?.trim() || DEFAULT_MODELS.strong,
    },
    temperature: num(env.GROQ_TEMPERATURE, 0.2),
    requestTimeoutMs: num(env.GROQ_TIMEOUT_MS, 60_000),
    maxRetries: num(env.GROQ_MAX_RETRIES, 2),
  };

  const baseURL = env.GROQ_BASE_URL?.trim();
  if (baseURL) config.baseURL = baseURL;

  return config;
}
