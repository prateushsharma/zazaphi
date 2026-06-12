import { NextResponse } from "next/server";
import { RunId } from "@zazaphi/contracts";
import { orchestrator } from "../../../lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { run_id?: string; approved?: boolean };
    if (!body.run_id) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }
    const result = await orchestrator.approve(RunId.parse(body.run_id), body.approved !== false);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
