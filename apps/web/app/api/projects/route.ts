import { NextResponse } from "next/server";
import { runRegistry } from "../../../lib/runs";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  return NextResponse.json({ projects: runRegistry.list() }, { status: 200 });
}
