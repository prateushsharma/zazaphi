import { createServer } from "node:http";
import { RunId } from "@zazaphi/contracts";
import { SilentLogger } from "@zazaphi/core";
import { wire } from "./wiring.js";

const PORT = Number(process.env.PORT ?? 4000);
const { orchestrator } = wire({ logger: new SilentLogger() });

function send(res: import("node:http").ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, { "content-type": "application/json" });
  res.end(payload);
}

async function readJson(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

const server = createServer((req, res) => {
  void (async () => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return send(res, 200, { status: "ok" });
      }
      if (req.method === "POST" && req.url === "/runs") {
        const body = await readJson(req);
        const prompt = typeof body.prompt === "string" ? body.prompt : "";
        if (!prompt) return send(res, 400, { error: "prompt is required" });
        const result = await orchestrator.run(prompt);
        return send(res, 201, result);
      }
      const approveMatch = req.url?.match(/^\/runs\/(.+)\/approve$/);
      if (req.method === "POST" && approveMatch) {
        const body = await readJson(req);
        const approved = body.approved !== false;
        const result = await orchestrator.approve(RunId.parse(approveMatch[1]), approved);
        return send(res, 200, result);
      }
      return send(res, 404, { error: "not found" });
    } catch (err) {
      return send(res, 500, { error: String(err instanceof Error ? err.message : err) });
    }
  })();
});

server.listen(PORT, () => {
  process.stdout.write(`zazaphi api listening on :${PORT}\n`);
});
