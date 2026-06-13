import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

const DEFAULT_PREFIX = [
  "You are the code-generation engine inside ZaZaPHI, an automated application builder.",
  "You are given exactly one task and a minimal context packet.",
  "Obey every constraint on the task. Never modify files outside its declared scope.",
  "Respond with a single JSON object only. No prose, no explanations, no markdown fences.",
].join("\n");

/**
 * Stable, cacheable system prefixes keyed by id. The text for an id must never
 * change between calls: byte-identical prefixes are what let the provider serve
 * a prompt-cache hit. Introduce a new id (v2) rather than editing v1.
 */
const SYSTEM_PREFIXES: Record<string, string> = {
  "zazaphi.system.v1": DEFAULT_PREFIX,
};

export function systemPrefixFor(id: string): string {
  return SYSTEM_PREFIXES[id] ?? DEFAULT_PREFIX;
}

export function serializeContext(packet: ContextPacket): string {
  return JSON.stringify(packet);
}

/**
 * Builds the dynamic user message. When a JSON Schema is supplied it is embedded
 * verbatim so the model targets exact field names instead of guessing — the
 * single biggest lever on first-pass structured-output success. The schema is
 * per-task, so it lives here in the dynamic suffix, never in the cached prefix.
 */
export function buildUserContent(req: LLMRequest, schemaText?: string): string {
  const parts: string[] = [
    "TASK CONTEXT (JSON):",
    serializeContext(req.context_packet),
    "",
  ];
  if (schemaText) {
    parts.push(
      "Return a single JSON object that conforms exactly to this JSON Schema:",
      schemaText,
      "",
      "Include every required property using the exact property names.",
      "Do not add properties that are not declared in the schema.",
    );
  } else {
    parts.push("Produce a single JSON object that satisfies the required schema for this task.");
  }
  parts.push("Return JSON only. No prose, no markdown.");
  return parts.join("\n");
}

export function buildRepairContent(error: string): string {
  return [
    "Your previous response did not satisfy the required JSON schema.",
    "Validation error:",
    error,
    "Return a corrected JSON object only. No prose, no markdown.",
  ].join("\n");
}

/** Cheap, provider-independent token estimate for input-budget enforcement. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
