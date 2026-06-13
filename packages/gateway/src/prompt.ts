import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

/**
 * Stable, cacheable system prefixes keyed by id. The text for an id must never
 * change between calls: byte-identical prefixes are what let the provider serve
 * a prompt-cache hit. Introduce a new id (v2) rather than editing v1.
 */
const SYSTEM_PREFIXES: Record<string, string> = {
  "zazaphi.system.v1": [
    "You are the code-generation engine inside ZaZaPHI, an automated application builder.",
    "You are given exactly one task and a minimal context packet.",
    "Obey every constraint on the task. Never modify files outside its declared scope.",
    "Respond with a single JSON object only. No prose, no explanations, no markdown fences.",
  ].join("\n"),
};

const DEFAULT_PREFIX_ID = "zazaphi.system.v1";

export function systemPrefixFor(id: string): string {
  return SYSTEM_PREFIXES[id] ?? SYSTEM_PREFIXES[DEFAULT_PREFIX_ID];
}

export function serializeContext(packet: ContextPacket): string {
  return JSON.stringify(packet);
}

export function buildUserContent(req: LLMRequest): string {
  return [
    "TASK CONTEXT (JSON):",
    serializeContext(req.context_packet),
    "",
    "Produce a single JSON object that satisfies the required schema for this task.",
    "Return JSON only.",
  ].join("\n");
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
