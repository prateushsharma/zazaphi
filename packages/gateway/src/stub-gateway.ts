import type { z } from "zod";
import type { LLMRequest, LLMResponse, Token, TokenUsage } from "@zazaphi/contracts";
import type { GatewayResult, LLMGatewayPort } from "@zazaphi/core";

const STABLE_PREFIX = "zazaphi.system.v1";

/** Plausible fixtures so the spine runs end to end without a provider. */
const FIXTURES: Record<string, unknown> = {
  "Derive product spec": {
    name: "Freelance CRM",
    summary: "CRM for freelancers: clients, invoices, payments and analytics.",
    stack: "Next.js + Tailwind + Postgres",
    features: ["client management", "invoice export", "payment tracking", "dashboard"],
  },
  "Design architecture": {
    summary: "Single-service Next.js app with server actions over Postgres.",
    routes: ["/clients", "/invoices", "/invoices/[id]", "/analytics"],
    components: ["ClientTable", "InvoiceForm", "InvoicePdf", "MetricCard"],
    manifest: {
      mode: "single",
      services: [
        { name: "web", type: "web", framework: "nextjs", port: 3000, start_command: "npm run dev" },
        { name: "postgres", type: "database", image: "postgres:16" },
      ],
    },
  },
  "Design database schema": {
    summary: "clients, invoices, line_items, payments with foreign keys to clients.",
    tables: ["clients", "invoices", "line_items", "payments"],
  },
  "Plan build tasks": {
    tasks: [
      { task_id: "t_001", type: "generate_schema", title: "Create database schema", budget_ref: "high", target_files: ["prisma/schema.prisma"] },
      { task_id: "t_002", type: "generate_page", title: "Build client list page", depends_on: ["t_001"], budget_ref: "medium", target_files: ["src/app/clients/page.tsx"] },
      { task_id: "t_003", type: "generate_page", title: "Build invoice PDF export", depends_on: ["t_001"], budget_ref: "medium", target_files: ["src/app/invoices/[id]/page.tsx"] },
    ],
  },
};

const FILES_FIXTURE = {
  files: [
    { path: "src/app/generated/route.ts", content: "export const dynamic = 'force-dynamic';\n", mode: "full" },
  ],
  rationale: "stub generation",
};

function usageFor(req: LLMRequest): TokenUsage {
  const cached = req.system_prefix_id === STABLE_PREFIX ? 1200 : 0;
  return { input_tokens: 1800, output_tokens: 900, cached_tokens: cached };
}

/**
 * Offline gateway returning deterministic fixtures. Selected whenever
 * GROQ_API_KEY is absent so the demo and dashboard run without a provider.
 */
export class StubGroqGateway implements LLMGatewayPort {
  async generateStructured<S extends z.ZodTypeAny>(
    req: LLMRequest,
    schema: S,
  ): Promise<GatewayResult<z.infer<S>>> {
    const title = req.context_packet.current_task.title;
    const fixture = FIXTURES[title] ?? FILES_FIXTURE;
    const value = schema.parse(fixture) as z.infer<S>;

    const response: LLMResponse = {
      task_id: req.task_id,
      output: value as Record<string, unknown>,
      usage: usageFor(req),
      finish_reason: "stop",
      provider: "groq",
      model: "stub-groq-llama-3.1",
    };
    return { value, response };
  }

  async *stream(req: LLMRequest): AsyncIterable<Token> {
    const title = req.context_packet.current_task.title;
    const fixture = FIXTURES[title] ?? FILES_FIXTURE;
    const chunks = JSON.stringify(fixture).match(/[\s\S]{1,24}/g) ?? [];
    let index = 0;
    for (const chunk of chunks) {
      yield { text: chunk, index };
      index += 1;
    }
  }
}
