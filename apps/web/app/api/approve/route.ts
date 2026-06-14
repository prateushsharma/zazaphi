import { NextResponse } from "next/server";
import { RunId } from "@zazaphi/contracts";
import { orchestrator } from "../../../lib/engine";
import { runRegistry } from "../../../lib/runs";
export const runtime = "nodejs";
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { run_id?: string; approved?: boolean };
    if (!body.run_id) return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    const runId = RunId.parse(body.run_id);
    const approved = body.approved !== false;
    if (approved) runRegistry.markDeploying(body.run_id);
    const result = await orchestrator.approve(runId, approved);
    if (approved) runRegistry.markLive(body.run_id, result);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
