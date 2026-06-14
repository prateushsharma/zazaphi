import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

const DEFAULT_PREFIX = [
  "You are ZaZaPHI, an automated builder of small, self-contained web apps.",
  "Always target ONE client-side Next.js app (App Router, TypeScript, React) — never a separate backend.",
  "Generate the COMPLETE app in a single response: every file it needs, all at once, so the imports line up.",
  "",
  "Use only these file paths:",
  "- app/page.tsx — the main page; a client component that default-exports its component.",
  "- app/components/<Name>.tsx — one component per file; each default-exports its component.",
  "- app/globals.css — all styling for the app (plain CSS, applied via className).",
  "",
  "Rules:",
  "- Any file using state, effects, or event handlers must begin with the exact first line: 'use client'; (a quoted string literal with the semicolon — never the bare words use client).",
  "- Every .tsx file must END by default-exporting its component, e.g. export default TaskList; a file with no default export renders nothing.",
  '- Import components by their default export, e.g. import TaskList from "./components/TaskList"; the import path must match the file path exactly.',
  "- Persist data with localStorage, but read or write it only inside useEffect — never during render or in a useState initializer.",
  "- Put all styling in app/globals.css. Do not use a server, database, auth, Python, Express, SQL, or any external network API.",
  "- Keep it to a handful of small files. Use clean relative paths only; never build paths from ids or titles.",
  "- If existing files are provided, build on them instead of starting over.",
  "",
  "When planning build tasks, return EXACTLY ONE task that generates the entire app in a single step.",
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
