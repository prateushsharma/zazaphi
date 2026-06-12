import { NextResponse } from "next/server";
import { orchestrator } from "../../../lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const result = await orchestrator.run(prompt);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
