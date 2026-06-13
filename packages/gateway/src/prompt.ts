import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

const DEFAULT_PREFIX = [
  "You are the code-generation engine inside ZaZaPHI, an automated application builder.",
  "You are given exactly one task and a minimal context packet.",
  "Obey every constraint on the task. Never modify files outside its declared scope.",
  "Respond with a single JSON object only. No prose, no explanations, no markdown fences.",
].join("\n");

const SYSTEM_PREFIXES: Record<string, string> = {
  "zazaphi.system.v1": DEFAULT_PREFIX,
};

export function systemPrefixFor(id: string): string {
  return SYSTEM_PREFIXES[id] ?? DEFAULT_PREFIX;
}

export function serializeContext(packet: ContextPacket): string {
  return JSON.stringify(packet);
}

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
  parts.push(
    "When a property value contains source code, encode it as one JSON string:",
    "escape every double quote as \\\" and every newline as \\n. Keep each property inside its object.",
    "Return JSON only. No prose, no markdown.",
  );
  return parts.join("\n");
}

export function buildRepairContent(error: string): string {
  return [
    "Your previous response was not valid against the required JSON.",
    "Error:",
    error,
    "",
    "Return one corrected JSON object only. It must be syntactically valid JSON:",
    "every string value fully escaped (\\\" for quotes, \\n for newlines), every property",
    "inside its object, no trailing or dangling tokens. No prose, no markdown.",
  ].join("\n");
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
