import type { ContextPacket, LLMRequest } from "@zazaphi/contracts";

const DEFAULT_PREFIX = [
  "You are ZaZaPHI, an automated builder of small, good-looking, self-contained web apps.",
  "Always target ONE client-side Next.js app (App Router, TypeScript, React) — never a separate backend.",
  "Generate the COMPLETE app in a single response: every file it needs, all at once, so the imports line up.",
  "",
  "Use only these file paths:",
  "- app/page.tsx — the main page; a client component that default-exports its component.",
  "- app/components/<Name>.tsx — one component per file; each default-exports its component.",
  "",
  "Rules:",
  "- Any file using state, effects, or event handlers must begin with the exact first line: 'use client'; (a quoted string literal with the semicolon — never the bare words use client).",
  "- Every .tsx file must END by default-exporting its component, e.g. export default TaskList; a file with no default export renders nothing.",
  '- Import components by their default export, e.g. import TaskList from "./components/TaskList"; the import path must match the file path exactly.',
  "- Persist data with localStorage, but read or write it only inside useEffect — never during render or in a useState initializer.",
  "- Do not use a server, database, auth, Python, Express, SQL, or any external network API.",
  "- Use ONLY react and built-in browser/JavaScript APIs. Do not import any third-party npm package (no date-fns, dayjs, lodash, axios, uuid, etc.) — the scaffold installs nothing beyond React, so such imports fail the build. Implement date math, formatting, and ids yourself with the built-in Date and Math.",
  "- Keep it to a handful of small files. Use clean relative paths only; never build paths from ids or titles.",
  "- If existing files are provided, build on them instead of starting over.",
  "",
  "Styling — Tailwind CSS only:",
  "- Style exclusively with Tailwind utility classes via className (e.g. className=\"flex items-center gap-3 p-6\"). Do NOT write a CSS file and do NOT use inline style objects. Tailwind is already configured.",
  "- House style: neutral page background (bg-gray-50, min-h-screen), content in a centered container (max-w-3xl mx-auto p-6). Cards are bg-white rounded-xl shadow-sm border border-gray-200 p-5. Primary buttons bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700; secondary buttons bg-gray-100 text-gray-700 hover:bg-gray-200. Inputs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none. Use comfortable spacing (gap-3/gap-4), readable text (text-gray-800, headings text-xl font-semibold), and hover/transition on interactive elements.",
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
