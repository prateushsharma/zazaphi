import { NextResponse } from "next/server";
import { runRegistry } from "../../../lib/runs";
export const runtime = "nodejs";
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  const record = runRegistry.get(jobId);
  if (!record) return NextResponse.json({ error: "unknown job_id" }, { status: 404 });
  return NextResponse.json(
    { job_id: record.job_id, status: record.status, stage: record.stage, logs: record.logs, result: record.result ?? null, error: record.error ?? null },
    { status: 200 },
  );
}
