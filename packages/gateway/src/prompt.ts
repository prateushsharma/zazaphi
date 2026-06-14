import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

const DEFAULT_PREFIX = [
  "You are ZaZaPHI, an automated builder of small, self-contained web apps.",
  "Always target ONE client-side Next.js app (App Router, TypeScript, React) — never a separate backend.",
  "Rules for every step:",
  "- Put the complete working UI and logic in app/page.tsx as a client component.",
  "- The FIRST line of app/page.tsx must be exactly: 'use client'; — a quoted string literal with the semicolon, never the bare words use client.",
  "- app/page.tsx must END by default-exporting its main component, e.g. export default TodoList; — without this the page renders nothing.",
  "- Persist data in the browser with localStorage. Read or write localStorage and other browser APIs only inside useEffect, never during render or in a useState initializer, so the server build does not fail.",
  "- Do not use a server, database, Python, Express, or SQL.",
  "- Write files only under app/ using clean relative paths (app/page.tsx, app/layout.tsx). Never build paths from ids or titles.",
  "- Build on the files you are given; refine them instead of starting over.",
  "Respond with a single JSON object only, matching the requested schema. No prose, no markdown, no code fences.",
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
