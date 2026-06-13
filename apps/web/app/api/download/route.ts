import JSZip from "jszip";
import { store } from "../../../lib/engine";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const fileMap = store.load().fileMap;
  const entries = Object.entries(fileMap);
  if (entries.length === 0) {
    return new Response("No project files yet — run a build first.", { status: 404 });
  }
  const zip = new JSZip();
  for (const [path, content] of entries) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="zazaphi-project.zip"',
    },
  });
}
