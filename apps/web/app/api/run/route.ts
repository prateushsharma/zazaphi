import { NextResponse } from "next/server";
import { orchestrator } from "../../../lib/engine";
import { runRegistry } from "../../../lib/runs";
export const runtime = "nodejs";
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    const job_id = runRegistry.start(prompt);
    void orchestrator
      .run(prompt)
      .then((result) => runRegistry.succeed(job_id, result))
      .catch((err: unknown) => runRegistry.fail(job_id, String(err instanceof Error ? err.message : err)));
    return NextResponse.json({ job_id }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
