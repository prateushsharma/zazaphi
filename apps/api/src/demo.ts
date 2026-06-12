import { RunId } from "@zazaphi/contracts";
import { wire } from "./wiring.js";

const A = {
  reset: "\x1b[0m",
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

const BANNER = `
   ███████╗ █████╗ ███████╗ █████╗ ██████╗ ██╗  ██╗██╗
   ╚══███╔╝██╔══██╗╚══███╔╝██╔══██╗██╔══██╗██║  ██║██║
     ███╔╝ ███████║  ███╔╝ ███████║██████╔╝███████║██║
    ███╔╝  ██╔══██║ ███╔╝  ██╔══██║██╔═══╝ ██╔══██║██║
   ███████╗██║  ██║███████╗██║  ██║██║     ██║  ██║██║
   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝`;

function rule(label = ""): void {
  const line = "─".repeat(Math.max(0, 60 - label.length));
  process.stdout.write(`${A.dim("──")} ${A.bold(label)} ${A.dim(line)}\n`);
}

async function main(): Promise<void> {
  process.stdout.write(A.magenta(BANNER) + "\n");
  process.stdout.write(A.dim("   the orchestrator is the product\n\n"));

  const prompt = "Build a CRM for freelancers with clients, invoices and a dashboard.";
  rule("PROMPT");
  process.stdout.write(`  ${prompt}\n\n`);

  const { orchestrator } = wire({ failFirstAttempt: true });

  rule("PIPELINE");
  const result = await orchestrator.run(prompt);

  process.stdout.write("\n");
  rule("RESULT");
  process.stdout.write(`  ${A.bold("App")}        ${result.spec.name} ${A.dim("· " + result.spec.stack)}\n`);
  process.stdout.write(`  ${A.bold("Mode")}       ${result.manifest.mode} ${A.dim("(" + result.manifest.services.map((s) => s.name).join(", ") + ")")}\n`);
  process.stdout.write(`  ${A.bold("Preview")}    ${A.cyan(result.preview.url)}\n\n`);

  process.stdout.write(`  ${A.bold("Tasks")}\n`);
  for (const t of result.tasks) {
    const mark = t.status === "succeeded" ? A.green("✓") : "✗";
    const retries = t.attempts > 0 ? A.dim(` (${t.attempts} repair)`) : "";
    process.stdout.write(`    ${mark} ${t.task.task_id}  ${t.task.title}${retries}\n`);
  }

  const c = result.cost;
  process.stdout.write(`\n  ${A.bold("Cost")}       ${c.calls} calls · ${c.input_tokens} in · ${c.output_tokens} out · ${A.green(String(c.cached_tokens))} cached\n\n`);

  rule("APPROVAL GATE");
  process.stdout.write(`  ${A.dim("production is gated — approving...")}\n`);
  const approved = await orchestrator.approve(RunId.parse(result.run_id), true);
  process.stdout.write(`  ${A.bold("Live")}       ${A.green(approved.production?.url ?? "—")}\n\n`);
}

main().catch((err) => {
  process.stderr.write(String(err instanceof Error ? err.stack : err) + "\n");
  process.exit(1);
});
